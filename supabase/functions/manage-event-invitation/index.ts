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

/** Check if caller can manage the given event. Throws on failure. */
async function assertCanManageEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  callerId: string,
  eventId: string
) {
  // 1) Check event ownership or host entity admin
  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select("id, created_by, host_entity_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!eventRow) throw new Error("Event ikke funnet");

  if (eventRow.created_by === callerId) return;

  // 2) Host entity team with editor+ access
  if (eventRow.host_entity_id) {
    const { data: teamRow } = await supabaseAdmin
      .from("entity_team")
      .select("id")
      .eq("entity_id", eventRow.host_entity_id)
      .eq("user_id", callerId)
      .is("left_at", null)
      .in("access", ["owner", "admin", "editor"])
      .maybeSingle();
    if (teamRow) return;
  }

  // 3) Festival team member
  const { data: festRow } = await supabaseAdmin
    .from("festival_events")
    .select("festival_id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (festRow) {
    const { data: fpRow } = await supabaseAdmin
      .from("festival_participants")
      .select("id")
      .eq("festival_id", festRow.festival_id)
      .eq("participant_kind", "persona")
      .maybeSingle();
    if (fpRow) return; // simplified check
  }

  // 4) Platform admin
  const { count: adminCount } = await supabaseAdmin
    .from("platform_access")
    .select("id", { count: "exact", head: true })
    .eq("user_id", callerId);
  if (adminCount && adminCount > 0) return;

  throw new Error("Ingen tilgang");
}

/** Get caller's persona id. Returns null if none found. */
async function getCallerPersonaId(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("personas")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
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

      // Auth check
      try {
        await assertCanManageEvent(supabaseAdmin, caller.id, event_id);
      } catch (e) {
        return json({ error: (e as Error).message }, 403);
      }

      // Require persona for invited_by
      const personaId = await getCallerPersonaId(supabaseAdmin, caller.id);
      if (!personaId) {
        return json({ error: "Inviterende bruker mangler persona. Opprett persona først." }, 400);
      }

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
          invited_by: personaId,
          access_on_accept: "viewer",
        })
        .select()
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return json({ error: insertErr.message }, 500);
      }

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

      // Auth check on the invitation's event
      try {
        await assertCanManageEvent(supabaseAdmin, caller.id, inv.event_id);
      } catch (e) {
        return json({ error: (e as Error).message }, 403);
      }

      if (inv.status !== "pending") {
        return json({ error: "Kan bare sende på nytt for ventende invitasjoner" }, 400);
      }

      const newToken = inv.token || generateToken();
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from("event_invitations")
        .update({ token: newToken, expires_at: newExpiry, updated_at: new Date().toISOString() })
        .eq("id", invitation_id);

      return json({ ok: true });
    }

    // ─── C) REVOKE ───
    if (action === "revoke") {
      if (!caller) return json({ error: "Ikke autentisert" }, 401);
      const { invitation_id } = params;
      if (!invitation_id) return json({ error: "invitation_id påkrevd" }, 400);

      // Get invitation to check event access
      const { data: inv } = await supabaseAdmin
        .from("event_invitations")
        .select("event_id")
        .eq("id", invitation_id)
        .maybeSingle();

      if (!inv) return json({ error: "Invitasjon ikke funnet" }, 404);

      try {
        await assertCanManageEvent(supabaseAdmin, caller.id, inv.event_id);
      } catch (e) {
        return json({ error: (e as Error).message }, 403);
      }

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

      // Require persona
      const { data: persona } = await supabaseAdmin
        .from("personas")
        .select("id")
        .eq("user_id", caller.id)
        .limit(1)
        .maybeSingle();

      if (!persona?.id) {
        return json({ error: "Du må ha en persona for å godta invitasjonen. Opprett profil først." }, 400);
      }

      // Check for existing participant (prevent duplicates)
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
          participant_id: persona.id,
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
