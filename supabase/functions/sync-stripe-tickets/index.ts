import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const isTestMode = stripeKey.startsWith("sk_test_");
    const mode = isTestMode ? "test" : "live";

    console.log("Syncing Stripe tickets in mode:", mode);

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Initialize Supabase
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all checkout sessions from Stripe (last 100)
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ["data.payment_intent"],
    });

    // Get all tickets from database (exclude internal tickets)
    const { data: dbTickets, error: dbError } = await supabaseAdmin
      .from("tickets")
      .select("stripe_session_id, stripe_payment_intent_id, ticket_code, buyer_email, created_at");

    if (dbError) throw dbError;

    // Separate Stripe tickets from internal tickets for accurate stats
    const allDbTickets = dbTickets || [];
    const stripeDbTickets = allDbTickets.filter(t => !t.stripe_session_id.startsWith("internal-"));
    const internalTickets = allDbTickets.filter(t => t.stripe_session_id.startsWith("internal-"));

    // Create maps for quick lookup
    const dbSessionIds = new Set(allDbTickets.map(t => t.stripe_session_id));

    // Find missing tickets
    interface MissingTicket {
      session_id: string;
      payment_intent_id: string | null;
      customer_email: string;
      amount: number;
      currency: string;
      created: string;
      metadata: Record<string, string>;
      status: string;
    }

    const missingTickets: MissingTicket[] = [];
    const completedSessions = sessions.data.filter(
      (s: Stripe.Checkout.Session) => s.status === "complete" && s.payment_status === "paid"
    );

    for (const session of completedSessions) {
      if (!dbSessionIds.has(session.id)) {
        const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;
        const amount = paymentIntent?.amount || session.amount_total || 0;
        const currency = paymentIntent?.currency || session.currency || "nok";

        missingTickets.push({
          session_id: session.id,
          payment_intent_id: paymentIntent?.id || null,
          customer_email: session.customer_email || session.customer_details?.email || "Ukjent",
          amount: amount / 100,
          currency: currency.toUpperCase(),
          created: new Date(session.created * 1000).toISOString(),
          metadata: session.metadata || {},
          status: session.payment_status,
        });
      }
    }

    // Get ticket types for reference
    const { data: ticketTypes } = await supabaseAdmin
      .from("ticket_types")
      .select("id, name, code, price_nok, event_id");

    // Statistics (compare only Stripe-originated tickets)
    const stats = {
      mode,
      total_stripe_sessions: completedSessions.length,
      total_db_tickets: stripeDbTickets.length,
      internal_tickets: internalTickets.length,
      missing_tickets: missingTickets.length,
      sync_percentage: completedSessions.length > 0 
        ? ((completedSessions.length - missingTickets.length) / completedSessions.length * 100).toFixed(1)
        : "100",
    };

    console.log("Sync stats:", stats);

    return new Response(
      JSON.stringify({
        stats,
        missing_tickets: missingTickets,
        ticket_types: ticketTypes || [],
        note: missingTickets.length > 0 
          ? "Det finnes betalte sessions i Stripe som ikke har billetter i databasen. Dette kan skyldes manglende webhooks."
          : "Alle betalte sessions har tilsvarende billetter i databasen.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error syncing Stripe tickets:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
