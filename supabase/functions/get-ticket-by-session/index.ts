import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Session ID is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not completed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select(`id, ticket_code, buyer_name, buyer_email, created_at, ticket_types (name, description), ticket_events (name, slug, starts_at, venue_name)`)
      .eq("stripe_session_id", sessionId)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Ticket not found yet, please wait a moment" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ticketTypes = Array.isArray(data.ticket_types) ? data.ticket_types[0] : data.ticket_types;
    const ticketEvents = Array.isArray(data.ticket_events) ? data.ticket_events[0] : data.ticket_events;

    return new Response(JSON.stringify({
      ticketCode: data.ticket_code,
      buyerName: data.buyer_name,
      buyerEmail: data.buyer_email,
      createdAt: data.created_at,
      ticketType: ticketTypes?.name,
      ticketDescription: ticketTypes?.description,
      eventName: ticketEvents?.name,
      eventSlug: ticketEvents?.slug,
      startsAt: ticketEvents?.starts_at,
      venueName: ticketEvents?.venue_name,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
