import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyGuestPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link 
            to="/" 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Personvern</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Personvern for uregistrerte brukere</h2>
          <p className="text-muted-foreground leading-relaxed">
            Når du kjøper billett via GIGGEN uten å opprette brukerkonto, behandler vi kun 
            personopplysninger som er nødvendige for å gjennomføre kjøpet og gi deg tilgang 
            til arrangementet.
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Hvilke opplysninger samles inn</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Navn</li>
            <li>E-postadresse</li>
            <li>Billettype og ordre-ID</li>
            <li>Betalingsstatus (håndteres av Stripe)</li>
            <li>QR-kode og innsjekk-status ved arrangement</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Hva opplysningene brukes til</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Fullføre billettkjøp og betaling</li>
            <li>Sende billett og kvittering på e-post</li>
            <li>Kontroll av gyldig adgang ved arrangement</li>
            <li>Kundestøtte ved spørsmål eller feil</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Hva vi ikke gjør</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Vi oppretter <strong className="text-foreground">ingen brukerkonto</strong></li>
            <li>Vi profilerer deg ikke</li>
            <li>Vi deler ikke data med tredjeparter utover det som er nødvendig for betaling og gjennomføring av arrangementet</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Lagring og sletting</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Personopplysninger knyttet til billettkjøp lagres kun så lenge det er nødvendig for gjennomføring og oppgjør</li>
            <li>Data anonymiseres eller slettes automatisk etter arrangementet, senest innen <strong className="text-foreground">90 dager</strong></li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Betaling</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>All betaling håndteres sikkert av Stripe</li>
            <li>GIGGEN lagrer ikke kortinformasjon</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Dine rettigheter</h3>
          <p className="text-muted-foreground leading-relaxed">
            Du har rett til innsyn, retting og sletting av opplysninger.
            Kontakt oss på{" "}
            <a 
              href="mailto:giggen.main@gmail.com" 
              className="text-accent hover:underline"
            >
              giggen.main@gmail.com
            </a>
            {" "}dersom du har spørsmål.
          </p>
        </section>

        {/* Back link */}
        <div className="pt-4 border-t border-border/30">
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
