import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link 
            to="/" 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Vilkår</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Vilkår for billettkjøp (uregistrerte brukere)</h2>
          <p className="text-muted-foreground leading-relaxed">
            Disse vilkårene gjelder for kjøp av billetter via GIGGEN uten opprettelse av brukerkonto.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Ved å gjennomføre et billettkjøp bekrefter du at du har lest og akseptert disse vilkårene.
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">1. Om tjenesten</h3>
          <p className="text-muted-foreground leading-relaxed">
            GIGGEN tilbyr billettsalg til konserter og arrangementer. Kjøp kan gjennomføres uten registrering av brukerkonto.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">2. Billettkjøp</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Et billettkjøp er bindende når betaling er gjennomført</li>
            <li>Billetten leveres digitalt via e-post</li>
            <li>Hver billett inneholder en unik QR-kode som brukes ved inngang</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Det er kjøpers ansvar å oppgi korrekt e-postadresse.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">3. Betaling</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Betaling håndteres av tredjepart (Stripe)</li>
            <li>GIGGEN lagrer ikke kort- eller betalingsinformasjon</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">4. Bruk av billett</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>QR-koden kan kun brukes én gang, med mindre annet er spesifisert</li>
            <li>Billetten gir kun adgang i henhold til valgt billettype</li>
            <li>Deling, videresalg eller misbruk av billett kan føre til nektet adgang</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">5. Avlysning og endringer</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Ved <strong className="text-foreground">avlyst arrangement</strong> refunderes kjøpesummen</li>
            <li><strong className="text-foreground">Endringer i program, tidspunkt eller rekkefølge på artister gir ikke rett til refusjon</strong></li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">6. Innsjekk og adgang</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Billetten scannes ved inngang for å bekrefte gyldig adgang</li>
            <li>Arrangør forbeholder seg retten til å <strong className="text-foreground">nekte eller bortvise personer ved upassende oppførsel</strong>, brudd på regler, eller i henhold til krav fra <strong className="text-foreground">Josefines Vertshus</strong></li>
            <li>Dette inkluderer personer som står på arrangørens eller venueets interne lister over utestengte</li>
            <li><strong className="text-foreground">Gyldig legitimasjon</strong> kan kreves</li>
            <li>For mindreårige kan <strong className="text-foreground">vergebevis</strong> kreves der dette er relevant</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">7. Ansvar og arrangørforhold</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>GIGGEN fungerer som teknisk plattform for billettsalg</li>
            <li>Arrangementet eies og gjennomføres i samarbeid med <strong className="text-foreground">Josefines Vertshus</strong>, som står som arrangør og har ansvar for forsikring og gjennomføring</li>
            <li>GIGGEN er underlagt Josefines Vertshus sine regler, krav og sikkerhetsrutiner</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">8. Personopplysninger</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Personopplysninger behandles i henhold til gjeldende personvernerklæring</li>
            <li>For uregistrerte brukere behandles kun opplysninger som er nødvendige for billettkjøp og adgang</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">9. Endringer i vilkår</h3>
          <p className="text-muted-foreground leading-relaxed">
            GIGGEN forbeholder seg retten til å oppdatere disse vilkårene. Gjeldende vilkår er de som er publisert på kjøpstidspunktet.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">10. Kontakt</h3>
          <p className="text-muted-foreground leading-relaxed">
            Spørsmål knyttet til billettkjøp eller vilkår kan rettes til:{" "}
            <a 
              href="mailto:giggen.main@gmail.com" 
              className="text-primary hover:underline"
            >
              giggen.main@gmail.com
            </a>
          </p>
        </section>

        {/* Back link */}
        <div className="pt-4 border-t border-border/50">
          <Link 
            to="/" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake til forsiden
          </Link>
        </div>
      </div>
    </div>
  );
}
