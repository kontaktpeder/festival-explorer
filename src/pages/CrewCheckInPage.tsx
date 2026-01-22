import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, QrCode, Download, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface TicketResult {
  ticketCode: string;
  status: string;
  buyerName: string;
  buyerEmail: string;
  ticketType: string;
  eventName: string;
}

export default function CrewCheckInPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketCode, setTicketCode] = useState("");
  const [searchResults, setSearchResults] = useState<TicketResult[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: staffRole } = await supabase
          .from("staff_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        setIsAdmin(staffRole?.role === "admin");
        setIsStaff(!!staffRole);
      } else {
        setIsStaff(false);
      }
    };
    checkRole();
  }, []);

  const checkInMutation = useMutation({
    mutationFn: async ({ code, method = "manual" }: { code: string; method?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://nxgotyhhjtwikdcjdxxn.supabase.co/functions/v1/checkin-ticket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ticketCode: code, method }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to check in");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Billett sjekket inn!");
      setTicketCode("");
      setSearchResults([]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://nxgotyhhjtwikdcjdxxn.supabase.co/functions/v1/search-tickets?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to search");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data.tickets || []);
      if (data.tickets?.length === 0) toast.info("Ingen billetter funnet");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCheckIn = () => {
    if (!ticketCode.trim()) {
      toast.error("Skriv inn ticket code");
      return;
    }
    checkInMutation.mutate({ code: ticketCode.toUpperCase() });
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("Skriv inn søkeord");
      return;
    }
    searchMutation.mutate(searchQuery);
  };

  const handleExportCSV = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Ikke autentisert");
      return;
    }

    try {
      const response = await fetch(
        `https://nxgotyhhjtwikdcjdxxn.supabase.co/functions/v1/export-tickets-csv`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (!response.ok) throw new Error("Failed to export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("CSV eksportert");
    } catch {
      toast.error("Kunne ikke eksportere CSV");
    }
  };

  if (isStaff === null) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-6 space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">Krever innlogging</h2>
            <p className="text-muted-foreground">Du må ha crew- eller admin-tilgang.</p>
            <Button onClick={() => navigate("/admin/login")}>Logg inn</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    VALID: "bg-green-500",
    USED: "bg-destructive",
    CANCELLED: "bg-muted",
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Check-in</h1>
          {isAdmin && (
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" /> Eksporter CSV
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Manual Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" /> Skriv kode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="GIGG-XXXX-XXXX"
                  value={ticketCode}
                  onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleCheckIn()}
                  className="font-mono"
                />
                <Button onClick={handleCheckIn} disabled={checkInMutation.isPending}>
                  {checkInMutation.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                </Button>
              </div>

              {checkInMutation.isError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {(checkInMutation.error as Error).message}
                </p>
              )}
              {checkInMutation.isSuccess && (
                <p className="text-sm text-green-600">✓ Billett sjekket inn!</p>
              )}
            </CardContent>
          </Card>

          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" /> Søk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Navn, e-post eller kode"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                  {searchMutation.isPending ? <Loader2 className="animate-spin" /> : <Search />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Søkeresultater ({searchResults.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {searchResults.map((ticket) => (
                <div
                  key={ticket.ticketCode}
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/v/${ticket.ticketCode}`)}
                >
                  <div>
                    <p className="font-medium">{ticket.buyerName}</p>
                    <p className="text-sm font-mono text-muted-foreground">{ticket.ticketCode}</p>
                    <p className="text-xs text-muted-foreground">{ticket.ticketType}</p>
                  </div>
                  <Badge className={`${statusColors[ticket.status]} text-white`}>
                    {ticket.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
