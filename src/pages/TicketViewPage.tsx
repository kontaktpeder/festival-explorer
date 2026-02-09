import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, MapPin, Download, Save, Check, ArrowLeft } from "lucide-react";
import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import ticketBgBlue from "@/assets/ticket-bg-blue.jpeg";
import giggenLogo from "@/assets/giggen-logo-final.png";
import gIcon from "@/assets/giggen-g-icon.png";

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
        scale: 3,
        useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `giggen-billett-${ticket?.ticketCode || 'ticket'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (err) {
      console.error("Error saving ticket:", err);
      toast({ title: "Feil", description: "Kunne ikke lagre billetten.", variant: "destructive" });
    }
  };

  const handleCopyLink = async () => {
    const ticketUrl = `${window.location.origin}/t/${ticket?.ticketCode}`;
    try {
      await navigator.clipboard.writeText(ticketUrl);
      setLinkCopied(true);
      toast({ title: "Lenke kopiert", description: "Billettlenken er kopiert til utklippstavlen" });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ title: "Feil", description: "Kunne ikke kopiere lenken.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error || !ticket) return <div className="p-8 text-center">Billett ikke funnet</div>;

  const eventDate = "14. mars 2026 · kl 17:00";
  const venueName = "Josefines Vertshus";

  return (
    <div className="min-h-screen p-4 flex items-center justify-center bg-background">
      <div className="max-w-sm w-full space-y-4">
        {/* === THE TICKET — poster-first design === */}
        <div
          ref={ticketRef}
          className="relative rounded-2xl overflow-hidden bg-cover bg-center"
          style={{
            backgroundImage: `url(${ticketBgBlue})`,
            border: '2px solid hsl(24 100% 55% / 0.4)',
            boxShadow: '0 0 60px rgba(234,125,40,0.12), 0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {/* Watermark G icon */}
          <img
            src={gIcon}
            alt=""
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] opacity-[0.06] pointer-events-none select-none"
          />

          <div className="relative z-10 p-7 flex flex-col items-center">
            {/* === POSTER TOP — visual identity === */}
            <div className="text-center mb-6 space-y-3">
              <img
                src={giggenLogo}
                alt="GIGGEN"
                className="h-10 mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
              />
              <p className="text-white/70 text-sm font-medium tracking-[0.2em] uppercase">
                Festival for én kveld · 2026
              </p>
            </div>

            {/* === QR CODE — premium, smaller === */}
            <div
              className="p-3 rounded-xl mx-auto"
              style={{
                background: 'white',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15), 0 0 0 2px hsl(24 100% 55% / 0.3)',
              }}
            >
              <QRCodeSVG
                value={`${window.location.origin}/t/${ticket.ticketCode}`}
                size={160}
                level="M"
              />
            </div>

            {/* === TICKET CODE — serial number feel === */}
            <div className="mt-5 mb-4">
              <div
                className="inline-block px-5 py-1.5 rounded-full"
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid hsl(24 100% 55% / 0.3)',
                }}
              >
                <p className="font-mono text-base font-bold text-white tracking-[0.25em]">
                  {ticket.ticketCode}
                </p>
              </div>
            </div>

            {/* === EVENT INFO === */}
            <div className="w-full space-y-2 text-sm">
              <div className="flex items-center gap-2.5 text-white/90 font-medium">
                <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
                {eventDate}
              </div>
              <div className="flex items-center gap-2.5 text-white/90 font-medium">
                <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
                {venueName}
              </div>
            </div>

            {/* === BOTTOM — name + type === */}
            <div className="mt-5 pt-4 border-t border-white/10 w-full flex items-center justify-between">
              <p className="text-white/70 text-sm">{ticket.buyerName}</p>
              <p className="text-accent/60 text-xs font-medium uppercase tracking-wider">{ticket.ticketType}</p>
            </div>
          </div>
        </div>

        {/* === ACTION BUTTONS === */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-accent/30 text-accent hover:bg-accent/10" onClick={handleCopyLink}>
            {linkCopied ? (
              <><Check className="mr-2 w-4 h-4" />Kopiert</>
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
