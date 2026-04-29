## Tre fikser etter onboarding-test

### 1. E-postbekreftelse lander på "Kom i gang" i stedet for å fortsette flyten

**Problem**: Når brukeren klikker bekreftelseslenken i e-posten havner de på `/auth/callback?next=/join/artist`, som sender dem tilbake til **intro**-skjermen ("Kom i gang"). De får ingen indikasjon på at de skal trykke seg videre — "Fullfør profilen" ligger som en liten lenke øverst til høyre. Brukeren får aldri satt navn/profilbilde.

**Fiks**:
- Endre `emailRedirectTo` i `signUp` (i `JoinArtistPage.tsx`) til `next=/join/artist?step=create`, slik at bekreftelseslenken hopper rett til steg 2 (sett opp profil).
- Utvide `useEffect` som leser `?step=` til også å akseptere `step=create` når brukeren har session.
- Som ekstra trygghet: Hvis brukeren havner på intro etter nylig auth (har session, men ingen `existingProject`) — hopp automatisk videre til `create`-steget. Det forhindrer at confirm-lenken viser intro på nytt.

### 2. Forhåndsvisning av prosjekt viser avkuttet avatar (ferdig-steget)

**Problem**: I `step === "done"` brukes en rund container (`h-32 w-32 rounded-full`) med `<CroppedImage aspect="hero" />`. `CroppedImage` setter `aspectRatio: 2.5` på indre wrapper — bildet blir tvunget til 2.5:1 inni en sirkel og ser strukket/avkuttet ut.

**Fiks**: Endre `aspect="hero"` til `aspect="avatar"` i `done`-bildet i `JoinArtistPage.tsx` (samme rendring som "Logget inn som"-pillen som bruker `<img object-cover>` direkte). Da fyller bildet sirkelen riktig med focal point bevart.

### 3. Bruker må enkelt kunne av-/publisere prosjektet i edit

**Problem**: I `EntityEdit.tsx` finnes kun en lese-badge ("Publisert/Utkast"), og en alert som sier "Kontakt en administrator for å få det publisert". Brukeren har ikke selvbetjent kontroll. `completeArtistJoin` setter `is_published: true` automatisk, så nye brukere kan ikke skjule profilen mens de jobber.

**Fiks**:
- Legg til en publiser-bryter i headeren i `EntityEdit.tsx`, ved siden av "Se live"-knappen — synlig kun for `admin`/`owner`. Bruker `Switch`-komponenten med label "Publisert".
- Mutation som oppdaterer `entities.is_published` direkte og invaliderer queries (`dashboard-entity`, `entity`, `entity-by-slug`, `my-entities`).
- Erstatt den nåværende "Kontakt en administrator"-alerten med en vennligere melding: "Profilen er skjult. Slå på 'Publisert' øverst når du er klar." (kun synlig hvis brukeren har rettigheter).
- Når av-publisert: skjul "Se live"-knappen (allerede betinget av `is_published`).

### Tekniske detaljer

**Filer som endres**:
- `src/pages/onboarding/JoinArtistPage.tsx` — endre `emailRedirectTo` next-param, utvid `step=create` deep-link, fiks `aspect="avatar"` i done-steget.
- `src/pages/dashboard/EntityEdit.tsx` — ny publish-toggle i header, mutation, oppdater alert-tekst.

**Ingen DB-endringer** — `is_published` finnes allerede på `entities`. RLS for update på entities krever admin/owner, som matcher UI-betingelsen.
