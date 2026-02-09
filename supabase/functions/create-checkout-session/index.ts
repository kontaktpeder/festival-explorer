import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_nok: number;
  currency: string;
  capacity: number;
  sales_start: string | null;
  sales_end: string | null;
  stripe_price_id: string | null;
  ticket_events: {
    id: string;
    name: string;
    slug: string;
    starts_at: string;
    venue_name: string | null;
  } | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketTypeId, buyerName, buyerEmail } = await req.json();

    if (!ticketTypeId || !buyerName || !buyerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: ticketTypeId, buyerName, buyerEmail" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for database access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch ticket type
    const { data: ticketType, error: ticketTypeError } = await supabaseAdmin
      .from("ticket_types")
      .select(`
        *,
        ticket_events (
          id,
          name,
          slug,
          starts_at,
          venue_name
        )
      `)
      .eq("id", ticketTypeId)
      .eq("visible", true)
      .single();

    if (ticketTypeError || !ticketType) {
      console.error("Ticket type error:", ticketTypeError);
      return new Response(
        JSON.stringify({ error: "Ticket type not found or not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tt = ticketType as TicketType;

    // Check capacity
    const { count: soldCount } = await supabaseAdmin
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("ticket_type_id", ticketTypeId)
      .neq("status", "CANCELLED");

    if (soldCount !== null && soldCount >= tt.capacity) {
      return new Response(
        JSON.stringify({ error: "Tickets sold out" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check sales window
    const now = new Date();
    if (tt.sales_start && new Date(tt.sales_start) > now) {
      return new Response(
        JSON.stringify({ error: "Sales have not started yet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (tt.sales_end && new Date(tt.sales_end) < now) {
      return new Response(
        JSON.stringify({ error: "Sales have ended" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: buyerEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://giggn.lovable.app";
    
    // Use stripe_price_id if available, otherwise use price_data
    const lineItems = tt.stripe_price_id
      ? [{ price: tt.stripe_price_id, quantity: 1 }]
      : [
          {
            price_data: {
              currency: (tt.currency || "nok").toLowerCase(),
              product_data: {
                name: `${tt.ticket_events?.name} - ${tt.name}`,
                description: tt.description || undefined,
              },
              unit_amount: tt.price_nok,
            },
            quantity: 1,
          },
        ];

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer: customerId,
      customer_email: customerId ? undefined : buyerEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/tickets`,
      metadata: {
        ticket_type_id: ticketTypeId,
        event_id: tt.event_id,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
      },
      customer_creation: customerId ? undefined : "always",
    });

    console.log("Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
