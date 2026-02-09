import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { TICKET_SALES_ENABLED } from "@/lib/ticket-config";

interface TicketTypeWithCount {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_nok: number;
  capacity: number;
  visible: boolean;
  issued: number;
}

export default function TicketsPage() {
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: ticketTypes, isLoading: typesLoading } = useQuery({
    queryKey: ["ticket-types-with-counts"],
    queryFn: async () => {
      // Get visible ticket types
      const { data: types, error } = await supabase
        .from("ticket_types")
        .select("id, code, name, description, price_nok, capacity, visible")
        .eq("visible", true)
        .order("sort_order");
      if (error) throw error;

      // Get issued count per type
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("ticket_type_id")
        .neq("status", "CANCELLED");
      if (ticketsError) throw ticketsError;

      const countByType = new Map<string, number>();
      tickets?.forEach((t) => {
        countByType.set(t.ticket_type_id, (countByType.get(t.ticket_type_id) || 0) + 1);
      });

      return (types || []).map((t) => ({
        ...t,
        issued: countByType.get(t.id) || 0,
      })) as TicketTypeWithCount[];
    },
  });

  const handlePurchase = async () => {
    if (!TICKET_SALES_ENABLED) {
      toast.error("Billettsalg er midlertidig stengt");
      return;
    }
    if (!selectedType || !buyerName || !buyerEmail) {
      toast.error("Fyll ut alle feltene");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { ticketTypeId: selectedType, buyerName, buyerEmail },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      toast.error("Kunne ikke starte betaling");
    } finally {
      setIsLoading(false);
    }
  };

  if (typesLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  // Helper function to replace DJ/Afterparty with BOILER ROOM
  const formatTicketText = (text: string | null) => {
    if (!text) return "";
    return text
      .replace(/DJ/gi, "BOILER ROOM")
      .replace(/Afterparty/gi, "BOILER ROOM")
      .replace(/afterparty/gi, "BOILER ROOM");
  };

  // Group: festival passes vs boiler room only
  const festivalPassCodes = ["FEST_EARLYBIRD", "FEST_STEP2", "FEST_STEP3"];
  const festivalPasses = (ticketTypes || []).filter((t) => festivalPassCodes.includes(t.code));
  const boilerOnly = (ticketTypes || []).filter((t) => t.code === "DJ_ONLY");

  const renderTicketCard = (type: TicketTypeWithCount) => {
    const soldOut = type.issued >= type.capacity;
    const remaining = type.capacity - type.issued;

    return (
      <div
        key={type.id}
        className={`ticket-card rounded-lg ${soldOut ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${selectedType === type.id ? "selected" : ""}`}
        onClick={() => !soldOut && setSelectedType(type.id)}
      >
        <div className="flex items-center justify-between p-4">
          <div className="space-y-0.5">
            <p className="text-base font-semibold text-foreground">{formatTicketText(type.name)}</p>
            <p className="text-xs text-muted-foreground">{formatTicketText(type.description)}</p>
            {soldOut ? (
              <p className="text-xs font-semibold text-destructive">Utsolgt</p>
            ) : remaining <= 20 ? (
              <p className="text-xs font-semibold text-accent">{remaining} igjen</p>
            ) : null}
          </div>
          <p className="text-lg font-bold whitespace-nowrap ml-4 text-accent">{(type.price_nok / 100).toFixed(0)} kr</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Ticket className="w-10 h-10 mx-auto text-accent opacity-80" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Kjøp billetter</h1>
        </div>

        {/* Festival passes */}
        {festivalPasses.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Festivalpass (konserter + BOILER ROOM)</h2>
            {festivalPasses.map(renderTicketCard)}
          </div>
        )}

        {/* Boiler Room only */}
        {boilerOnly.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Kun BOILER ROOM</h2>
            {boilerOnly.map(renderTicketCard)}
          </div>
        )}

        {selectedType && (
          <div className="ticket-card rounded-lg">
            <div className="p-4 space-y-3">
              <p className="text-sm font-medium">Din informasjon</p>
              <Input placeholder="Navn" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} disabled={!TICKET_SALES_ENABLED} className="h-9 bg-background/50 border-border/50" />
              <Input type="email" placeholder="E-post" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} disabled={!TICKET_SALES_ENABLED} className="h-9 bg-background/50 border-border/50" />
              <p className="text-xs text-muted-foreground">
                Ved å fortsette godtar du våre{" "}
                <Link to="/vilkar" className="underline hover:text-foreground transition-colors">vilkår</Link>
                {" "}og{" "}
                <Link to="/personvern" className="underline hover:text-foreground transition-colors">personvernerklæring</Link>
              </p>
              <Button className="w-full h-10 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold" onClick={handlePurchase} disabled={isLoading || !TICKET_SALES_ENABLED}>
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                {TICKET_SALES_ENABLED ? "Gå til betaling" : "Billettsalg stengt"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
