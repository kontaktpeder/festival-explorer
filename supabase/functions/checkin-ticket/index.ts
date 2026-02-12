import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketResult {
  id: string;
  ticket_code: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  event_id: string;
  ticket_type_id: string;
  created_at: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  refunded_at: string | null;
  chargeback_at: string | null;
  ticket_types: { name: string; description: string | null; code: string } | null;
  ticket_events: { 
    id: string;
    name: string; 
    slug: string; 
    starts_at: string; 
    venue_name: string | null;
    attendance_count: number;
    boilerroom_attendance_count: number;
  } | null;
}

interface CheckInRequest {
  ticketCode: string;
  method?: 'qr' | 'manual' | 'manual_override';
  note?: string;
  device_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const deviceInfo = req.headers.get("User-Agent") || "unknown";
  
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, result: "error", error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, result: "error", error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check staff role
    const { data: staffRole, error: roleError } = await supabaseAdmin
      .from("staff_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !staffRole || !["admin", "crew"].includes(staffRole.role)) {
      return new Response(
        JSON.stringify({ success: false, result: "error", error: "Staff access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { ticketCode, method = "qr", note, device_id }: CheckInRequest = await req.json();

    if (!ticketCode) {
      return new Response(
        JSON.stringify({ success: false, result: "error", error: "Ticket code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedCode = ticketCode.toUpperCase().trim();

    // Helper function to log scan attempts
    const logScan = async (
      ticketId: string | null,
      result: string,
      errorMessage?: string
    ) => {
      try {
        await supabaseAdmin.from("scan_logs").insert({
          ticket_id: ticketId,
          ticket_code: normalizedCode,
          result,
          checked_in_by: user.id,
          device_info: deviceInfo,
          method,
          error_message: errorMessage,
        });
      } catch (e) {
        console.error("Failed to log scan:", e);
      }
    };

    // Structured outcome logging for observability
    const logCheckInOutcome = (params: {
      event_id: string | null;
      ticket_id: string | null;
      scanner_user_id: string;
      result: string;
      reason?: string;
    }) => {
      console.log(JSON.stringify({
        event_id: params.event_id ?? null,
        ticket_id: params.ticket_id ?? null,
        scanner_user_id: params.scanner_user_id,
        result: params.result,
        ...(params.reason && { reason: params.reason }),
        timestamp: new Date().toISOString(),
      }));
    };

    const { data, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select(`
        *,
        ticket_types (name, description, code),
        ticket_events (id, name, slug, starts_at, venue_name, attendance_count, boilerroom_attendance_count)
      `)
      .eq("ticket_code", normalizedCode)
      .single();

    if (ticketError || !data) {
      await logScan(null, "invalid", "Ticket not found");
      return new Response(
        JSON.stringify({ 
          success: false, 
          result: "invalid", 
          ticketCode: normalizedCode,
          error: "Billett ikke funnet" 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ticket = data as TicketResult;

    // Check if refunded
    if (ticket.refunded_at) {
      await logScan(ticket.id, "refunded", "Ticket was refunded");
      return new Response(
        JSON.stringify({
          success: false,
          result: "refunded",
          ticketCode: ticket.ticket_code,
          buyerName: ticket.buyer_name,
          buyerEmail: ticket.buyer_email,
          ticketType: ticket.ticket_types?.name,
          refundedAt: ticket.refunded_at,
          error: "Billetten er refundert"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if chargeback
    if (ticket.chargeback_at) {
      await logScan(ticket.id, "refunded", "Ticket has chargeback");
      return new Response(
        JSON.stringify({
          success: false,
          result: "refunded",
          ticketCode: ticket.ticket_code,
          buyerName: ticket.buyer_name,
          buyerEmail: ticket.buyer_email,
          ticketType: ticket.ticket_types?.name,
          chargebackAt: ticket.chargeback_at,
          error: "Billetten har chargeback"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if cancelled
    if (ticket.status === "CANCELLED") {
      await logScan(ticket.id, "invalid", "Ticket is cancelled");
      return new Response(
        JSON.stringify({
          success: false,
          result: "invalid",
          ticketCode: ticket.ticket_code,
          buyerName: ticket.buyer_name,
          buyerEmail: ticket.buyer_email,
          ticketType: ticket.ticket_types?.name,
          error: "Billetten er kansellert"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already used
    if (ticket.status === "USED" && ticket.checked_in_at) {
      // Get who checked it in
      let checkedInByName = "Ukjent";
      let checkedInByEmail = "";
      
      if (ticket.checked_in_by) {
        // Try to get profile info
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("id", ticket.checked_in_by)
          .single();
        
        if (profile?.display_name) {
          checkedInByName = profile.display_name;
        }
        
        // Get email from auth.users via admin API
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ticket.checked_in_by);
        if (authUser?.user?.email) {
          checkedInByEmail = authUser.user.email;
          if (!profile?.display_name) {
            checkedInByName = authUser.user.email.split("@")[0];
          }
        }
      }

      logCheckInOutcome({ event_id: ticket.event_id, ticket_id: ticket.id, scanner_user_id: user.id, result: "already_used", reason: "read path" });
      await logScan(ticket.id, "already_used", "Ticket already checked in");
      return new Response(
        JSON.stringify({
          success: false,
          result: "already_used",
          ticketCode: ticket.ticket_code,
          buyerName: ticket.buyer_name,
          buyerEmail: ticket.buyer_email,
          ticketType: ticket.ticket_types?.name,
          ticketDescription: ticket.ticket_types?.description,
          eventName: ticket.ticket_events?.name,
          checkedInAt: ticket.checked_in_at,
          checkedInBy: checkedInByEmail,
          checkedInByName: checkedInByName,
          error: "Billetten er allerede brukt"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine if ticket has boilerroom access
    const ticketTypeCode = ticket.ticket_types?.code?.toUpperCase() || "";
    const hasBoilerroomAccess = ticketTypeCode.includes("BOILERROOM") || 
                                ticketTypeCode === "BOILERROOM";

    // Perform atomic check-in – use .select() to detect race conditions
    const checkedInAt = new Date().toISOString();
    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from("tickets")
      .update({
        status: "USED",
        checked_in_at: checkedInAt,
        checked_in_by: user.id,
      })
      .eq("id", ticket.id)
      .eq("status", "VALID") // Only update if still VALID (prevents race condition)
      .select("id");

    if (updateError) {
      console.error("Error updating ticket:", updateError);
      await logScan(ticket.id, "error", `Failed to update ticket: ${updateError.message}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          result: "error",
          ticketCode: ticket.ticket_code,
          error: "Kunne ikke sjekke inn billetten" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 0 rows updated = another request won the race
    if (!updatedRows || updatedRows.length !== 1) {
      logCheckInOutcome({ event_id: ticket.event_id, ticket_id: ticket.id, scanner_user_id: user.id, result: "already_used", reason: "0 rows updated" });
      await logScan(ticket.id, "already_used", "Concurrent check-in; 0 rows updated");

      // Re-fetch ticket to show who actually checked in
      let raceCheckedInAt: string | null = null;
      let raceCheckedInBy = "";
      let raceCheckedInByName = "Annen enhet";
      const { data: refetched } = await supabaseAdmin
        .from("tickets")
        .select("checked_in_at, checked_in_by")
        .eq("id", ticket.id)
        .single();
      if (refetched?.checked_in_at) {
        raceCheckedInAt = refetched.checked_in_at;
        if (refetched.checked_in_by) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("display_name")
            .eq("id", refetched.checked_in_by)
            .single();
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(refetched.checked_in_by);
          if (authUser?.user?.email) {
            raceCheckedInBy = authUser.user.email;
            raceCheckedInByName = profile?.display_name ?? authUser.user.email.split("@")[0];
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          result: "already_used",
          ticketCode: ticket.ticket_code,
          buyerName: ticket.buyer_name,
          buyerEmail: ticket.buyer_email,
          ticketType: ticket.ticket_types?.name,
          ticketDescription: ticket.ticket_types?.description,
          eventName: ticket.ticket_events?.name,
          checkedInAt: raceCheckedInAt,
          checkedInBy: raceCheckedInBy,
          checkedInByName: raceCheckedInByName,
          error: "Billetten er allerede brukt",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exactly 1 row updated – proceed with side-effects

    // Count actual checked-in tickets for accurate "Inne nå"
    const { count: checkedInCount } = await supabaseAdmin
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("event_id", ticket.event_id)
      .neq("status", "CANCELLED")
      .or("status.eq.USED,checked_in_at.not.is.null");

    const newAttendanceCount = checkedInCount ?? 0;

    // Count boilerroom checked-in tickets
    const { count: boilerroomCount } = await supabaseAdmin
      .from("tickets")
      .select("*, ticket_types!inner(code)", { count: "exact", head: true })
      .eq("event_id", ticket.event_id)
      .neq("status", "CANCELLED")
      .or("status.eq.USED,checked_in_at.not.is.null")
      .or("ticket_types.code.ilike.%BOILERROOM%,ticket_types.code.ilike.%BOILER%", { referencedTable: "ticket_types" });

    const newBoilerroomCount = boilerroomCount ?? 0;

    const { error: eventUpdateError } = await supabaseAdmin
      .from("ticket_events")
      .update({
        attendance_count: newAttendanceCount,
        boilerroom_attendance_count: newBoilerroomCount,
      })
      .eq("id", ticket.event_id);

    if (eventUpdateError) {
      console.error("Error updating event attendance:", eventUpdateError);
    }

    // Create checkin audit log
    const { error: checkinError } = await supabaseAdmin
      .from("checkins")
      .insert({
        ticket_id: ticket.id,
        checked_in_by: user.id,
        method,
        note,
        ...(device_id && { device_id }),
      });

    if (checkinError) {
      console.error("Error creating checkin log:", checkinError);
      await logScan(ticket.id, "error", `Checkins insert failed: ${checkinError.message}`);
      return new Response(
        JSON.stringify({
          success: false,
          result: "error",
          ticketCode: ticket.ticket_code,
          error: "Kunne ikke registrere innsjekking",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful scan
    logCheckInOutcome({ event_id: ticket.event_id, ticket_id: ticket.id, scanner_user_id: user.id, result: "success" });
    await logScan(ticket.id, "success");

    console.log(`Ticket ${normalizedCode} checked in by ${user.email} via ${method}`);

    return new Response(
      JSON.stringify({
        success: true,
        result: "success",
        ticketCode: ticket.ticket_code,
        buyerName: ticket.buyer_name,
        buyerEmail: ticket.buyer_email,
        ticketType: ticket.ticket_types?.name,
        ticketDescription: ticket.ticket_types?.description,
        eventName: ticket.ticket_events?.name,
        hasBoilerroomAccess,
        checkedInAt: checkedInAt,
        attendanceCount: newAttendanceCount,
        boilerroomAttendanceCount: newBoilerroomCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking in ticket:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, result: "error", error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
