

## Fiks: Google/Apple OAuth "Invalid Origin"

### Problem
`getAuthCallbackUrl()` returnerer `/auth/callback?next=/join/artist` som `redirectTo`, men Google/Apple krever ren origin (kun domene, ingen path).

### Løsning
Endre `getAuthCallbackUrl` i `src/lib/artistJoinOnboarding.ts` til å returnere kun origin for OAuth. Bruk `options.queryParams` for å sende `next` state.

### Filendringer

**`src/lib/artistJoinOnboarding.ts`**
- Endre `getAuthCallbackUrl` til å returnere kun origin (f.eks. `https://giggen.org`)
- Fjern path og query params fra returverdi
- AuthCallbackPage håndterer allerede `next` fra searchParams

**`src/pages/onboarding/JoinArtistPage.tsx`**
- I `handleOAuth`: bruk `options.queryParams` for å sende `next` state til callback:
```typescript
await supabase.auth.signInWithOAuth({
  provider,
  options: { 
    redirectTo: getAuthCallbackUrl(), // nå kun origin
    queryParams: { next: "/join/artist" }
  }
});
```

### Etter fiks
1. Google/Apple mottar ren origin som `redirectTo` → ingen "Invalid Origin" feil
2. `next` state sendes via `queryParams` og plukkes opp av AuthCallbackPage
3. Bruker redirectes korrekt til `/join/artist` etter OAuth-login

