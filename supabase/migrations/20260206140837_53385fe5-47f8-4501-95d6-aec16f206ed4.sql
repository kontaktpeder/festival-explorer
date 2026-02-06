-- Grant necessary table privileges
GRANT INSERT ON public.access_requests TO anon;
GRANT INSERT, SELECT, UPDATE ON public.access_requests TO authenticated;