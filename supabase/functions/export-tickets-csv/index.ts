import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketResult {
  ticket_code: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  created_at: string;
  checked_in_at: string | null;
  ticket_types: { name: string; code: string } | null;
  ticket_events: { name: string } | null;
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

    // Check admin role only
    const { data: staffRole, error: roleError } = await supabaseAdmin
      .from("staff_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !staffRole || staffRole.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const eventId = url.searchParams.get("event_id");

    let dbQuery = supabaseAdmin
      .from("tickets")
      .select(`
        *,
        ticket_types (name, code),
        ticket_events (name)
      `)
      .order("created_at", { ascending: false });

    if (eventId) {
      dbQuery = dbQuery.eq("event_id", eventId);
    }

    const { data: tickets, error: ticketsError } = await dbQuery;

    if (ticketsError) {
      console.error("Error fetching tickets:", ticketsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tickets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedTickets = (tickets || []) as TicketResult[];

    // Generate CSV
    const headers = [
      "Ticket Code",
      "Status",
      "Buyer Name",
      "Buyer Email",
      "Type Code",
      "Ticket Type",
      "Event",
      "Created At",
      "Checked In At",
    ];

    const rows = typedTickets.map(t => [
      t.ticket_code,
      t.status,
      t.buyer_name,
      t.buyer_email,
      t.ticket_types?.code || "",
      t.ticket_types?.name || "",
      t.ticket_events?.name || "",
      t.created_at,
      t.checked_in_at || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tickets-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting tickets:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
