-- Manuelt sett email_verified = true for livstreet.store@gmail.com
UPDATE public.access_requests 
SET email_verified = true, verification_token = null 
WHERE email = 'livstreet.store@gmail.com' AND id = 'd60b26ac-4edf-4935-a1ab-0300eefc548f';