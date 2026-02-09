import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, MapPin, Download, Save, Check, ArrowLeft } from "lucide-react";
import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import ticketBgBlue from "@/assets/ticket-bg-blue.jpeg";

export default function TicketViewPage() {
  const { ticketCode } = useParams<{ ticketCode: string }>();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["ticket-public", ticketCode],
    queryFn: async () => {
      const res = await fetch(`https://nxgotyhhjtwikdcjdxxn.supabase.co/functions/v1/get-ticket-public?code=${ticketCode}`);
      if (!res.ok) throw new Error("Billett ikke funnet");
      return res.json();
    },
    enabled: !!ticketCode,
  });

  const handleSaveToGallery = async () => {
    if (!ticketRef.current) return;
    
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        // Try direct download first
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `giggen-billett-${ticket?.ticketCode || 'ticket'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (error) {
      console.error("Error saving ticket:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke lagre billetten. Prøv igjen.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    const ticketUrl = `${window.location.origin}/t/${ticket?.ticketCode}`;
    try {
      await navigator.clipboard.writeText(ticketUrl);
      setLinkCopied(true);
      toast({
        title: "Lenke kopiert",
        description: "Billettlenken er kopiert til utklippstavlen",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke kopiere lenken. Prøv igjen.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error || !ticket) return <div className="p-8 text-center">Billett ikke funnet</div>;

  // Hardcoded values
  const festivalName = "GIGGEN - festival for en kveld 2026";
  const eventDate = "14. mars 2026 kl 17";
  const venueName = "Josefines Vertshus";

  return (
    <div className="min-h-screen p-4 flex items-center justify-center bg-background">
      <div className="max-w-sm w-full space-y-4">
        <div
          ref={ticketRef}
          className="rounded-2xl overflow-hidden bg-cover bg-center shadow-[0_0_40px_rgba(234,125,40,0.15)]"
          style={{ backgroundImage: `url(${ticketBgBlue})` }}
        >
          {/* Semi-transparent overlay for readability */}
          <div className="backdrop-blur-[2px] bg-black/20 p-6 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-accent tracking-wide">{festivalName}</h2>
              <p className="text-sm text-accent/70 font-medium">{ticket.ticketType}</p>
            </div>

            <div className="bg-white p-4 rounded-xl flex justify-center mx-auto w-fit">
              <QRCodeSVG value={`${window.location.origin}/t/${ticket.ticketCode}`} size={200} />
            </div>

            <p className="text-center font-mono text-lg font-bold text-white tracking-widest">
              {ticket.ticketCode}
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-white/90">
                <Calendar className="w-4 h-4 text-accent" />
                {eventDate}
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <MapPin className="w-4 h-4 text-accent" />
                {venueName}
              </div>
            </div>

            <p className="text-center text-white/60 text-sm">{ticket.buyerName}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-accent/30 text-accent hover:bg-accent/10" onClick={handleCopyLink}>
            {linkCopied ? (
              <><Check className="mr-2 w-4 h-4" />Lenke kopiert</>
            ) : (
              <><Download className="mr-2 w-4 h-4" />Kopier lenke</>
            )}
          </Button>
          <Button className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold" onClick={handleSaveToGallery}>
            <Save className="mr-2 w-4 h-4" />Last ned billett
          </Button>
        </div>
        
        <Button variant="ghost" className="w-full text-muted-foreground hover:text-accent" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Tilbake til forsiden
          </Link>
        </Button>
      </div>
    </div>
  );
}
