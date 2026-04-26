## Problem

Når du klikker linken fra Instagram blir du sendt rett til Maja Strela sitt prosjekt. Det er fordi Supabase-sessionen din fortsatt er aktiv (lagret i `localStorage`, varer i ~1 år), og `JoinArtistPage` har en "smart resume"-logikk som automatisk hopper til `step="done"` med din eksisterende artistprofil.

Sessionen blir bevisst **ikke** nullstilt mellom besøk – det er Supabase sitt standardoppsett.

## Løsning: Behold intro, legg til snarvei øverst

Vi endrer `JoinArtistPage` slik at intro-siden alltid vises først, men innloggede brukere får en tydelig banner/snarvei øverst.

### Endringer i `src/pages/onboarding/JoinArtistPage.tsx`

1. **Fjern auto-hopp til `done`** i `useEffect` (linje 107-147):
   - Fortsatt sjekk session og kall `findExistingArtistProject()` for å vite om brukeren har en profil
   - Lagre resultatet i en ny state `existingProject` (i stedet for å sette `step="done"`)
   - La `step` forbli `"intro"` ved første lasting, uansett innloggingsstatus

2. **Snarvei-banner i intro-steget** (øverst, både mobil og desktop):
   - Hvis `existingProject` finnes:
     - Vis en kompakt banner: "Logget inn som **{name}**" + knapp "Gå til profilen din →"
     - Knappen setter `step="done"` (gjenbruker eksisterende success-panel) eller navigerer til `/project/{slug}`
   - Hvis innlogget men uten artistprofil: vis "Logget inn – fullfør profilen din" som hopper til `step="create"`
   - Hvis ikke innlogget: ingen banner (ren intro som i dag)

3. **Plassering**:
   - Mobil: under topp-logoen, over hero-teksten – diskret men synlig
   - Desktop: øverst til høyre i hero-griden, ved siden av "Jeg har allerede konto"-knappen (eller erstatter den når innlogget)

4. **Stil**: 
   - Glass-pill med backdrop-blur for å matche eksisterende onboarding-estetikk
   - Liten avatar (hvis `heroImageUrl` finnes) + navn + pil-ikon
   - Subtil pulse/glow så den fanger blikket uten å stjele showet

### Resultat

- Instagram-linken viser alltid den fulle wow-intro-opplevelsen
- Returnerende brukere ser umiddelbart at de er gjenkjent og har én klikk til profilen
- Helt nye brukere får uforstyrret intro → "Kom i gang" som før
- Ingen bruker blir "kidnappet" til ferdig-skjermen for et prosjekt de ikke forventet