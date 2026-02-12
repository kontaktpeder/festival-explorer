
-- Add refund tracking columns to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS refund_status text,
  ADD COLUMN IF NOT EXISTS refund_id text,
  ADD COLUMN IF NOT EXISTS refund_requested_at timestamptz;

-- Note: status is already text type, no enum constraint exists.
-- REFUND_PENDING is now a valid status alongside VALID, USED, CANCELLED.
