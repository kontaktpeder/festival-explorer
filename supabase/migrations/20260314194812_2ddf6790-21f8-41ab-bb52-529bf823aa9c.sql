-- Make the BOILER ROOM add-on visible and update code
UPDATE public.ticket_types
SET visible = true, code = 'BOILER_ADDON', name = 'BOILER ROOM add-on'
WHERE id = '7a3ebedf-d753-4fa3-b23f-17e3a494174b';

-- Hide the old BOILER type (capacity 0)
UPDATE public.ticket_types
SET visible = false
WHERE id = '20c5584b-2dc8-4a8c-adc8-37c6df05ddcd';