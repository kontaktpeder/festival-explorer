import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    
    // Detect mode: test keys start with sk_test_, live keys start with sk_live_
    const isTestMode = stripeKey.startsWith("sk_test_");
    const mode = isTestMode ? "test" : "live";

    // Initialize Stripe to verify the key works
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Get account info to confirm mode
    let accountInfo = null;
    try {
      accountInfo = await stripe.account.retrieve();
    } catch (error) {
      console.error("Error retrieving account:", error);
    }

    console.log("Stripe mode detected:", mode, "Account:", accountInfo?.id);

    return new Response(
      JSON.stringify({
        mode,
        is_test_mode: isTestMode,
        stripe_key_prefix: stripeKey.substring(0, 10) + "...",
        account_id: accountInfo?.id || null,
        account_type: accountInfo?.type || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error detecting Stripe mode:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
