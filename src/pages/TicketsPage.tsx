import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { TICKET_SALES_ENABLED } from "@/lib/ticket-config";
export default function TicketsPage() {
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: ticketTypes, isLoading: typesLoading } = useQuery({
    queryKey: ["ticket-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_types")
        .select("*, ticket_events(name, starts_at, venue_name)")
        .eq("visible", true)
        .order("sort_order");
      if (error) throw error;
      return data;
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Ticket className="w-12 h-12 mx-auto text-primary" />
          <h1 className="text-3xl font-bold">Kjøp billetter</h1>
        </div>

        <div className="space-y-2">
          {ticketTypes?.map((type) => (
            <Card 
              key={type.id} 
              className={`cursor-pointer transition-all ${selectedType === type.id ? "ring-2 ring-primary" : ""}`} 
              onClick={() => setSelectedType(type.id)}
            >
              <div className="flex items-center justify-between p-4">
                <div className="space-y-0.5">
                  <CardTitle className="text-base">{type.name}</CardTitle>
                  <CardDescription className="text-xs">{type.description}</CardDescription>
                </div>
                <p className="text-lg font-bold whitespace-nowrap ml-4">{(type.price_nok / 100).toFixed(0)} kr</p>
              </div>
            </Card>
          ))}
        </div>

        {selectedType && (
          <Card>
            <CardHeader><CardTitle>Din informasjon</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Navn" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} disabled={!TICKET_SALES_ENABLED} />
              <Input type="email" placeholder="E-post" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} disabled={!TICKET_SALES_ENABLED} />
              <Button className="w-full" onClick={handlePurchase} disabled={isLoading || !TICKET_SALES_ENABLED}>
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                {TICKET_SALES_ENABLED ? "Gå til betaling" : "Billettsalg stengt"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
