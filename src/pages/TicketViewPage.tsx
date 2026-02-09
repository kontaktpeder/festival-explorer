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
        scale: 4,
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

          {/* Top gradient overlay for header text */}
          <div
            className="absolute inset-x-0 top-0 h-32 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)' }}
          />
          {/* Bottom gradient overlay for info text */}
          <div
            className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }}
          />

          <div className="relative z-10 p-7 flex flex-col items-center">
            {/* === POSTER TOP — visual identity === */}
            <div className="text-center mb-5 space-y-2">
              <img
                src={giggenLogo}
                alt="GIGGEN"
                className="h-10 mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
              />
              <p className="text-lg font-semibold text-white tracking-[0.15em] uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                Festival for én kveld · 2026
              </p>
            </div>

            {/* === QR CODE — premium === */}
            <div
              className="p-4 rounded-xl mx-auto"
              style={{
                background: 'white',
                boxShadow: '0 6px 24px rgba(0,0,0,0.2), 0 0 0 2.5px hsl(24 100% 55% / 0.35)',
              }}
            >
              <QRCodeSVG
                value={`${window.location.origin}/t/${ticket.ticketCode}`}
                size={160}
                level="M"
              />
            </div>

            {/* === TICKET CODE — serial number pill === */}
            <div className="mt-5 mb-4">
              <div
                className="inline-block px-5 py-2 rounded-full"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid hsl(24 100% 55% / 0.35)',
                }}
              >
                <p className="font-mono text-base font-bold text-white tracking-[0.25em]">
                  {ticket.ticketCode}
                </p>
              </div>
            </div>

            {/* === EVENT INFO — larger, high contrast === */}
            <div className="w-full space-y-2.5">
              <div className="flex items-center gap-2.5 text-white font-semibold text-base drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
                <Calendar className="w-5 h-5 text-accent flex-shrink-0" />
                {eventDate}
              </div>
              <div className="flex items-center gap-2.5 text-white font-semibold text-base drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
                <MapPin className="w-5 h-5 text-accent flex-shrink-0" />
                {venueName}
              </div>
            </div>

            {/* === BOTTOM — type + name in one clean line === */}
            <div className="mt-5 pt-3 border-t border-white/15 w-full flex items-center justify-between">
              <p className="text-white/80 text-sm font-medium">{ticket.buyerName}</p>
              <p className="text-accent text-sm font-semibold uppercase tracking-wider">{ticket.ticketType}</p>
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
