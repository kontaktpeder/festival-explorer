import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, QrCode, Download, Loader2, AlertCircle, CheckCircle, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";

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
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
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

  // Format ticket code automatically (add dashes if missing)
  const formatTicketCode = (input: string): string => {
    let cleaned = input.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (cleaned.startsWith('GIGG')) {
      cleaned = cleaned.substring(4);
    }
    
    if (cleaned.length >= 8) {
      return `GIGG-${cleaned.substring(0, 4)}-${cleaned.substring(4, 8)}`;
    } else if (cleaned.length >= 4) {
      return `GIGG-${cleaned.substring(0, 4)}-${cleaned.substring(4)}`;
    } else if (cleaned.length > 0) {
      return `GIGG-${cleaned}`;
    }
    return cleaned;
  };

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

  // Start scanner when showScanner becomes true
  useEffect(() => {
    if (showScanner && isStaff) {
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode("qr-reader");
          scannerRef.current = html5QrCode;
          
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              // Extract ticket code from URL if it's a full URL
              let code = decodedText;
              if (decodedText.includes("/t/")) {
                code = decodedText.split("/t/")[1]?.split("?")[0] || decodedText;
              } else if (decodedText.includes("/v/")) {
                code = decodedText.split("/v/")[1]?.split("?")[0] || decodedText;
              }
              
              // Stop scanner and check in
              html5QrCode.stop().then(() => {
                setShowScanner(false);
                setTicketCode(code);
                // Auto-format and check in
                const formattedCode = formatTicketCode(code);
                if (formattedCode.match(/^GIGG-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
                  checkInMutation.mutate({ code: formattedCode, method: "qr" });
                } else {
                  toast.error("Ugyldig billettkode format");
                }
              }).catch(() => {
                setShowScanner(false);
              });
            },
            () => {
              // Ignore scanning errors (they happen continuously while scanning)
            }
          );
        } catch (err) {
          setScannerError("Kunne ikke starte kamera. Sjekk at du har gitt tillatelse.");
          console.error("Scanner error:", err);
        }
      };
      
      startScanner();
    }

    // Cleanup scanner when component unmounts or showScanner becomes false
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [showScanner, isStaff]);

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

  const handleTicketCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicketCode(e.target.value.toUpperCase());
  };

  const handleTicketCodeBlur = () => {
    if (ticketCode.trim()) {
      setTicketCode(formatTicketCode(ticketCode));
    }
  };

  const handleCheckIn = () => {
    if (!ticketCode.trim()) {
      toast.error("Skriv inn ticket code");
      return;
    }
    const formattedCode = formatTicketCode(ticketCode);
    if (!formattedCode.match(/^GIGG-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
      toast.error("Ugyldig format. Forventet: GIGG-XXXX-XXXX");
      return;
    }
    checkInMutation.mutate({ code: formattedCode, method: "manual" });
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

  const handleCloseScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setShowScanner(false);
    setScannerError(null);
  };

  if (isStaff === null) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
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

  // Show scanner view
  if (showScanner) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
          <h2 className="text-white text-lg font-semibold">Scan QR-kode</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseScanner}
            className="text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center h-full">
          <div id="qr-reader" className="w-full max-w-md" />
          {scannerError && (
            <p className="text-destructive text-center text-sm mt-4 px-4">{scannerError}</p>
          )}
          <p className="text-white/70 text-sm mt-4">
            Hold QR-koden foran kameraet
          </p>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    VALID: "bg-accent",
    USED: "bg-destructive",
    CANCELLED: "bg-muted",
  };

  return (
    <div className="min-h-screen bg-background pb-safe-bottom">
      {/* Mobile-optimized header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 safe-top">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Check-in</h1>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* QR Scanner CTA */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <Button
              onClick={() => setShowScanner(true)}
              className="w-full h-14 text-base gap-3"
              size="lg"
            >
              <Camera className="w-5 h-5" />
              Åpne QR-scanner
            </Button>
          </CardContent>
        </Card>

        {/* Manual Entry */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="w-4 h-4" /> Manuell innsjekking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="GIGG-XXXX-XXXX"
                value={ticketCode}
                onChange={handleTicketCodeChange}
                onBlur={handleTicketCodeBlur}
                onKeyDown={(e) => e.key === "Enter" && handleCheckIn()}
                className="font-mono text-base h-12"
              />
              <Button 
                onClick={handleCheckIn} 
                disabled={checkInMutation.isPending}
                size="lg"
                className="h-12 px-6"
              >
                {checkInMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CheckCircle />
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Skriv inn billettkoden. Format legges til automatisk.
            </p>

            {checkInMutation.isError && (
              <p className="text-sm text-destructive flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {(checkInMutation.error as Error).message}
              </p>
            )}
            {checkInMutation.isSuccess && (
              <p className="text-sm text-accent flex items-center gap-2 p-3 bg-accent/10 rounded-lg">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Billett sjekket inn!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" /> Søk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Navn, e-post eller kode"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-12 text-base"
              />
              <Button 
                onClick={handleSearch} 
                disabled={searchMutation.isPending}
                size="lg"
                className="h-12 px-6"
              >
                {searchMutation.isPending ? <Loader2 className="animate-spin" /> : <Search />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results - Touch-friendly list */}
        {searchResults.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Resultater ({searchResults.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {searchResults.map((ticket) => (
                  <div
                    key={ticket.ticketCode}
                    className="flex items-center justify-between p-4 active:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/v/${ticket.ticketCode}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{ticket.buyerName}</p>
                      <p className="text-sm font-mono text-muted-foreground">{ticket.ticketCode}</p>
                      <p className="text-xs text-muted-foreground">{ticket.ticketType}</p>
                    </div>
                    <Badge className={`${statusColors[ticket.status]} text-white ml-3 flex-shrink-0`}>
                      {ticket.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
