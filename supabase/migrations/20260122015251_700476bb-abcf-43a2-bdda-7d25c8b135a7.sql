INSERT INTO public.staff_roles (user_id, role) 
VALUES ('0fbaa0f9-8472-4c7d-8c15-4b80972747da', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';