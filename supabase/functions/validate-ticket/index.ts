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
  ticket_types: { name: string; description: string | null } | null;
  ticket_events: { name: string; slug: string; starts_at: string; venue_name: string | null } | null;
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
    const ticketCode = url.searchParams.get("code");

    if (!ticketCode) {
      return new Response(
        JSON.stringify({ error: "Ticket code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find ticket with full info
    const { data, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select(`
        *,
        ticket_types (name, description),
        ticket_events (name, slug, starts_at, venue_name)
      `)
      .eq("ticket_code", ticketCode.toUpperCase())
      .single();

    if (ticketError || !data) {
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ticket = data as TicketResult;

    // Return full info including status
    return new Response(
      JSON.stringify({
        id: ticket.id,
        ticketCode: ticket.ticket_code,
        status: ticket.status,
        buyerName: ticket.buyer_name,
        buyerEmail: ticket.buyer_email,
        createdAt: ticket.created_at,
        checkedInAt: ticket.checked_in_at,
        ticketType: ticket.ticket_types?.name,
        ticketDescription: ticket.ticket_types?.description,
        eventName: ticket.ticket_events?.name,
        eventSlug: ticket.ticket_events?.slug,
        startsAt: ticket.ticket_events?.starts_at,
        venueName: ticket.ticket_events?.venue_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error validating ticket:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
