-- Update ticket_types to match Stripe sandbox products

UPDATE ticket_types SET 
  price_nok = 22900,
  description = 'Festivalpass - inkluderer afterparty'
WHERE code = 'FEST_EARLYBIRD';

UPDATE ticket_types SET 
  price_nok = 28900,
  description = 'Festivalpass - inkluderer ikke afterparty'
WHERE code = 'FEST_STEP2';

UPDATE ticket_types SET 
  price_nok = 35900,
  description = 'Festivalpass, inkluderer ikke afterparty'
WHERE code = 'FEST_STEP3';

UPDATE ticket_types SET 
  price_nok = 15900,
  name = 'Afterparty (DJ only)',
  description = 'DJ Afterparty etter GIGGEN Festival 2026'
WHERE code = 'DJ_ONLY';