import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Search,
  Users,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Ticket,
  Loader2,
  TestTube,
  Zap,
} from "lucide-react";

// Stripe fee calculation: 1.4% + 2.5 NOK per transaction (Norwegian cards)
const STRIPE_FEE_PERCENT = 0.014;
const STRIPE_FEE_FIXED = 2.5;

function calculateStripeFee(amountNok: number): number {
  return Math.round(amountNok * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
  }).format(amount);
}

interface TicketType {
  id: string;
  name: string;
  code: string;
  price_nok: number;
  capacity: number;
}

interface TicketWithRelations {
  id: string;
  ticket_code: string;
  buyer_name: string;
  buyer_email: string;
  status: string;
  created_at: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  refunded_at: string | null;
  chargeback_at: string | null;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  ticket_type_id: string;
  ticket_types?: Partial<TicketType> | null;
  ticket_events?: { id?: string; name?: string; attendance_count?: number; boilerroom_attendance_count?: number } | null;
}

// Hook for ticket statistics
function useTicketStats() {
  return useQuery({
    queryKey: ["ticket-stats"],
    queryFn: async () => {
      // Get all tickets with related data
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select(`
          *,
          ticket_types (
            id,
            name,
            code,
            price_nok,
            capacity
          ),
          ticket_events (
            id,
            name,
            attendance_count,
            boilerroom_attendance_count
          )
        `)
        .order("created_at", { ascending: false });

      if (ticketsError) throw ticketsError;

      // Get all ticket types for capacity calculation
      const { data: ticketTypes, error: typesError } = await supabase
        .from("ticket_types")
        .select("*");

      if (typesError) throw typesError;

      const typedTickets = tickets as TicketWithRelations[] | null;

      // Calculate statistics
      const validTickets = typedTickets?.filter(
        (t) => t.status === "VALID" && !t.refunded_at && !t.chargeback_at
      ) || [];

      const totalSold = validTickets.length;
      const totalRevenue = validTickets.reduce((sum, ticket) => {
        const price = ticket.ticket_types?.price_nok || 0;
        return sum + price;
      }, 0);

      const totalFees = validTickets.reduce((sum, ticket) => {
        const price = ticket.ticket_types?.price_nok || 0;
        return sum + calculateStripeFee(price);
      }, 0);

      const netRevenue = totalRevenue - totalFees;

      // Sales by ticket type
      const salesByType = ticketTypes?.map((type) => {
        const sold = validTickets.filter(
          (t) => t.ticket_type_id === type.id
        ).length;
        const revenue = validTickets
          .filter((t) => t.ticket_type_id === type.id)
          .reduce((sum, t) => sum + (t.ticket_types?.price_nok || 0), 0);

        return {
          ...type,
          sold,
          revenue,
          capacityLeft: type.capacity - sold,
          capacityPercent: type.capacity > 0 ? (sold / type.capacity) * 100 : 0,
        };
      }) || [];

      // Recent purchases (last 10)
      const recentPurchases = validTickets
        .slice(0, 10)
        .map((ticket) => ({
          id: ticket.id,
          ticketCode: ticket.ticket_code,
          buyerName: ticket.buyer_name,
          buyerEmail: ticket.buyer_email,
          ticketType: ticket.ticket_types?.name || "Ukjent",
          amount: ticket.ticket_types?.price_nok || 0,
          status: ticket.status,
          createdAt: ticket.created_at,
          checkedIn: !!ticket.checked_in_at,
        }));

      // Capacity totals
      const totalCapacity = ticketTypes?.reduce(
        (sum, type) => sum + type.capacity,
        0
      ) || 0;
      const totalCapacityLeft = totalCapacity - totalSold;

      // Check-ins
      const checkedIn = validTickets.filter((t) => t.checked_in_at).length;

      return {
        totalSold,
        totalRevenue,
        totalFees,
        netRevenue,
        salesByType,
        recentPurchases,
        totalCapacity,
        totalCapacityLeft,
        checkedIn,
        tickets: typedTickets || [],
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Hook for issues/errors
function useTicketIssues() {
  return useQuery({
    queryKey: ["ticket-issues"],
    queryFn: async () => {
      // Get all tickets
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const typedTickets = (tickets || []) as unknown as TicketWithRelations[];

      // Find duplicate stripe_session_ids
      const sessionIds = new Map<string, string[]>();
      typedTickets?.forEach((ticket) => {
        if (!sessionIds.has(ticket.stripe_session_id)) {
          sessionIds.set(ticket.stripe_session_id, []);
        }
        sessionIds.get(ticket.stripe_session_id)?.push(ticket.id);
      });

      const duplicateSessions = Array.from(sessionIds.entries())
        .filter(([_, ids]) => ids.length > 1)
        .map(([sessionId, ids]) => ({
          sessionId,
          ticketIds: ids,
          count: ids.length,
        }));

      // Refunded tickets
      const refunded = typedTickets?.filter((t) => t.refunded_at) || [];

      // Chargebacks
      const chargebacks = typedTickets?.filter((t) => t.chargeback_at) || [];

      // Check for payment failures (would need webhook logs, but we can check status)
      // For now, we'll check for tickets with no payment_intent_id
      const paymentIssues = typedTickets?.filter(
        (t) => !t.stripe_payment_intent_id && t.status === "VALID"
      ) || [];

      // All issues combined
      const allIssues = [
        ...duplicateSessions.map((d) => ({
          type: "duplicate_session",
          severity: "high" as const,
          message: `Dobbel registrering: ${d.count} billetter med samme session_id`,
          count: d.count,
          data: d,
        })),
        ...refunded.map((t) => ({
          type: "refunded",
          severity: "medium" as const,
          message: `Refundert: ${t.ticket_code}`,
          count: refunded.length,
          data: t,
        })),
        ...chargebacks.map((t) => ({
          type: "chargeback",
          severity: "high" as const,
          message: `Chargeback: ${t.ticket_code}`,
          count: chargebacks.length,
          data: t,
        })),
        ...paymentIssues.map((t) => ({
          type: "payment_issue",
          severity: "medium" as const,
          message: `Manglende payment_intent: ${t.ticket_code}`,
          count: paymentIssues.length,
          data: t,
        })),
      ];

      const hasIssues = allIssues.length > 0;
      const criticalIssues = allIssues.filter((i) => i.severity === "high").length;

      return {
        hasIssues,
        criticalIssues,
        allIssues,
        duplicateSessions,
        refunded,
        chargebacks,
        paymentIssues,
      };
    },
    refetchInterval: 30000,
  });
}

// Hook for check-in stats
function useCheckInStats() {
  return useQuery({
    queryKey: ["checkin-stats"],
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select(`
          *,
          ticket_types (
            name,
            code
          ),
          ticket_events (
            name,
            attendance_count,
            boilerroom_attendance_count
          )
        `)
        .eq("status", "VALID")
        .is("refunded_at", null)
        .is("chargeback_at", null);

      if (error) throw error;

      interface TicketWithTypes {
        checked_in_at: string | null;
        ticket_types: { name: string; code: string } | null;
      }

      const typedTickets = tickets as TicketWithTypes[] | null;

      const checkedIn = typedTickets?.filter((t) => t.checked_in_at) || [];
      const notCheckedIn = typedTickets?.filter((t) => !t.checked_in_at) || [];

      // Boilerroom access (tickets with BOILERROOM or festival passes that include boilerroom)
      const boilerroomAccess = typedTickets?.filter((t) => {
        const code = t.ticket_types?.code;
        return code === "BOILERROOM" || code === "FEST_EARLYBIRD";
      }) || [];

      const boilerroomCheckedIn = boilerroomAccess.filter(
        (t) => t.checked_in_at
      ).length;

      return {
        totalValid: typedTickets?.length || 0,
        checkedIn: checkedIn.length,
        notCheckedIn: notCheckedIn.length,
        boilerroomAccess: boilerroomAccess.length,
        boilerroomCheckedIn,
        boilerroomNotCheckedIn:
          boilerroomAccess.length - boilerroomCheckedIn,
      };
    },
    refetchInterval: 10000, // Refresh every 10 seconds for live updates
  });
}

// Hook for Stripe mode detection
interface StripeModeData {
  mode: "test" | "live";
  is_test_mode: boolean;
  stripe_key_prefix: string;
  account_id: string | null;
  account_type: string | null;
}

function useStripeMode() {
  return useQuery({
    queryKey: ["stripe-mode"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://nxgotyhhjtwikdcjdxxn.supabase.co/functions/v1/get-stripe-mode`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to get Stripe mode");
      return response.json() as Promise<StripeModeData>;
    },
    staleTime: 60000, // Cache for 1 minute
  });
}

// Hook for Stripe sync data
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

interface StripeSyncData {
  stats: {
    mode: string;
    total_stripe_sessions: number;
    total_db_tickets: number;
    missing_tickets: number;
    sync_percentage: string;
  };
  missing_tickets: MissingTicket[];
  note: string;
}

function useStripeSync() {
  return useQuery({
    queryKey: ["stripe-sync"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://nxgotyhhjtwikdcjdxxn.supabase.co/functions/v1/sync-stripe-tickets`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to sync");
      return response.json() as Promise<StripeSyncData>;
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

export default function AdminTicketsDashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TicketWithRelations[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: stats, isLoading: statsLoading } = useTicketStats();
  const { data: issues, isLoading: issuesLoading } = useTicketIssues();
  const { data: checkInStats, isLoading: checkInLoading } = useCheckInStats();
  const { data: stripeMode } = useStripeMode();
  const { data: syncData, isLoading: syncLoading, refetch: refetchSync } = useStripeSync();

  // Export CSV
  const exportCSV = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://nxgotyhhjtwikdcjdxxn.supabase.co/functions/v1/export-tickets-csv`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast.success("CSV eksportert");
    },
    onError: (error: Error) => {
      toast.error("Kunne ikke eksportere: " + error.message);
    },
  });

  // Search tickets
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          ticket_types (name, code),
          ticket_events (name)
        `)
        .or(
          `ticket_code.ilike.%${searchQuery}%,buyer_name.ilike.%${searchQuery}%,buyer_email.ilike.%${searchQuery}%,stripe_session_id.ilike.%${searchQuery}%`
        )
        .limit(20);

      if (error) throw error;
      setSearchResults((data || []) as unknown as TicketWithRelations[]);
    } catch {
      toast.error("Søk feilet");
    } finally {
      setIsSearching(false);
    }
  };

  // Override: Mark as used
  const markAsUsed = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("tickets")
        .update({
          status: "USED",
          checked_in_at: new Date().toISOString(),
          checked_in_by: user.id,
        })
        .eq("id", ticketId);

      if (error) throw error;

      // Log check-in
      await supabase.from("checkins").insert({
        ticket_id: ticketId,
        checked_in_by: user.id,
        method: "manual_override",
        note: "Admin override",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      queryClient.invalidateQueries({ queryKey: ["checkin-stats"] });
      toast.success("Billett markert som brukt");
    },
    onError: (error: Error) => {
      toast.error("Kunne ikke oppdatere: " + error.message);
    },
  });

  // Override: Reset check-in
  const resetCheckIn = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("tickets")
        .update({
          status: "VALID",
          checked_in_at: null,
          checked_in_by: null,
        })
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      queryClient.invalidateQueries({ queryKey: ["checkin-stats"] });
      toast.success("Innsjekking nullstilt");
    },
    onError: (error: Error) => {
      toast.error("Kunne ikke nullstille: " + error.message);
    },
  });

  if (statsLoading || issuesLoading || checkInLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billettkontroll</h1>
        <Button onClick={() => exportCSV.mutate()} disabled={exportCSV.isPending}>
          <Download className="h-4 w-4 mr-2" />
          Eksporter CSV
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="issues">Avvik</TabsTrigger>
          <TabsTrigger value="checkin">Innsjekking</TabsTrigger>
          <TabsTrigger value="report">Rapport</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stripe Mode Indicator */}
          {stripeMode && (
            <Card className={stripeMode.is_test_mode ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" : "border-primary bg-primary/5"}>
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  {stripeMode.is_test_mode ? (
                    <>
                      <TestTube className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-700 dark:text-yellow-400">Sandkasse-modus (Test)</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="font-medium text-primary">Live-modus (Produksjon)</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stripeMode.is_test_mode 
                    ? "Du ser nå data fra Stripe sandkasse. Når du bytter til live webhook og secret, vil live-data vises automatisk."
                    : "Du ser nå live data fra Stripe produksjon. Alle endringer påvirker ekte betalinger."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Status Indicator */}
          <Card className={issues?.hasIssues ? "border-destructive" : "border-primary"}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {issues?.hasIssues ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Status: PROBLEM
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Status: ALT OK
                    </>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {stripeMode && (
                    <Badge variant={stripeMode.is_test_mode ? "outline" : "default"} className={stripeMode.is_test_mode ? "border-yellow-500 text-yellow-600" : ""}>
                      {stripeMode.is_test_mode ? "Sandkasse" : "Live"}
                    </Badge>
                  )}
                  {issues?.criticalIssues ? (
                    <Badge variant="destructive">
                      {issues.criticalIssues} kritiske problemer
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Stripe Sync Status */}
          {syncData && (
            <Card className={syncData.stats.missing_tickets > 0 ? "border-yellow-500" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {syncData.stats.missing_tickets > 0 ? (
                      <>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Stripe-synkronisering ({syncData.stats.mode === "test" ? "Sandkasse" : "Live"})
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Stripe-synkronisering ({syncData.stats.mode === "test" ? "Sandkasse" : "Live"})
                      </>
                    )}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchSync()}
                    disabled={syncLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncLoading ? "animate-spin" : ""}`} />
                    Oppdater
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Betalt i Stripe ({syncData.stats.mode}):</p>
                    <p className="font-medium">{syncData.stats.total_stripe_sessions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Billetter i database:</p>
                    <p className="font-medium">{syncData.stats.total_db_tickets}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mangler:</p>
                    <p className={`font-medium ${syncData.stats.missing_tickets > 0 ? "text-yellow-600" : ""}`}>
                      {syncData.stats.missing_tickets}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Synkronisert:</p>
                    <p className="font-medium">{syncData.stats.sync_percentage}%</p>
                  </div>
                </div>
                
                {syncData.missing_tickets && syncData.missing_tickets.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Manglende billetter:</p>
                    <div className="space-y-1">
                      {syncData.missing_tickets.slice(0, 5).map((ticket, idx) => (
                        <div key={idx} className="text-xs bg-muted p-2 rounded">
                          <p className="font-mono">{ticket.session_id.substring(0, 20)}...</p>
                          <p className="text-muted-foreground">
                            {ticket.customer_email} • {ticket.amount} {ticket.currency}
                          </p>
                        </div>
                      ))}
                      {syncData.missing_tickets.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          +{syncData.missing_tickets.length - 5} flere...
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Dette kan skyldes manglende webhooks fra Stripe. Sjekk webhook-konfigurasjonen i Stripe Dashboard.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Solgte billetter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats?.totalSold || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalCapacityLeft || 0} igjen av {stats?.totalCapacity || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Inntekt brutto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Netto: {formatCurrency(stats?.netRevenue || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Stripe-gebyrer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats?.totalFees || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalRevenue
                    ? Math.round(
                        (stats.totalFees / stats.totalRevenue) * 100
                      )
                    : 0}
                  % av brutto
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Sjekket inn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats?.checkedIn || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalSold
                    ? Math.round((stats.checkedIn / stats.totalSold) * 100)
                    : 0}
                  % av solgte
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sales by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Solgt per billettype</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.salesByType.map((type) => (
                  <div key={type.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{type.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {type.sold} solgt • {type.capacityLeft} igjen
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(type.revenue)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {Math.round(type.capacityPercent)}% kapasitet
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${Math.min(type.capacityPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Purchases */}
          <Card>
            <CardHeader>
              <CardTitle>Siste 10 kjøp</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tid</TableHead>
                    <TableHead>Navn</TableHead>
                    <TableHead>Billettype</TableHead>
                    <TableHead>Beløp</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.recentPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        {format(new Date(purchase.createdAt), "HH:mm", {
                          locale: nb,
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{purchase.buyerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {purchase.buyerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{purchase.ticketType}</TableCell>
                      <TableCell>{formatCurrency(purchase.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={purchase.checkedIn ? "default" : "secondary"}>
                          {purchase.checkedIn ? "Sjekket inn" : "Ikke sjekket inn"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ISSUES TAB */}
        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {issues?.hasIssues ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Avvik og feilmeldinger
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Ingen avvik funnet
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {issues?.hasIssues ? (
                <div className="space-y-6">
                  {issues.duplicateSessions.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-destructive flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Dobbel-registrering ({issues.duplicateSessions.length})
                      </h3>
                      <div className="space-y-2">
                        {issues.duplicateSessions.map((dup, idx) => (
                          <div key={idx} className="bg-destructive/10 rounded-lg p-3">
                            <p className="font-mono text-sm">
                              Session: {dup.sessionId}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {dup.count} billetter med samme session_id
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {issues.chargebacks.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Chargebacks ({issues.chargebacks.length})
                      </h3>
                      <div className="space-y-2">
                        {issues.chargebacks.map((ticket) => (
                          <div key={ticket.id} className="bg-destructive/10 rounded-lg p-3">
                            <p className="font-mono text-sm">
                              {ticket.ticket_code}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {ticket.buyer_email} •{" "}
                              {ticket.chargeback_at
                                ? format(
                                    new Date(ticket.chargeback_at),
                                    "dd.MM.yyyy HH:mm"
                                  )
                                : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {issues.refunded.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-yellow-600 flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Refunderte billetter ({issues.refunded.length})
                      </h3>
                      <div className="space-y-2">
                        {issues.refunded.map((ticket) => (
                          <div key={ticket.id} className="bg-yellow-500/10 rounded-lg p-3">
                            <p className="font-mono text-sm">
                              {ticket.ticket_code}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {ticket.buyer_email} •{" "}
                              {ticket.refunded_at
                                ? format(
                                    new Date(ticket.refunded_at),
                                    "dd.MM.yyyy HH:mm"
                                  )
                                : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {issues.paymentIssues.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-yellow-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Betalingsproblemer ({issues.paymentIssues.length})
                      </h3>
                      <div className="space-y-2">
                        {issues.paymentIssues.map((ticket) => (
                          <div key={ticket.id} className="bg-yellow-500/10 rounded-lg p-3">
                            <p className="font-mono text-sm">
                              {ticket.ticket_code}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Mangler payment_intent_id
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg">Ingen avvik funnet. Alt ser bra ut!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHECK-IN TAB */}
        <TabsContent value="checkin" className="space-y-4">
          {/* Live Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Inne nå
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-500">
                  {checkInStats?.checkedIn || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  av {checkInStats?.totalValid || 0} gyldige billetter
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Boilerroom: Inne
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-500">
                  {checkInStats?.boilerroomCheckedIn || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  av {checkInStats?.boilerroomAccess || 0} med tilgang
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Ikke sjekket inn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-muted-foreground">
                  {checkInStats?.notCheckedIn || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Søk billetter</CardTitle>
              <CardDescription>
                Søk på navn, e-post, billettkode eller order-id
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Søk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  <Search className="h-4 w-4 mr-2" />
                  Søk
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{ticket.buyer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {ticket.buyer_email}
                        </p>
                        <p className="font-mono text-sm">{ticket.ticket_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {ticket.ticket_types?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {ticket.checked_in_at ? (
                          <>
                            <Badge variant="default">Sjekket inn</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resetCheckIn.mutate(ticket.id)}
                              disabled={resetCheckIn.isPending}
                            >
                              Nullstill
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => markAsUsed.mutate(ticket.id)}
                            disabled={markAsUsed.isPending}
                          >
                            Marker som brukt
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPORT TAB */}
        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle>Eksport og oppgjør</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Oppgjør</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Brutto inntekt:</span>
                    <span className="font-mono">
                      {formatCurrency(stats?.totalRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Stripe-gebyrer:</span>
                    <span className="font-mono">
                      -{formatCurrency(stats?.totalFees || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Netto inntekt:</span>
                    <span>{formatCurrency(stats?.netRevenue || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Refunds og chargebacks</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Refunderte billetter:</span>
                    <span className="font-mono">
                      {issues?.refunded.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chargebacks:</span>
                    <span className="font-mono text-destructive">
                      {issues?.chargebacks.length || 0}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => exportCSV.mutate()}
                disabled={exportCSV.isPending}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Eksporter alle billetter som CSV
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
