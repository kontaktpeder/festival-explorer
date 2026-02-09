import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check admin role
    const { data: staffRole } = await supabaseAdmin
      .from("staff_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!staffRole || staffRole.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, email, ticketTypeCode, note } = await req.json();

    if (!name || !ticketTypeCode) {
      return new Response(JSON.stringify({ error: "name and ticketTypeCode required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validCodes = ["KOMPIS", "LISTE", "CREW"];
    if (!validCodes.includes(ticketTypeCode)) {
      return new Response(JSON.stringify({ error: "Invalid ticket type code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the ticket type
    const { data: ticketType, error: ttError } = await supabaseAdmin
      .from("ticket_types")
      .select("id, event_id, capacity, code")
      .eq("code", ticketTypeCode)
      .single();

    if (ttError || !ticketType) {
      return new Response(JSON.stringify({ error: "Ticket type not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check capacity
    const { count: issuedCount } = await supabaseAdmin
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("ticket_type_id", ticketType.id)
      .neq("status", "CANCELLED");

    if (issuedCount !== null && issuedCount >= ticketType.capacity) {
      return new Response(JSON.stringify({ error: "Capacity reached for this type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate ticket code via RPC
    const { data: ticketCode, error: codeError } = await supabaseAdmin.rpc("generate_ticket_code");
    if (codeError || !ticketCode) {
      return new Response(JSON.stringify({ error: "Failed to generate ticket code" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const internalSessionId = `internal-${crypto.randomUUID()}`;

    const { data: ticket, error: insertError } = await supabaseAdmin
      .from("tickets")
      .insert({
        event_id: ticketType.event_id,
        ticket_type_id: ticketType.id,
        buyer_name: name,
        buyer_email: email || "",
        ticket_code: ticketCode,
        stripe_session_id: internalSessionId,
        stripe_payment_intent_id: null,
        status: "VALID",
      })
      .select("id, ticket_code")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create ticket" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Internal ticket created: ${ticket.ticket_code} (${ticketTypeCode}) by admin ${user.id}${note ? ` note: ${note}` : ""}`);

    return new Response(JSON.stringify({ ticket }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
