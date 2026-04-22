import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ ok: false, error: "Missing authorization" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client authenticated as the user (for calling delete_user_safely RPC)
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);
      return jsonResponse({
        ok: false,
        error: "Not authenticated",
        diagnostics: { stage: "auth", details: userError?.message ?? null },
      });
    }

    console.log(`Starting account deletion for user: ${user.id}`);

    // 1. Call delete_user_safely RPC (cleans up profile, personas, media, etc.)
    // Continue even if this fails (profile may already be deleted)
    let rpcResult = null;
    const { data, error: rpcError } = await supabaseUser.rpc(
      "delete_user_safely",
      { p_user_id: user.id }
    );

    if (rpcError) {
      // Profile not found is OK - continue to delete auth user
      if (rpcError.message?.includes("profile not found")) {
        console.log("Profile already deleted, continuing to delete auth user");
      } else {
        console.error("delete_user_safely RPC error:", rpcError);
        return jsonResponse({
          ok: false,
          error: "Failed to delete user data",
          details: rpcError.message,
          diagnostics: {
            stage: "delete_user_safely",
            code: rpcError.code ?? null,
            hint: rpcError.hint ?? null,
          },
        });
      }
    } else {
      rpcResult = data;
    }

    console.log("delete_user_safely result:", rpcResult);

    // 2. Delete the auth user using service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: deleteAuthError } =
      await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteAuthError) {
      console.error("Failed to delete auth user:", deleteAuthError);
      return jsonResponse({
        ok: true,
        success: true,
        warning: "Profile deleted but auth user could not be removed",
        details: deleteAuthError.message,
        ...rpcResult,
      });
    }

    console.log(`Successfully deleted auth user: ${user.id}`);

    return jsonResponse({ ok: true, success: true, ...rpcResult });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({
      ok: false,
      error: "Internal server error",
      details: String(err),
      diagnostics: { stage: "unexpected" },
    });
  }
});
