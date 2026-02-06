
ALTER TABLE public.access_requests 
  DROP CONSTRAINT IF EXISTS access_requests_status_check;
  
ALTER TABLE public.access_requests 
  ADD CONSTRAINT access_requests_status_check 
  CHECK (status IN ('new', 'approved', 'rejected'));
