import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketResult {
  id: string;
  ticket_code: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  created_at: string;
  checked_in_at: string | null;
  ticket_types: { name: string } | null;
  ticket_events: { name: string; starts_at: string } | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check staff role
    const { data: staffRole, error: roleError } = await supabaseAdmin
      .from("staff_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !staffRole || !["admin", "crew"].includes(staffRole.role)) {
      return new Response(
        JSON.stringify({ error: "Staff access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const eventId = url.searchParams.get("event_id");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    let dbQuery = supabaseAdmin
      .from("tickets")
      .select(`
        *,
        ticket_types (name),
        ticket_events (name, starts_at)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply filters
    if (eventId) {
      dbQuery = dbQuery.eq("event_id", eventId);
    }

    if (status) {
      dbQuery = dbQuery.eq("status", status);
    }

    if (query) {
      // Search by ticket code, name, or email
      dbQuery = dbQuery.or(
        `ticket_code.ilike.%${query}%,buyer_name.ilike.%${query}%,buyer_email.ilike.%${query}%`
      );
    }

    const { data: tickets, error: ticketsError } = await dbQuery;

    if (ticketsError) {
      console.error("Error searching tickets:", ticketsError);
      return new Response(
        JSON.stringify({ error: "Failed to search tickets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedTickets = (tickets || []) as TicketResult[];

    return new Response(
      JSON.stringify({
        tickets: typedTickets.map(t => ({
          id: t.id,
          ticketCode: t.ticket_code,
          status: t.status,
          buyerName: t.buyer_name,
          buyerEmail: t.buyer_email,
          createdAt: t.created_at,
          checkedInAt: t.checked_in_at,
          ticketType: t.ticket_types?.name,
          eventName: t.ticket_events?.name,
        })),
        count: typedTickets.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error searching tickets:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
