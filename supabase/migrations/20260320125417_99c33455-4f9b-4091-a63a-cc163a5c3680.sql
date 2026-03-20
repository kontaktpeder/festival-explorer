
-- 1) Create enum for finance access levels
DO $$ BEGIN
  CREATE TYPE public.finance_access_level AS ENUM ('none', 'reader', 'editor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Add column to festival_participants
ALTER TABLE public.festival_participants
  ADD COLUMN IF NOT EXISTS finance_access public.finance_access_level NOT NULL DEFAULT 'none';

-- 3) Backfill existing rows
UPDATE public.festival_participants
SET finance_access = 'admin'
WHERE can_edit_festival = true AND finance_access = 'none';

UPDATE public.festival_participants
SET finance_access = 'reader'
WHERE finance_access = 'none'
  AND (can_see_revenue = true OR can_see_report = true);

-- 4) Helper: can_view_finance_book
CREATE OR REPLACE FUNCTION public.can_view_finance_book(p_book_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.festival_finance_books b
    JOIN public.festival_participants fp ON fp.festival_id = b.festival_id
    JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
    WHERE b.id = p_book_id
      AND p.user_id = auth.uid()
      AND fp.finance_access IN ('reader', 'editor', 'admin')
  )
$$;

-- 5) Helper: can_edit_finance_book
CREATE OR REPLACE FUNCTION public.can_edit_finance_book(p_book_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.festival_finance_books b
    JOIN public.festival_participants fp ON fp.festival_id = b.festival_id
    JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
    WHERE b.id = p_book_id
      AND p.user_id = auth.uid()
      AND fp.finance_access IN ('editor', 'admin')
  )
$$;

-- 6) Helper: can_admin_finance_book
CREATE OR REPLACE FUNCTION public.can_admin_finance_book(p_book_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.festival_finance_books b
    JOIN public.festival_participants fp ON fp.festival_id = b.festival_id
    JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
    WHERE b.id = p_book_id
      AND p.user_id = auth.uid()
      AND fp.finance_access = 'admin'
  )
$$;

-- 7) Helper: get user's finance access for a festival
CREATE OR REPLACE FUNCTION public.get_finance_access_for_festival(p_festival_id uuid)
RETURNS public.finance_access_level
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT
      CASE
        WHEN public.is_admin() THEN 'admin'::public.finance_access_level
        ELSE (
          SELECT fp.finance_access
          FROM public.festival_participants fp
          JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
          WHERE fp.festival_id = p_festival_id
            AND p.user_id = auth.uid()
            AND fp.finance_access != 'none'
          ORDER BY
            CASE fp.finance_access
              WHEN 'admin' THEN 1
              WHEN 'editor' THEN 2
              WHEN 'reader' THEN 3
              ELSE 4
            END
          LIMIT 1
        )
      END
    ),
    'none'::public.finance_access_level
  )
$$;

-- 8) RLS on festival_finance_books
ALTER TABLE public.festival_finance_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_books_select" ON public.festival_finance_books;
CREATE POLICY "finance_books_select" ON public.festival_finance_books
  FOR SELECT TO authenticated
  USING (public.can_view_finance_book(id));

DROP POLICY IF EXISTS "finance_books_insert" ON public.festival_finance_books;
CREATE POLICY "finance_books_insert" ON public.festival_finance_books
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.festival_participants fp
      JOIN public.personas p ON p.id = fp.participant_id AND fp.participant_kind = 'persona'
      WHERE fp.festival_id = festival_finance_books.festival_id
        AND p.user_id = auth.uid()
        AND fp.finance_access = 'admin'
    )
  );

DROP POLICY IF EXISTS "finance_books_update" ON public.festival_finance_books;
CREATE POLICY "finance_books_update" ON public.festival_finance_books
  FOR UPDATE TO authenticated
  USING (public.can_admin_finance_book(id));

DROP POLICY IF EXISTS "finance_books_delete" ON public.festival_finance_books;
CREATE POLICY "finance_books_delete" ON public.festival_finance_books
  FOR DELETE TO authenticated
  USING (public.can_admin_finance_book(id));

-- 9) RLS on festival_finance_entries
ALTER TABLE public.festival_finance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_entries_select" ON public.festival_finance_entries;
CREATE POLICY "finance_entries_select" ON public.festival_finance_entries
  FOR SELECT TO authenticated
  USING (public.can_view_finance_book(book_id));

DROP POLICY IF EXISTS "finance_entries_insert" ON public.festival_finance_entries;
CREATE POLICY "finance_entries_insert" ON public.festival_finance_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_finance_book(book_id));

DROP POLICY IF EXISTS "finance_entries_update" ON public.festival_finance_entries;
CREATE POLICY "finance_entries_update" ON public.festival_finance_entries
  FOR UPDATE TO authenticated
  USING (public.can_edit_finance_book(book_id));

DROP POLICY IF EXISTS "finance_entries_delete" ON public.festival_finance_entries;
CREATE POLICY "finance_entries_delete" ON public.festival_finance_entries
  FOR DELETE TO authenticated
  USING (public.can_edit_finance_book(book_id));

-- 10) RLS on festival_finance_attachments
ALTER TABLE public.festival_finance_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_attachments_select" ON public.festival_finance_attachments;
CREATE POLICY "finance_attachments_select" ON public.festival_finance_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.festival_finance_entries e
      WHERE e.id = entry_id AND public.can_view_finance_book(e.book_id)
    )
  );

DROP POLICY IF EXISTS "finance_attachments_insert" ON public.festival_finance_attachments;
CREATE POLICY "finance_attachments_insert" ON public.festival_finance_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.festival_finance_entries e
      WHERE e.id = entry_id AND public.can_edit_finance_book(e.book_id)
    )
  );

DROP POLICY IF EXISTS "finance_attachments_delete" ON public.festival_finance_attachments;
CREATE POLICY "finance_attachments_delete" ON public.festival_finance_attachments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.festival_finance_entries e
      WHERE e.id = entry_id AND public.can_edit_finance_book(e.book_id)
    )
  );
