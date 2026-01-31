-- Grant crew access to hsberg0707@gmail.com for check-in module
INSERT INTO public.staff_roles (user_id, role)
SELECT id, 'crew'
FROM auth.users
WHERE email = 'hsberg0707@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'crew';