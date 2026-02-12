import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

/** Structured, PII-free purchase outcome log */
const logPurchaseOutcome = (params: {
  stripe_event_type: string;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  ticket_id?: string | null;
  event_id?: string | null;
  ticket_type_id?: string | null;
  result: string;
  reason?: string;
}) => {
  console.log(JSON.stringify({
    stripe_event_type: params.stripe_event_type,
    stripe_session_id: params.stripe_session_id ?? null,
    stripe_payment_intent_id: params.stripe_payment_intent_id ?? null,
    ticket_id: params.ticket_id ?? null,
    event_id: params.event_id ?? null,
    ticket_type_id: params.ticket_type_id ?? null,
    result: params.result,
    reason: params.reason ?? null,
    timestamp: new Date().toISOString(),
  }));
};

serve(async (req) => {
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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // ── checkout.session.completed ──────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as { id?: string } | null)?.id ?? null;

    // Idempotency check
    const { data: existingTicket } = await supabaseAdmin
      .from("tickets")
      .select("id")
      .eq("stripe_session_id", session.id)
      .single();

    if (existingTicket) {
      logPurchaseOutcome({
        stripe_event_type: event.type,
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        ticket_id: existingTicket.id,
        result: "duplicate",
        reason: "session_already_processed",
      });
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
      logPurchaseOutcome({
        stripe_event_type: event.type,
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        result: "error",
        reason: "missing_metadata",
      });
      return new Response("Missing metadata", { status: 400 });
    }

    // Atomic capacity-safe reservation via RPC
    const { data: reserveResult, error: reserveError } = await supabaseAdmin.rpc(
      "reserve_ticket_slot_atomic",
      {
        p_ticket_type_id: ticketTypeId,
        p_event_id: eventId,
        p_buyer_name: buyerName,
        p_buyer_email: buyerEmail,
        p_stripe_session_id: session.id,
        p_payment_intent_id: paymentIntentId ?? "",
      }
    );

    if (reserveError) {
      console.error("Error in reserve_ticket_slot_atomic:", reserveError);
      logPurchaseOutcome({
        stripe_event_type: event.type,
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        result: "error",
        reason: "rpc_error",
      });
      return new Response("Error reserving ticket slot", { status: 500 });
    }

    if (!reserveResult || reserveResult.result === "sold_out") {
      logPurchaseOutcome({
        stripe_event_type: event.type,
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        result: "sold_out",
        reason: "capacity_exceeded_at_webhook",
      });
      return new Response(JSON.stringify({ received: true, soldOut: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (reserveResult.result !== "success") {
      logPurchaseOutcome({
        stripe_event_type: event.type,
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        result: "error",
        reason: "rpc_error",
      });
      return new Response("Unexpected ticket reservation result", { status: 500 });
    }

    const ticketId = reserveResult.ticket_id as string;
    const ticketCode = reserveResult.ticket_code as string;

    logPurchaseOutcome({
      stripe_event_type: event.type,
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      ticket_id: ticketId,
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      result: "success",
      reason: "ticket_created",
    });

    return new Response(
      JSON.stringify({ received: true, ticketId, ticketCode }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── charge.refunded ─────────────────────────────────────────────
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent as { id?: string } | null)?.id;

    if (paymentIntentId) {
      // Determine refund status from the latest refund on the charge
      const latestRefund = charge.refunds?.data?.[0];
      const refundStatus = latestRefund?.status ?? "succeeded"; // default to succeeded for backwards compat
      const refundId = latestRefund?.id ?? null;

      const { data: tickets, error: findError } = await supabaseAdmin
        .from("tickets")
        .select("id, ticket_code, status")
        .eq("stripe_payment_intent_id", paymentIntentId);

      if (findError) {
        console.error("Error finding tickets for refund:", findError);
      } else if (tickets && tickets.length > 0) {
        for (const ticket of tickets) {
          if (refundStatus === "pending") {
            // Refund initiated but not yet completed – block scanning immediately
            await supabaseAdmin
              .from("tickets")
              .update({
                status: "REFUND_PENDING",
                refund_status: "pending",
                refund_id: refundId,
                refund_requested_at: new Date().toISOString(),
              })
              .eq("id", ticket.id);
          } else if (refundStatus === "succeeded") {
            // Refund completed – finalize cancellation
            await supabaseAdmin
              .from("tickets")
              .update({
                refunded_at: new Date().toISOString(),
                status: "CANCELLED",
                refund_status: "succeeded",
                refund_id: refundId,
              })
              .eq("id", ticket.id);
          } else if (refundStatus === "failed" || refundStatus === "canceled") {
            // Refund failed/cancelled – restore ticket if it was pending
            if (ticket.status === "REFUND_PENDING") {
              await supabaseAdmin
                .from("tickets")
                .update({
                  status: "VALID",
                  refund_status: refundStatus,
                  refund_id: null,
                  refund_requested_at: null,
                })
                .eq("id", ticket.id);
            }
          }
        }
      }

      logPurchaseOutcome({
        stripe_event_type: event.type,
        stripe_payment_intent_id: paymentIntentId,
        result: "refund",
        reason: !tickets?.length
          ? "no_tickets_found_for_payment_intent"
          : refundStatus === "pending"
            ? "tickets_marked_refund_pending"
            : refundStatus === "succeeded"
              ? "tickets_marked_refunded"
              : `refund_${refundStatus}`,
      });
    } else {
      logPurchaseOutcome({
        stripe_event_type: event.type,
        result: "refund",
        reason: "payment_intent_missing_on_charge",
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── refund.updated ──────────────────────────────────────────────
  if (event.type === "refund.updated") {
    const refund = event.data.object as Stripe.Refund;
    const paymentIntentId = typeof refund.payment_intent === "string"
      ? refund.payment_intent
      : (refund.payment_intent as { id?: string } | null)?.id;

    if (paymentIntentId) {
      const { data: tickets } = await supabaseAdmin
        .from("tickets")
        .select("id, status")
        .eq("stripe_payment_intent_id", paymentIntentId);

      if (tickets && tickets.length > 0) {
        for (const ticket of tickets) {
          if (refund.status === "succeeded") {
            await supabaseAdmin
              .from("tickets")
              .update({
                refunded_at: new Date().toISOString(),
                status: "CANCELLED",
                refund_status: "succeeded",
                refund_id: refund.id,
              })
              .eq("id", ticket.id);
          } else if (refund.status === "failed" || refund.status === "canceled") {
            if (ticket.status === "REFUND_PENDING") {
              await supabaseAdmin
                .from("tickets")
                .update({
                  status: "VALID",
                  refund_status: refund.status,
                  refund_id: null,
                  refund_requested_at: null,
                })
                .eq("id", ticket.id);
            }
          }
        }
      }

      logPurchaseOutcome({
        stripe_event_type: event.type,
        stripe_payment_intent_id: paymentIntentId,
        result: refund.status === "succeeded" ? "refund" : "refund_status_change",
        reason: `refund_${refund.status}`,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── charge.dispute.created ──────────────────────────────────────
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId = dispute.charge as string;
    let paymentIntentId: string | null = null;

    try {
      const charge = await stripe.charges.retrieve(chargeId);
      paymentIntentId = charge.payment_intent as string;

      if (paymentIntentId) {
        const { data: tickets, error: findError } = await supabaseAdmin
          .from("tickets")
          .select("id, ticket_code, status")
          .eq("stripe_payment_intent_id", paymentIntentId);

        if (findError) {
          console.error("Error finding tickets for dispute:", findError);
        } else if (tickets && tickets.length > 0) {
          for (const ticket of tickets) {
            const { error: updateError } = await supabaseAdmin
              .from("tickets")
              .update({ chargeback_at: new Date().toISOString(), status: "CANCELLED" })
              .eq("id", ticket.id);

            if (updateError) {
              console.error(`Error updating ticket ${ticket.ticket_code} for dispute:`, updateError);
            }
          }
        }

        logPurchaseOutcome({
          stripe_event_type: event.type,
          stripe_payment_intent_id: paymentIntentId,
          result: "chargeback",
          reason: (tickets && tickets.length > 0) ? "tickets_marked_chargeback" : "no_tickets_found_for_payment_intent",
        });
      }
    } catch (chargeError) {
      console.error("Error retrieving charge for dispute:", chargeError);
      logPurchaseOutcome({
        stripe_event_type: event.type,
        stripe_payment_intent_id: paymentIntentId,
        result: "chargeback",
        reason: "charge_retrieval_error",
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── payment_intent.payment_failed ───────────────────────────────
  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    logPurchaseOutcome({
      stripe_event_type: event.type,
      stripe_payment_intent_id: paymentIntent.id,
      result: "error",
      reason: "payment_failed",
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
