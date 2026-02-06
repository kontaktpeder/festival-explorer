import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { useContactInfo, useUpsertContactInfo } from "@/hooks/useContactInfo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/ui/LoadingState";
import { PersonaSelector } from "@/components/dashboard/PersonaSelector";
import { toast } from "sonner";

export default function ContactInfo() {
  const { data: contactInfo, isLoading } = useContactInfo();
  const upsert = useUpsertContactInfo();

  // Get auth email for prefill
  const { data: authEmail } = useQuery({
    queryKey: ["auth-email"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.email || null;
    },
  });

  const [editing, setEditing] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [useAsDefault, setUseAsDefault] = useState(true);

  // Populate form
  useEffect(() => {
    if (contactInfo) {
      setContactName(contactInfo.contact_name || "");
      setContactEmail(contactInfo.contact_email || "");
      setContactPhone(contactInfo.contact_phone || "");
      setUseAsDefault(contactInfo.use_as_default);
    } else if (authEmail && !contactInfo) {
      // Prefill email from auth on first visit
      setContactEmail(authEmail);
    }
  }, [contactInfo, authEmail]);

  const handleSave = async () => {
    // Validate
    if (useAsDefault) {
      if (!contactName.trim() || contactName.trim().length < 2) {
        toast.error("Navn må være minst 2 tegn");
        return;
      }
      if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
        toast.error("Ugyldig e-postadresse");
        return;
      }
    }

    try {
      await upsert.mutateAsync({
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        use_as_default: useAsDefault,
      });
      toast.success("Kontaktinfo lagret");
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Kunne ikke lagre");
    }
  };

  const handleCancel = () => {
    // Reset to saved values
    setContactName(contactInfo?.contact_name || "");
    setContactEmail(contactInfo?.contact_email || authEmail || "");
    setContactPhone(contactInfo?.contact_phone || "");
    setUseAsDefault(contactInfo?.use_as_default ?? true);
    setEditing(false);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/dashboard" className="text-lg sm:text-xl font-bold text-primary hover:opacity-80 transition-opacity">
            GIGGEN
          </Link>
          <PersonaSelector />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Backstage</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Kontaktinfo</h1>
          </div>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Rediger
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Avbryt
              </Button>
              <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {upsert.isPending ? "Lagrer..." : "Lagre"}
              </Button>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Brukes når du sender forespørsler via GIGGEN. Ikke synlig for andre.
        </p>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              Navn {useAsDefault && "*"}
            </Label>
            {editing ? (
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ditt fulle navn"
                className="bg-transparent border-border/50 focus:border-accent"
              />
            ) : (
              <p className="text-foreground py-2">{contactName || <span className="text-muted-foreground/50">Ikke satt</span>}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              E-post {useAsDefault && "*"}
            </Label>
            {editing ? (
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder={authEmail || "din@epost.no"}
                className="bg-transparent border-border/50 focus:border-accent"
              />
            ) : (
              <p className="text-foreground py-2">{contactEmail || <span className="text-muted-foreground/50">Ikke satt</span>}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">Telefon</Label>
            {editing ? (
              <Input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+47 000 00 000"
                className="bg-transparent border-border/50 focus:border-accent"
              />
            ) : (
              <p className="text-foreground py-2">{contactPhone || <span className="text-muted-foreground/50">Ikke satt</span>}</p>
            )}
          </div>

          <div className="flex items-center justify-between py-3 border-t border-border/30">
            <div>
              <p className="text-sm font-medium">Bruk som standard</p>
              <p className="text-xs text-muted-foreground">Fyll inn automatisk i kontaktskjemaer</p>
            </div>
            {editing ? (
              <Switch checked={useAsDefault} onCheckedChange={setUseAsDefault} />
            ) : (
              <span className="text-sm text-muted-foreground">{useAsDefault ? "Ja" : "Nei"}</span>
            )}
          </div>
        </div>

        <div className="pt-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/settings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake til innstillinger
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
