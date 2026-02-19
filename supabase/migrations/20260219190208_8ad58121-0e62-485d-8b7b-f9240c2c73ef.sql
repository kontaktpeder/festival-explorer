ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS logo_display_mode text NOT NULL DEFAULT 'with_name'
  CHECK (logo_display_mode IN ('with_name', 'instead_of_name'));

COMMENT ON COLUMN public.entities.logo_display_mode IS 'Vis logo i tillegg til navn (with_name) eller kun logo / erstatter navn (instead_of_name) på plakater og delingsbilder.';