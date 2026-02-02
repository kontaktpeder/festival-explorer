import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, QrCode, Download, Loader2, AlertCircle, CheckCircle, Camera, X, User, Mail, Clock, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface CheckInResult {
  success: boolean;
  result: 'success' | 'already_used' | 'invalid' | 'refunded' | 'wrong_event' | 'error';
  ticketCode: string;
  buyerName?: string;
  buyerEmail?: string;
  ticketType?: string;
  ticketDescription?: string;
  eventName?: string;
  hasBoilerroomAccess?: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  checkedInByName?: string;
  attendanceCount?: number;
  boilerroomAttendanceCount?: number;
  refundedAt?: string;
  chargebackAt?: string;
  error?: string;
}

interface TicketSearchResult {
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
  const [searchResults, setSearchResults] = useState<TicketSearchResult[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }
    };
  }, []);

  // Format ticket code automatically (add dashes if missing)
  const formatTicketCode = useCallback((input: string): string => {
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
  }, []);

  const showResultScreen = useCallback((result: CheckInResult) => {
    // Ensure we always have a valid result
    if (!result || typeof result !== 'object') {
      console.error("Invalid result passed to showResultScreen:", result);
      return;
    }

    // Ensure result has required fields
    const validResult: CheckInResult = {
      success: result.success ?? false,
      result: result.result || 'error',
      ticketCode: result.ticketCode || '',
      error: result.error,
      ...result,
    };

    setCheckInResult(validResult);
    setShowResult(true);
    
    // Clear any existing timeout (no auto-reset - user must click to dismiss)
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = null;
    }
  }, []);

  const checkInMutation = useMutation({
    mutationFn: async ({ code, method = "manual" }: { code: string; method?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      let response: Response;
      try {
        response = await fetch(
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
      } catch (networkError) {
        // Network error - throw to be caught by onError
        throw new Error("Nettverksfeil. Sjekk internettforbindelsen.");
      }

      // Always try to parse JSON, regardless of status code
      let data: CheckInResult;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error("Tom respons fra server");
        }
        data = JSON.parse(text);
      } catch (parseError) {
        // If JSON parsing fails, create a generic error result
        throw new Error("Kunne ikke lese respons fra server");
      }

      // The API always returns a CheckInResult structure, even for errors (400, 404, etc.)
      // We want to return this data so onSuccess can handle it and show the red screen
      if (data && typeof data === 'object' && 'result' in data) {
        return data as CheckInResult;
      }

      // If data doesn't have the expected structure, create an error result
      return {
        success: false,
        result: "error",
        ticketCode: code,
        error: data?.error || "Uventet feil fra server",
      } as CheckInResult;
    },
    onSuccess: (data) => {
      // CRITICAL: Always show result - success or failure (already_used, refunded, etc.)
      // This ensures the red screen is ALWAYS shown for already_used tickets
      console.log("Check-in result:", data);
      showResultScreen(data);
      
      if (data.success) {
        toast.success("Billett sjekket inn!");
      } else {
        // Show toast for non-success results
        toast.error(data.error || "Kunne ikke sjekke inn billetten");
      }
      setTicketCode("");
      setSearchResults([]);
      setIsProcessingScan(false);
    },
    onError: (error: Error) => {
      console.error("Check-in error:", error);
      toast.error(error.message);
      setIsProcessingScan(false);
      // Show error result overlay - this should be red
      showResultScreen({
        success: false,
        result: "error",
        ticketCode: ticketCode || "",
        error: error.message,
      });
    },
  });

  // Start scanner when showScanner becomes true
  useEffect(() => {
    if (showScanner && isStaff && !isProcessingScan) {
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
            async (decodedText) => {
              // Prevent double-scanning while processing
              if (isProcessingScan || checkInMutation.isPending) {
                return;
              }
              setIsProcessingScan(true);
              
              // Extract ticket code from URL if it's a full URL
              let code = decodedText;
              if (decodedText.includes("/t/")) {
                code = decodedText.split("/t/")[1]?.split("?")[0] || decodedText;
              } else if (decodedText.includes("/v/")) {
                code = decodedText.split("/v/")[1]?.split("?")[0] || decodedText;
              }
              
              // Stop and cleanup scanner first
              try {
                await html5QrCode.stop();
                html5QrCode.clear();
                scannerRef.current = null;
              } catch (stopError) {
                console.error("Error stopping scanner:", stopError);
              }
              
              // Close scanner view immediately to show main view
              setShowScanner(false);
              setScannerError(null);
              
              // Auto-format and check in
              const formattedCode = formatTicketCode(code);
              if (formattedCode.match(/^GIGG-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
                checkInMutation.mutate({ code: formattedCode, method: "qr" });
              } else {
                toast.error("Ugyldig billettkode format");
                setIsProcessingScan(false);
              }
            },
            () => {
              // Ignore scanning errors (they happen continuously while scanning)
            }
          );
        } catch (err) {
          setScannerError("Kunne ikke starte kamera. Sjekk at du har gitt tillatelse.");
          console.error("Scanner error:", err);
          setIsProcessingScan(false);
        }
      };
      
      startScanner();
    }

    // Cleanup scanner when component unmounts or showScanner becomes false
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        try {
          scannerRef.current.clear();
        } catch (e) {
          // Ignore clear errors
        }
        scannerRef.current = null;
      }
    };
  }, [showScanner, isStaff, isProcessingScan, formatTicketCode, checkInMutation]);

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
      try {
        scannerRef.current.clear();
      } catch (e) {
        // Ignore clear errors
      }
      scannerRef.current = null;
    }
    setShowScanner(false);
    setScannerError(null);
    setIsProcessingScan(false);
  };

  const handleDismissResult = () => {
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }
    setShowResult(false);
    setCheckInResult(null);
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

  const statusColors: Record<string, string> = {
    VALID: "bg-accent",
    USED: "bg-destructive",
    CANCELLED: "bg-muted",
  };

  return (
    <>
      {/* Main view - always rendered */}
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
                disabled={showScanner || isProcessingScan}
              >
                <Camera className="w-5 h-5" />
                {showScanner ? "Scanner aktiv..." : "Åpne QR-scanner"}
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

      {/* Scanner overlay */}
      {showScanner && (
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
      )}

      {/* Result overlay - highest z-index */}
      {showResult && checkInResult && (
        <div 
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 ${
            checkInResult.success 
              ? 'bg-green-600' 
              : 'bg-red-600'
          }`}
          onClick={handleDismissResult}
        >
          <div className="text-white text-center space-y-6 max-w-md w-full">
            {checkInResult.success ? (
              <>
                <CheckCircle className="h-24 w-24 mx-auto animate-in zoom-in duration-300" />
                <h1 className="text-4xl font-bold">Godkjent!</h1>
                
                <div className="bg-white/20 rounded-xl p-4 space-y-2">
                  <p className="text-xl font-semibold">{checkInResult.ticketType}</p>
                  {checkInResult.hasBoilerroomAccess && (
                    <Badge className="bg-white/30 text-white border-white/50">
                      <PartyPopper className="h-4 w-4 mr-1" />
                      Gir tilgang til Boilerroom
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-left bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{checkInResult.buyerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm opacity-90">{checkInResult.buyerEmail}</span>
                  </div>
                </div>

                <div className="text-2xl font-bold bg-white/20 rounded-lg py-3 px-6 inline-block">
                  Inne nå: {checkInResult.attendanceCount}
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-24 w-24 mx-auto animate-in zoom-in duration-300" />
                <h1 className="text-3xl font-bold">
                  {checkInResult.result === 'already_used' && 'Allerede brukt'}
                  {checkInResult.result === 'refunded' && 'Refundert'}
                  {checkInResult.result === 'invalid' && 'Ugyldig billett'}
                  {checkInResult.result === 'wrong_event' && 'Feil event'}
                  {checkInResult.result === 'error' && 'Feil'}
                </h1>

                <div className="bg-white/10 rounded-lg p-4 space-y-3 text-left">
                  <p className="font-mono text-lg">{checkInResult.ticketCode}</p>
                  
                  {checkInResult.buyerName && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{checkInResult.buyerName}</span>
                    </div>
                  )}

                  {checkInResult.result === 'already_used' && checkInResult.checkedInAt && (
                    <div className="space-y-2 pt-2 border-t border-white/20">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          Sjekket inn: {format(new Date(checkInResult.checkedInAt), "dd.MM.yyyy 'kl.' HH:mm", { locale: nb })}
                        </span>
                      </div>
                      {checkInResult.checkedInByName && (
                        <p className="text-sm opacity-80">
                          Av: {checkInResult.checkedInByName}
                        </p>
                      )}
                    </div>
                  )}

                  {checkInResult.result === 'refunded' && checkInResult.refundedAt && (
                    <div className="pt-2 border-t border-white/20">
                      <p className="text-sm">
                        Refundert: {format(new Date(checkInResult.refundedAt), "dd.MM.yyyy 'kl.' HH:mm", { locale: nb })}
                      </p>
                    </div>
                  )}

                  {checkInResult.error && (
                    <p className="text-sm opacity-80">{checkInResult.error}</p>
                  )}
                </div>
              </>
            )}

            <p className="text-sm opacity-70">Trykk hvor som helst for å fortsette</p>
          </div>
        </div>
      )}
    </>
  );
}
