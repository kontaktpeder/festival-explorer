import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Ticket, Music, ShieldCheck, Smartphone, Lock } from "lucide-react";
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

/** UI-only tag/badge config per ticket code */
function getTicketMeta(code: string) {
  switch (code) {
    case "EARLYBIRD":
      return { tag: "Konserter", badge: null, recommended: false };
    case "ORDINAR":
      return { tag: "Konserter", badge: null, recommended: false };
    case "FESTIVALPASS_BOILER":
      return { tag: "Konserter + BOILER ROOM", badge: "FULL TILGANG", recommended: true };
    case "BOILER":
      return { tag: "Kun BOILER ROOM", badge: null, recommended: false };
    default:
      return { tag: null, badge: null, recommended: false };
  }
}

export default function TicketsPage() {
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    data: ticketTypes,
    isLoading: typesLoading,
  } = useQuery({
    queryKey: ["ticket-types-with-counts"],
    queryFn: async () => {
      const { data: types, error } = await supabase
        .from("ticket_types")
        .select("id, code, name, description, price_nok, capacity, visible")
        .eq("visible", true)
        .order("sort_order");
      if (error) throw error;

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

  const festivalPassCodes = ["EARLYBIRD", "ORDINAR", "FESTIVALPASS_BOILER"];
  const festivalPasses = (ticketTypes || []).filter((t) => festivalPassCodes.includes(t.code));
  const boilerOnly = (ticketTypes || []).filter((t) => t.code === "BOILER");

  const renderPurchaseForm = () => (
    <div className="ticket-card rounded-lg mt-2 animate-fade-in">
      <div className="p-4 space-y-3">
        <p className="text-sm font-medium">Din informasjon</p>
        <Input
          placeholder="Navn"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          disabled={!TICKET_SALES_ENABLED}
          className="h-9 bg-background/50 border-border/50"
        />
        <Input
          type="email"
          placeholder="E-post"
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          disabled={!TICKET_SALES_ENABLED}
          className="h-9 bg-background/50 border-border/50"
        />
        <p className="text-xs text-muted-foreground">
          Ved å fortsette godtar du våre{" "}
          <Link to="/vilkar" className="underline hover:text-foreground transition-colors">vilkår</Link>
          {" "}og{" "}
          <Link to="/personvern" className="underline hover:text-foreground transition-colors">personvernerklæring</Link>
        </p>
        <Button
          className="w-full h-10 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          onClick={handlePurchase}
          disabled={isLoading || !TICKET_SALES_ENABLED}
        >
          {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
          {TICKET_SALES_ENABLED ? "Gå til betaling" : "Billettsalg stengt"}
        </Button>
      </div>
    </div>
  );

  const renderTicketCard = (type: TicketTypeWithCount) => {
    const soldOut = type.issued >= type.capacity;
    const remaining = type.capacity - type.issued;
    const showRemaining = type.code !== "BOILER" && !soldOut && remaining <= 20;
    const meta = getTicketMeta(type.code);
    const isSelected = selectedType === type.id;

    return (
      <div key={type.id}>
        <div
          className={`ticket-card rounded-lg transition-all duration-200 ${
            soldOut
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:scale-[1.01]"
          } ${isSelected ? "selected" : ""}`}
          onClick={() => !soldOut && setSelectedType(type.id)}
        >
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-semibold text-foreground">{type.name}</p>
                  {meta.badge && (
                    <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] uppercase tracking-wider font-semibold">
                      {meta.badge}
                    </Badge>
                  )}
                  {meta.recommended && !soldOut && (
                    <span className="text-[10px] text-accent/60 uppercase tracking-wider font-mono">
                      Anbefalt
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{type.description}</p>
                {meta.tag && (
                  <p className="text-[11px] text-muted-foreground/50 font-medium uppercase tracking-wide">
                    {meta.tag}
                  </p>
                )}
                {soldOut ? (
                  <p className="text-xs font-semibold text-destructive">Utsolgt</p>
                ) : showRemaining ? (
                  <p className="text-xs font-semibold text-accent">{remaining} igjen</p>
                ) : null}
              </div>
              <p className="text-lg font-bold whitespace-nowrap ml-4 text-accent">
                {(type.price_nok / 100).toFixed(0)} kr
              </p>
            </div>
          </div>
        </div>
        {isSelected && renderPurchaseForm()}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Ticket className="w-10 h-10 mx-auto text-accent opacity-80" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Billetter til GIGGEN Festival
          </h1>
          <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
            Velg billettype. Festivalpass + BOILER ROOM er eneste billett med full tilgang.
          </p>
        </div>

        {/* Hva får du? */}
        <div className="rounded-lg border border-border/30 bg-card/50 p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            Dette inkluderer billetten
          </h3>
          <ul className="space-y-1.5 text-sm text-foreground/80">
            <li className="flex items-center gap-2">
              <Music className="w-3.5 h-3.5 text-accent/60 flex-shrink-0" />
              Konserter og kunstutstilling i 1. og 2. etasje
            </li>
            <li className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-accent/60 flex-shrink-0" />
              BOILER ROOM (DJ-program) krever egen billett eller full tilgang
            </li>
            <li className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-accent/60 flex-shrink-0" />
              QR-billett på mobil
            </li>
          </ul>
        </div>

        {/* Festival passes */}
        {festivalPasses.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Konserter
            </h2>
            {festivalPasses.map(renderTicketCard)}
          </div>
        )}

        {/* Boiler Room only */}
        {boilerOnly.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              BOILER ROOM
            </h2>
            <p className="text-xs text-muted-foreground/50">Begrenset kapasitet.</p>
            {boilerOnly.map(renderTicketCard)}
          </div>
        )}

        {/* Trust */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/40 pt-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Sikker betaling via Stripe. Billetter leveres som QR-kode på mobil.</span>
        </div>
      </div>
    </div>
  );
}
