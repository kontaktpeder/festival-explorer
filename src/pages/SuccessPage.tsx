import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, Ticket } from "lucide-react";

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [ticket, setTicket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    const fetchTicket = async () => {
      try {
        const res = await fetch(`https://nxgotyhhjtwikdcjdxxn.supabase.co/functions/v1/get-ticket-by-session?session_id=${sessionId}`);
        const json = await res.json();
        if (res.ok) setTicket(json);
        else if (retries < 5) setTimeout(() => setRetries(r => r + 1), 2000);
        else setError(json.error || "Kunne ikke hente billett");
      } catch {
        if (retries < 5) setTimeout(() => setRetries(r => r + 1), 2000);
        else setError("Nettverksfeil – kunne ikke hente billett");
      }
    };
    fetchTicket();
  }, [sessionId, retries]);

  if (!sessionId) return <div className="p-8 text-center">Ugyldig forespørsel</div>;
  if (error) return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-red-500 font-semibold">{error}</p>
          <p className="text-sm text-muted-foreground">
            Hvis du har fått kvittering fra Stripe/banken: ta kontakt med arrangør med navnet og e-posten du brukte ved kjøp.
          </p>
          <Link to="/tickets">
            <Button variant="outline" className="w-full">Tilbake til billetter</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
  if (!ticket) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /> Henter billett...</div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <CardTitle>Betaling fullført!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-lg font-mono bg-muted p-3 rounded">{ticket.ticketCode}</p>
          <p><strong>{ticket.eventName}</strong></p>
          <p>{ticket.ticketType}</p>
          <Link to={`/t/${ticket.ticketCode}`}>
            <Button className="w-full"><Ticket className="mr-2" />Se billett</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
