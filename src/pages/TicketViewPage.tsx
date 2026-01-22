import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, MapPin, Download } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export default function TicketViewPage() {
  const { ticketCode } = useParams<{ ticketCode: string }>();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["ticket-public", ticketCode],
    queryFn: async () => {
      const res = await fetch(`https://nxgotyhhjtwikdcjdxxn.supabase.co/functions/v1/get-ticket-public?code=${ticketCode}`);
      if (!res.ok) throw new Error("Billett ikke funnet");
      return res.json();
    },
    enabled: !!ticketCode,
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error || !ticket) return <div className="p-8 text-center">Billett ikke funnet</div>;

  const ticketUrl = `${window.location.origin}/t/${ticket.ticketCode}`;

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="max-w-sm w-full">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">{ticket.eventName}</CardTitle>
          <p className="text-muted-foreground">{ticket.ticketType}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white p-4 rounded-lg flex justify-center">
            <QRCodeSVG value={ticketUrl} size={200} />
          </div>
          <p className="text-center font-mono text-lg">{ticket.ticketCode}</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{ticket.startsAt && format(new Date(ticket.startsAt), "PPP 'kl' HH:mm", { locale: nb })}</div>
            {ticket.venueName && <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{ticket.venueName}</div>}
          </div>
          <p className="text-center text-muted-foreground">{ticket.buyerName}</p>
          <Button variant="outline" className="w-full" onClick={() => navigator.clipboard.writeText(ticketUrl)}>
            <Download className="mr-2 w-4 h-4" />Kopier lenke
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
