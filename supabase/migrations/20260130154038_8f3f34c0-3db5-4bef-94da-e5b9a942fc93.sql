-- Scan logs tabell for logging av alle scanning-forsøk
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
  ticket_code text NOT NULL,
  result text NOT NULL CHECK (result IN ('success', 'already_used', 'invalid', 'refunded', 'wrong_event', 'error')),
  checked_in_by uuid,
  device_info text,
  method text CHECK (method IN ('qr', 'manual', 'manual_override')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Legg til attendance_count på ticket_events
ALTER TABLE public.ticket_events 
ADD COLUMN IF NOT EXISTS attendance_count int DEFAULT 0;

-- Legg til boilerroom_attendance_count (for separate rom)
ALTER TABLE public.ticket_events 
ADD COLUMN IF NOT EXISTS boilerroom_attendance_count int DEFAULT 0;

-- Legg til refund/chargeback tracking på tickets
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
ADD COLUMN IF NOT EXISTS chargeback_at timestamptz;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scan_logs_ticket_id ON public.scan_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_created_at ON public.scan_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_scan_logs_result ON public.scan_logs(result);
CREATE INDEX IF NOT EXISTS idx_scan_logs_checked_in_by ON public.scan_logs(checked_in_by);

-- RLS policies for scan_logs
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read scan_logs"
  ON public.scan_logs FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Staff can insert scan_logs"
  ON public.scan_logs FOR INSERT
  WITH CHECK (public.is_staff());