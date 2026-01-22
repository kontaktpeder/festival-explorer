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

    const { ticketCode, method = "qr", note } = await req.json();

    if (!ticketCode) {
      return new Response(
        JSON.stringify({ error: "Ticket code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find ticket
    const { data, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select(`
        *,
        ticket_types (name),
        ticket_events (name)
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

    // Check current status
    if (ticket.status === "USED") {
      return new Response(
        JSON.stringify({ 
          error: "Ticket already used",
          checkedInAt: ticket.checked_in_at,
          status: ticket.status,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ticket.status === "CANCELLED") {
      return new Response(
        JSON.stringify({ 
          error: "Ticket is cancelled",
          status: ticket.status,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update ticket status
    const { error: updateError } = await supabaseAdmin
      .from("tickets")
      .update({
        status: "USED",
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
      })
      .eq("id", ticket.id);

    if (updateError) {
      console.error("Error updating ticket:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to check in ticket" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create checkin audit log
    const { error: checkinError } = await supabaseAdmin
      .from("checkins")
      .insert({
        ticket_id: ticket.id,
        checked_in_by: user.id,
        method,
        note,
      });

    if (checkinError) {
      console.error("Error creating checkin log:", checkinError);
      // Don't fail the request, just log it
    }

    console.log(`Ticket ${ticketCode} checked in by ${user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        ticketCode: ticket.ticket_code,
        buyerName: ticket.buyer_name,
        ticketType: ticket.ticket_types?.name,
        eventName: ticket.ticket_events?.name,
        checkedInAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking in ticket:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
