-- Allow staff to delete checkins (required for admin reset check-in flow)
CREATE POLICY "Staff can delete checkins"
  ON public.checkins FOR DELETE
  USING (public.is_staff());

-- Store scanner device/session id for debugging
ALTER TABLE public.checkins
ADD COLUMN IF NOT EXISTS device_id text;