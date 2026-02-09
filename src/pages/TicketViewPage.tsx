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
        <Card
          ref={ticketRef}
          className="border-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${ticketBgBlue})` }}
        >
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-foreground">{festivalName}</CardTitle>
            <p className="text-muted-foreground">{ticket.ticketType}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg flex justify-center">
              <QRCodeSVG value={`${window.location.origin}/t/${ticket.ticketCode}`} size={200} />
            </div>
            <p className="text-center font-mono text-lg text-foreground">{ticket.ticketCode}</p>
            <div className="space-y-2 text-sm text-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {eventDate}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {venueName}
              </div>
            </div>
            <p className="text-center text-muted-foreground">{ticket.buyerName}</p>
          </CardContent>
        </Card>
        
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
            {linkCopied ? (
              <>
                <Check className="mr-2 w-4 h-4" />Lenke kopiert
              </>
            ) : (
              <>
                <Download className="mr-2 w-4 h-4" />Kopier lenke
              </>
            )}
          </Button>
          <Button variant="default" className="flex-1" onClick={handleSaveToGallery}>
            <Save className="mr-2 w-4 h-4" />Last ned billett
          </Button>
        </div>
        
        <Button variant="outline" className="w-full" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Tilbake til forsiden
          </Link>
        </Button>
      </div>
    </div>
  );
}
