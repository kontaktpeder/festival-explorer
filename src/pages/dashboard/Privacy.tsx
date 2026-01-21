import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonaSelector } from "@/components/dashboard/PersonaSelector";
import { ArrowLeft, Shield, Lock, Eye } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/dashboard" className="text-xl font-bold text-primary hover:opacity-80 transition-opacity">
            GIGGEN
          </Link>
          <PersonaSelector />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Personvernpolicy</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personvernpolicy for GIGGEN</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Eye className="h-5 w-5 text-primary" />
                Hva slags informasjon samler vi inn?
              </h3>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong>Kontoinformasjon:</strong> E-postadresse (brukes til autentisering)</li>
                <li><strong>Profilinformasjon:</strong> Visningsnavn, handle, profilbilde (valgfritt, bestemmes av deg)</li>
                <li><strong>Prosjektdata:</strong> Informasjon om prosjekter, scener og personas du oppretter</li>
                <li><strong>Bruksdata:</strong> Metadata om hvordan du bruker plattformen</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Lock className="h-5 w-5 text-primary" />
                Hvordan bruker vi informasjonen?
              </h3>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>Tilby tjenesten og administrere kontoen din</li>
                <li>Kommunisere med deg om tjenesten</li>
                <li>Forbedre og utvikle plattformen</li>
                <li>Overholde juridiske forpliktelser</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Dine rettigheter</h3>
              <p className="text-muted-foreground">
                Du har rett til å:
              </p>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong>Innsyn:</strong> Få tilgang til dine personopplysninger</li>
                <li><strong>Rettelse:</strong> Få rettet feilaktige personopplysninger</li>
                <li><strong>Sletting:</strong> Få slettet dine personopplysninger</li>
                <li><strong>Dataportabilitet:</strong> Få utlevert dine data i et strukturert format</li>
                <li><strong>Innsigelse:</strong> Gjøre innsigelse mot behandling av personopplysninger</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Informasjonssikkerhet</h3>
              <p className="text-muted-foreground">
                Vi bruker moderne sikkerhetstiltak for å beskytte dine personopplysninger, 
                inkludert kryptering, sikker lagring og begrenset tilgang.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Kontakt oss</h3>
              <p className="text-muted-foreground">
                Hvis du har spørsmål om personvernet ditt eller ønsker å utøve dine rettigheter, 
                kan du kontakte oss via innstillinger i kontoen din.
              </p>
            </section>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Sist oppdatert: {new Date().toLocaleDateString('nb-NO')}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button asChild variant="outline">
            <Link to="/dashboard/account">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Til kontosenter
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
