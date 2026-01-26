-- Remove "DJ afterparty" from all festivalpass descriptions
UPDATE public.ticket_types 
SET description = 'Festivalpass'
WHERE code IN ('FEST_EARLYBIRD', 'FEST_STEP2', 'FEST_STEP3');

-- Rename DJ party ticket to BOILERROOM
UPDATE public.ticket_types 
SET 
  name = 'BOILERROOM',
  description = 'BOILERROOM – Kun afterparty'
WHERE code = 'DJ_ONLY';