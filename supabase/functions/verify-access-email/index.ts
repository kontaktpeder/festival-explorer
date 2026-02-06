import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      console.warn("verify-access-email: Missing or invalid token");
      return new Response(
        JSON.stringify({ error: "Token mangler" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find and verify the request by token
    const { data, error } = await supabase
      .from("access_requests")
      .update({
        email_verified: true,
        verification_token: null, // Clear token after use
      })
      .eq("verification_token", token)
      .select("id, name, email")
      .maybeSingle();

    if (error) {
      console.error("verify-access-email DB error:", error);
      return new Response(
        JSON.stringify({ error: "Databasefeil" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data) {
      console.warn("verify-access-email: Invalid or used token");
      return new Response(
        JSON.stringify({ error: "Ugyldig eller allerede brukt token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Email verified for request ${data.id} (${data.email})`);

    return new Response(
      JSON.stringify({ success: true, name: data.name }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-access-email error:", err);
    return new Response(
      JSON.stringify({ error: "Intern feil" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
