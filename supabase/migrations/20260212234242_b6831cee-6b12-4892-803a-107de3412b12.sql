
-- Persona: use account contact vs custom email
ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS use_account_contact boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.personas.use_account_contact IS
  'When true, use account-level contact info (user_contact_info); when false, use public_email.';

-- Entities: optional contact override
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS contact_display text DEFAULT 'persona';

ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_name text;

COMMENT ON COLUMN public.entities.contact_display IS
  'persona = use primary persona contact; custom = use contact_email/contact_phone/contact_name.';

-- Add validation trigger for contact_display values
CREATE OR REPLACE FUNCTION public.validate_contact_display()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.contact_display IS NOT NULL AND NEW.contact_display NOT IN ('persona', 'custom') THEN
    RAISE EXCEPTION 'contact_display must be persona, custom, or null';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_entities_contact_display
  BEFORE INSERT OR UPDATE ON public.entities
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_contact_display();
