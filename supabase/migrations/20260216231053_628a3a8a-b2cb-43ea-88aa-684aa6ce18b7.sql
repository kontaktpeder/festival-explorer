
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS age_limit TEXT,
  ADD COLUMN IF NOT EXISTS cloakroom_available BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN public.events.age_limit IS 'F.eks. "18 år", "20 år" – vises i Praktisk-seksjonen på eventsiden.';
COMMENT ON COLUMN public.events.cloakroom_available IS 'Om garderobe er tilgjengelig – vises i Praktisk-seksjonen.';
