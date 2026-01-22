import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || record.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  if (record.count >= RATE_LIMIT) return true;
  record.count++;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for") || "unknown";
  if (isRateLimited(clientIP)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const url = new URL(req.url);
    const ticketCode = url.searchParams.get("code");
    if (!ticketCode) {
      return new Response(JSON.stringify({ error: "Ticket code is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select(`id, ticket_code, buyer_name, created_at, ticket_types (name, description), ticket_events (name, slug, starts_at, venue_name)`)
      .eq("ticket_code", ticketCode.toUpperCase())
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ticketTypes = Array.isArray(data.ticket_types) ? data.ticket_types[0] : data.ticket_types;
    const ticketEvents = Array.isArray(data.ticket_events) ? data.ticket_events[0] : data.ticket_events;

    return new Response(JSON.stringify({
      ticketCode: data.ticket_code,
      buyerName: data.buyer_name,
      createdAt: data.created_at,
      ticketType: ticketTypes?.name,
      ticketDescription: ticketTypes?.description,
      eventName: ticketEvents?.name,
      eventSlug: ticketEvents?.slug,
      startsAt: ticketEvents?.starts_at,
      venueName: ticketEvents?.venue_name,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
