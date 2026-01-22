import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("No stripe signature found");
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  console.log("Received Stripe event:", event.type);

  // Create Supabase admin client
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    console.log("Processing checkout session:", session.id);
    console.log("Session metadata:", session.metadata);

    // Check idempotency - ticket already exists?
    const { data: existingTicket } = await supabaseAdmin
      .from("tickets")
      .select("id")
      .eq("stripe_session_id", session.id)
      .single();

    if (existingTicket) {
      console.log("Ticket already exists for session:", session.id);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ticketTypeId = session.metadata?.ticket_type_id;
    const eventId = session.metadata?.event_id;
    const buyerName = session.metadata?.buyer_name;
    const buyerEmail = session.metadata?.buyer_email || session.customer_email;

    if (!ticketTypeId || !eventId || !buyerName || !buyerEmail) {
      console.error("Missing metadata in session:", session.metadata);
      return new Response("Missing metadata", { status: 400 });
    }

    // Generate ticket code using database function
    const { data: ticketCodeResult, error: codeError } = await supabaseAdmin
      .rpc("generate_ticket_code");

    if (codeError) {
      console.error("Error generating ticket code:", codeError);
      return new Response("Error generating ticket code", { status: 500 });
    }

    const ticketCode = ticketCodeResult;
    console.log("Generated ticket code:", ticketCode);

    // Create ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .insert({
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        ticket_code: ticketCode,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        status: "VALID",
      })
      .select()
      .single();

    if (ticketError) {
      console.error("Error creating ticket:", ticketError);
      return new Response(`Error creating ticket: ${ticketError.message}`, { status: 500 });
    }

    console.log("Ticket created successfully:", ticket.id, ticketCode);

    return new Response(
      JSON.stringify({ received: true, ticketId: ticket.id, ticketCode }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Handle payment failed
  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log("Payment failed:", paymentIntent.id);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
