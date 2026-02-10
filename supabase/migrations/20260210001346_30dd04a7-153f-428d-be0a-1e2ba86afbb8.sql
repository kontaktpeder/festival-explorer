
UPDATE public.ticket_types SET name = 'Earlybird', description = 'Festivalpass' WHERE code = 'EARLYBIRD';
UPDATE public.ticket_types SET name = 'Ordinær', description = 'Festivalpass' WHERE code = 'ORDINAR';
UPDATE public.ticket_types SET name = 'Festivalpass + BOILER ROOM', description = 'Festivalpass inkl. BOILER ROOM' WHERE code = 'FESTIVALPASS_BOILER';
UPDATE public.ticket_types SET name = 'BOILER ROOM only', description = 'Kun BOILER ROOM' WHERE code = 'BOILER';
