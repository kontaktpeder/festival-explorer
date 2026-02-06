-- Drop and recreate the INSERT policy to allow all columns including verification fields
DROP POLICY IF EXISTS "Public can insert access requests" ON public.access_requests;

CREATE POLICY "Public can insert access requests"
  ON public.access_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);