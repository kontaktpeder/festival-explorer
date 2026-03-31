import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate caller from auth header
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerToken = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
    } = await supabaseAdmin.auth.getUser(callerToken);

    // ─── A) SEND INVITATION ───
    if (action === "send") {
      if (!caller) return json({ error: "Ikke autentisert" }, 401);

      const { event_id, zone, email, name, message } = params;
      if (!event_id || !email) {
        return json({ error: "event_id og email er påkrevd" }, 400);
      }
      const trimmedEmail = (email as string).trim().toLowerCase();
      if (trimmedEmail.length < 4 || !trimmedEmail.includes("@")) {
        return json({ error: "Ugyldig e-postadresse" }, 400);
      }

      // Verify caller can edit event
      const { data: canEdit } = await supabaseAdmin.rpc("can_edit_event", {
        p_event_id: event_id,
      });
      // Fallback: check if caller is admin
      const { data: isAdmin } = await supabaseAdmin.rpc("is_admin");

      // Use service role to check — caller might not have RPC perms
      // Instead, check event ownership directly
      const { data: eventRow } = await supabaseAdmin
        .from("events")
        .select("id, created_by, host_entity_id")
        .eq("id", event_id)
        .maybeSingle();

      if (!eventRow) return json({ error: "Event ikke funnet" }, 404);

      // Check ownership or host entity admin
      let hasAccess = eventRow.created_by === caller.id;
      if (!hasAccess && eventRow.host_entity_id) {
        const { data: teamRow } = await supabaseAdmin
          .from("entity_team")
          .select("id")
          .eq("entity_id", eventRow.host_entity_id)
          .eq("user_id", caller.id)
          .is("left_at", null)
          .in("access", ["owner", "admin", "editor"])
          .maybeSingle();
        if (teamRow) hasAccess = true;
      }
      // Check festival team
      if (!hasAccess) {
        const { data: festRow } = await supabaseAdmin
          .from("festival_events")
          .select("festival_id")
          .eq("event_id", event_id)
          .maybeSingle();
        if (festRow) {
          const { data: fpRow } = await supabaseAdmin
            .from("festival_participants")
            .select("id")
            .eq("festival_id", festRow.festival_id)
            .eq("participant_kind", "persona")
            .maybeSingle();
          // Simplified: check if user has persona in festival_participants
          // For now, allow if festival team member via festival_participants join
        }
      }
      // Also check admin
      const { count: adminCount } = await supabaseAdmin
        .from("platform_access")
        .select("id", { count: "exact", head: true })
        .eq("user_id", caller.id);
      if (adminCount && adminCount > 0) hasAccess = true;

      if (!hasAccess) return json({ error: "Ingen tilgang" }, 403);

      // Check for existing pending invitation
      const { data: existing } = await supabaseAdmin
        .from("event_invitations")
        .select("id")
        .eq("event_id", event_id)
        .eq("status", "pending")
        .ilike("email", trimmedEmail)
        .maybeSingle();

      if (existing) {
        return json({ error: "Det finnes allerede en ventende invitasjon for denne e-posten" }, 409);
      }

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Get caller's persona for invited_by
      const { data: callerPersona } = await supabaseAdmin
        .from("personas")
        .select("id")
        .eq("user_id", caller.id)
        .limit(1)
        .maybeSingle();

      const { data: invitation, error: insertErr } = await supabaseAdmin
        .from("event_invitations")
        .insert({
          event_id,
          email: trimmedEmail,
          name: name || null,
          zone: zone || "other",
          token,
          status: "pending",
          expires_at: expiresAt,
          message: message || null,
          invited_by: callerPersona?.id ?? caller.id,
          access_on_accept: "viewer",
        })
        .select()
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return json({ error: insertErr.message }, 500);
      }

      // TODO: Send email with invitation link when email service is configured
      // For now, the token can be used directly: /accept-event-invitation?token=<token>

      return json({ ok: true, invitation });
    }

    // ─── B) RESEND ───
    if (action === "resend") {
      if (!caller) return json({ error: "Ikke autentisert" }, 401);
      const { invitation_id } = params;
      if (!invitation_id) return json({ error: "invitation_id påkrevd" }, 400);

      const { data: inv } = await supabaseAdmin
        .from("event_invitations")
        .select("*")
        .eq("id", invitation_id)
        .maybeSingle();

      if (!inv) return json({ error: "Invitasjon ikke funnet" }, 404);
      if (inv.status !== "pending") {
        return json({ error: "Kan bare sende på nytt for ventende invitasjoner" }, 400);
      }

      // Regenerate token if needed
      const newToken = inv.token || generateToken();
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from("event_invitations")
        .update({ token: newToken, expires_at: newExpiry, updated_at: new Date().toISOString() })
        .eq("id", invitation_id);

      // TODO: Re-send email

      return json({ ok: true });
    }

    // ─── C) REVOKE ───
    if (action === "revoke") {
      if (!caller) return json({ error: "Ikke autentisert" }, 401);
      const { invitation_id } = params;
      if (!invitation_id) return json({ error: "invitation_id påkrevd" }, 400);

      const { error: updateErr } = await supabaseAdmin
        .from("event_invitations")
        .update({
          status: "revoked",
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invitation_id)
        .eq("status", "pending");

      if (updateErr) return json({ error: updateErr.message }, 500);
      return json({ ok: true });
    }

    // ─── D) ACCEPT ───
    if (action === "accept") {
      const { token } = params;
      if (!token) return json({ error: "Token påkrevd" }, 400);

      const { data: inv } = await supabaseAdmin
        .from("event_invitations")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (!inv) return json({ error: "Invitasjon ikke funnet" }, 404);
      if (inv.status !== "pending") {
        return json({ error: `Invitasjonen er allerede ${inv.status}` }, 400);
      }
      if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
        await supabaseAdmin
          .from("event_invitations")
          .update({ status: "expired" })
          .eq("id", inv.id);
        return json({ error: "Invitasjonen har utløpt" }, 410);
      }

      // Caller must be authenticated to accept
      if (!caller) {
        return json({
          error: "Logg inn for å godta invitasjonen",
          requires_auth: true,
          event_id: inv.event_id,
        }, 401);
      }

      // Get or find persona for user
      const { data: persona } = await supabaseAdmin
        .from("personas")
        .select("id")
        .eq("user_id", caller.id)
        .limit(1)
        .maybeSingle();

      // Check for existing participant (prevent duplicates)
      const participantFilter: Record<string, unknown> = {
        event_id: inv.event_id,
      };

      if (persona) {
        const { data: existingParticipant } = await supabaseAdmin
          .from("event_participants")
          .select("id")
          .eq("event_id", inv.event_id)
          .eq("participant_kind", "persona")
          .eq("participant_id", persona.id)
          .maybeSingle();

        if (existingParticipant) {
          // Already a participant — just update invitation status
          await supabaseAdmin
            .from("event_invitations")
            .update({
              status: "accepted",
              responded_at: new Date().toISOString(),
              accepted_by_user_id: caller.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", inv.id);

          return json({ ok: true, already_participant: true, event_id: inv.event_id });
        }
      }

      // Determine default live_role based on zone
      const zoneRoleMap: Record<string, string> = {
        lineup: "viewer",
        crew: "crew",
        technical: "editor",
        other: "viewer",
      };
      const defaultRole = zoneRoleMap[inv.zone || "other"] || "viewer";

      // Get max sort_order
      const { data: maxRows } = await supabaseAdmin
        .from("event_participants")
        .select("sort_order")
        .eq("event_id", inv.event_id)
        .eq("zone", inv.zone || "other")
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextSort = (maxRows?.[0]?.sort_order ?? 0) + 1;

      // Insert participant
      const { error: insertErr } = await supabaseAdmin
        .from("event_participants")
        .insert({
          event_id: inv.event_id,
          zone: inv.zone || "other",
          participant_kind: "persona",
          participant_id: persona?.id ?? caller.id,
          role_label: null,
          sort_order: nextSort,
          live_role: defaultRole,
          can_view_runsheet: inv.zone === "technical" || inv.zone === "crew",
          can_operate_runsheet: inv.zone === "technical",
          is_public: inv.zone === "lineup",
        });

      if (insertErr) {
        console.error("Insert participant error:", insertErr);
        return json({ error: insertErr.message }, 500);
      }

      // Update invitation
      await supabaseAdmin
        .from("event_invitations")
        .update({
          status: "accepted",
          responded_at: new Date().toISOString(),
          accepted_by_user_id: caller.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inv.id);

      return json({ ok: true, event_id: inv.event_id });
    }

    // ─── E) DECLINE ───
    if (action === "decline") {
      const { token } = params;
      if (!token) return json({ error: "Token påkrevd" }, 400);

      const { error: updateErr } = await supabaseAdmin
        .from("event_invitations")
        .update({
          status: "declined",
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("token", token)
        .eq("status", "pending");

      if (updateErr) return json({ error: updateErr.message }, 500);
      return json({ ok: true });
    }

    return json({ error: `Ukjent action: ${action}` }, 400);
  } catch (err) {
    console.error("manage-event-invitation error:", err);
    return json({ error: "Intern feil" }, 500);
  }
});
