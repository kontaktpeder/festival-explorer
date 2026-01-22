-- Oppdater Earlybird: 190 kr, kapasitet 60, stripe_price_id
UPDATE public.ticket_types 
SET 
  name = 'Festivalpass – Earlybird',
  price_nok = 19000,
  capacity = 60,
  stripe_price_id = 'price_1SsDAJQSpDJNBQ5QpXVqIMk0'
WHERE code = 'FEST_EARLYBIRD';

-- Oppdater Steg 2: 250 kr, kapasitet 100, stripe_price_id
UPDATE public.ticket_types 
SET 
  name = 'Festivalpass – Ordinær',
  price_nok = 25000,
  capacity = 100,
  stripe_price_id = 'price_1SsDAxQSpDJNBQ5QltHDgP8q'
WHERE code = 'FEST_STEP2';

-- Oppdater Steg 3: 320 kr, kapasitet 60, stripe_price_id
UPDATE public.ticket_types 
SET 
  name = 'Festivalpass – Siste billetter',
  price_nok = 32000,
  capacity = 60,
  stripe_price_id = 'price_1SsDBOQSpDJNBQ5QEutLRF81'
WHERE code = 'FEST_STEP3';

-- Oppdater DJ Only: 150 kr, kapasitet 80, stripe_price_id
UPDATE public.ticket_types 
SET 
  name = 'Afterparty (DJ only)',
  price_nok = 15000,
  capacity = 80,
  stripe_price_id = 'price_1SsDBgQSpDJNBQ5QCdrRe5j5'
WHERE code = 'DJ_ONLY';