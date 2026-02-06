import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Copy } from "lucide-react";
import { toast } from "sonner";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useCreateContactRequest } from "@/hooks/useContactRequests";
import { REQUEST_TYPE_OPTIONS, getRequestTypeLabel } from "@/types/contact";
import type { RequestType, ContactMode } from "@/types/contact";
import type { Persona } from "@/types/database";

interface ContactRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: Persona & { public_email?: string; show_email?: boolean };
  avatarUrl?: string | null;
}

export function ContactRequestModal({ open, onOpenChange, persona, avatarUrl }: ContactRequestModalProps) {
  const { data: contactInfo } = useContactInfo();
  const createRequest = useCreateContactRequest();

  const [mode, setMode] = useState<ContactMode>("free");
  
  // Common fields
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  
  // Free mode
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  
  // Template mode
  const [requestType, setRequestType] = useState<RequestType | "">("");
  const [dateOrTimeframe, setDateOrTimeframe] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [details, setDetails] = useState("");

  // Prefill from contact info
  useEffect(() => {
    if (contactInfo?.use_as_default) {
      setSenderName(contactInfo.contact_name || "");
      setSenderEmail(contactInfo.contact_email || "");
      setSenderPhone(contactInfo.contact_phone || "");
    }
  }, [contactInfo]);

  const recipientEmail = (persona as any).public_email || "";
  const recipientName = persona.name;

  const validate = (): boolean => {
    if (!senderName.trim()) { toast.error("Navn er påkrevd"); return false; }
    if (!senderEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail.trim())) {
      toast.error("Ugyldig e-postadresse"); return false;
    }

    if (mode === "free") {
      if (!message.trim() || message.trim().length < 10) {
        toast.error("Melding må være minst 10 tegn"); return false;
      }
    } else {
      if (!requestType) { toast.error("Velg en forespørselstype"); return false; }
      if (!details.trim() || details.trim().length < 10) {
        toast.error("Detaljer må være minst 10 tegn"); return false;
      }
    }
    return true;
  };

  const buildBody = (): string => {
    if (mode === "free") {
      return `Hei ${recipientName},\n\n${message.trim()}\n\n---\nAvsender:\nNavn: ${senderName.trim()}\nE-post: ${senderEmail.trim()}${senderPhone.trim() ? `\nTelefon: ${senderPhone.trim()}` : ""}\nSendt via GIGGEN`;
    }

    const typeLabel = getRequestTypeLabel(requestType as RequestType);
    let body = `Hei ${recipientName},\n\nType: ${typeLabel}`;
    if (dateOrTimeframe.trim()) body += `\nDato/tidsrom: ${dateOrTimeframe.trim()}`;
    if (location.trim()) body += `\nSted: ${location.trim()}`;
    if (budget.trim()) body += `\nBudsjett/honorar: ${budget.trim()}`;
    body += `\n\nDetaljer:\n${details.trim()}`;
    body += `\n\n---\nAvsender:\nNavn: ${senderName.trim()}\nE-post: ${senderEmail.trim()}`;
    if (senderPhone.trim()) body += `\nTelefon: ${senderPhone.trim()}`;
    body += `\nSendt via GIGGEN`;
    return body;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const body = buildBody();
    const subjectLine = mode === "free"
      ? (subject.trim() || `Forespørsel via GIGGEN: kontakt`)
      : (subject.trim() || `Forespørsel via GIGGEN: ${getRequestTypeLabel(requestType as RequestType)}`);

    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;

    // Check mailto length
    if (mailtoUrl.length > 2000) {
      toast.error("Meldingen er for lang for mailto. Kopierer tekst i stedet.");
      try {
        await navigator.clipboard.writeText(`Til: ${recipientEmail}\nEmne: ${subjectLine}\n\n${body}`);
        toast.success("Tekst kopiert til utklippstavle");
      } catch {
        toast.error("Kunne ikke kopiere tekst");
      }
      return;
    }

    // Save contact request to DB
    try {
      await createRequest.mutateAsync({
        status: "opened_mailto",
        recipient_persona_id: persona.id,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        sender_name: senderName.trim(),
        sender_email: senderEmail.trim(),
        sender_phone: senderPhone.trim() || null,
        mode,
        subject: subjectLine,
        message: body,
        template_payload: mode === "template" ? {
          request_type: requestType as RequestType,
          date_or_timeframe: dateOrTimeframe.trim() || null,
          location: location.trim() || null,
          budget: budget.trim() || null,
          details: details.trim(),
        } : null,
      });
    } catch {
      // Non-blocking — we still open mailto
    }

    // Open mailto
    toast("Åpner e-post...", { duration: 1000 });
    try {
      window.location.href = mailtoUrl;
      setTimeout(() => {
        toast.success("Send e-posten i e-postprogrammet ditt.");
        onOpenChange(false);
      }, 500);
    } catch {
      toast.error("Kunne ikke åpne e-postklient. Sjekk at du har en e-postklient installert.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-accent/10 text-accent text-sm">
                {persona.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-lg">{persona.name}</DialogTitle>
              {persona.category_tags && persona.category_tags.length > 0 && (
                <p className="text-xs text-muted-foreground capitalize">
                  {persona.category_tags.slice(0, 3).join(" · ")}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Dette åpner en e-post. Du sender fra din egen e-postklient.
          </p>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as ContactMode)} className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="free" className="flex-1">Fritekst</TabsTrigger>
            <TabsTrigger value="template" className="flex-1">Mal</TabsTrigger>
          </TabsList>

          <TabsContent value="free" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Emne (valgfri)</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Emne for e-posten"
                className="bg-transparent border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Melding *</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Skriv din melding her (min. 10 tegn)..."
                rows={5}
                className="bg-transparent border-border/50 resize-none"
              />
            </div>
          </TabsContent>

          <TabsContent value="template" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type forespørsel *</Label>
              <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestType)}>
                <SelectTrigger className="bg-transparent border-border/50">
                  <SelectValue placeholder="Velg type..." />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Dato / tidsrom</Label>
                <Input
                  value={dateOrTimeframe}
                  onChange={(e) => setDateOrTimeframe(e.target.value)}
                  placeholder="F.eks. juni 2026"
                  className="bg-transparent border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sted</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="F.eks. Oslo"
                  className="bg-transparent border-border/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Budsjett / honorar</Label>
              <Input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="F.eks. 5000 kr"
                className="bg-transparent border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Detaljer *</Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Beskriv forespørselen (min. 10 tegn)..."
                rows={4}
                className="bg-transparent border-border/50 resize-none"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Common sender fields */}
        <div className="space-y-4 pt-4 border-t border-border/30">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Din info</p>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Navn *</Label>
            <Input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Ditt navn"
              className="bg-transparent border-border/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">E-post *</Label>
              <Input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="din@epost.no"
                className="bg-transparent border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Telefon</Label>
              <Input
                type="tel"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="+47..."
                className="bg-transparent border-border/50"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={createRequest.isPending}
          className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Mail className="h-4 w-4 mr-2" />
          Åpne e-post
        </Button>
      </DialogContent>
    </Dialog>
  );
}
