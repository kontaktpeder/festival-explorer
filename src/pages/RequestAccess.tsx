import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAccessRequest } from "@/hooks/useAccessRequests";
import { ROLE_TYPE_OPTIONS } from "@/types/access-request";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/layout/PageLayout";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function RequestAccess() {
  const { toast } = useToast();
  const createRequest = useCreateAccessRequest();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleType, setRoleType] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // Honeypot anti-spam field
  const [website, setWebsite] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot: if filled, silently "succeed"
    if (website) {
      setSubmitted(true);
      return;
    }

    if (!name.trim() || !email.trim() || !roleType) {
      toast({
        title: "Mangler informasjon",
        description: "Fyll ut alle påkrevde felt.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createRequest.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        role_type: roleType,
        message: message.trim() || null,
      });
      setSubmitted(true);
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke sende forespørsel",
        variant: "destructive",
      });
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-black text-white">
        <StaticLogo />

        {/* Spacer for fixed header */}
        <div className="pt-20 md:pt-24" />

        {/* Back link */}
        <div className="px-4 md:px-8 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbake
          </Link>
        </div>

        {/* Hero text */}
        <section className="px-4 md:px-8 pb-10 max-w-xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            Be om tilgang til GIGGEN
          </h1>
          <p className="text-white/60 text-sm md:text-base leading-relaxed mb-2">
            GIGGEN er i tidlig fase og bygges sammen med musikere, arrangører og folk
            som jobber med levende musikk.
          </p>
          <p className="text-white/40 text-xs md:text-sm">
            Fortell kort hvem du er, så tar vi kontakt.
          </p>
        </section>

        {/* Form / Success */}
        <section className="px-4 md:px-8 pb-20 max-w-md mx-auto">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <CheckCircle className="h-12 w-12 text-accent mx-auto" />
              <h2 className="text-xl font-semibold">Forespørsel sendt!</h2>
              <p className="text-white/60 text-sm">
                Vi tar kontakt så snart vi kan.
              </p>
              <Link to="/">
                <Button variant="outline" className="mt-4">
                  Tilbake til forsiden
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Navn *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ditt fulle navn"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-post *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@epost.no"
                  maxLength={255}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Hva beskriver deg best? *</Label>
                <Select value={roleType} onValueChange={setRoleType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg rolle" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Kort melding</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hvem er du, og hvorfor vil du være med? (2-4 linjer)"
                  rows={4}
                  maxLength={1000}
                  className="resize-none"
                />
              </div>

              {/* Honeypot anti-spam – invisible to humans */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              <Button
                type="submit"
                disabled={createRequest.isPending}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                {createRequest.isPending ? "Sender..." : "Send forespørsel"}
              </Button>
            </form>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
