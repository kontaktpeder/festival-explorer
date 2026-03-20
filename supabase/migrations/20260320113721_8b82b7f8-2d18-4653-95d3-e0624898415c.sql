
-- Backfill voucher_number for existing entries that are missing it.
-- Uses stable sort (date_incurred, created_at, id) and respects existing vouchers per book+year.
WITH existing_max AS (
  SELECT book_id,
         EXTRACT(YEAR FROM date_incurred)::text AS yr,
         COALESCE(MAX(
           CASE
             WHEN voucher_number ~ ('^' || EXTRACT(YEAR FROM date_incurred)::text || '-[0-9]+$')
             THEN SUBSTRING(voucher_number FROM LENGTH(EXTRACT(YEAR FROM date_incurred)::text) + 2)::integer
             ELSE 0
           END
         ), 0) AS max_seq
  FROM festival_finance_entries
  WHERE voucher_number IS NOT NULL
  GROUP BY book_id, EXTRACT(YEAR FROM date_incurred)::text
),
numbered AS (
  SELECT e.id,
         EXTRACT(YEAR FROM e.date_incurred)::text AS yr,
         e.book_id,
         ROW_NUMBER() OVER (
           PARTITION BY e.book_id, EXTRACT(YEAR FROM e.date_incurred)::text
           ORDER BY e.date_incurred, e.created_at, e.id
         ) AS rn
  FROM festival_finance_entries e
  WHERE e.voucher_number IS NULL
)
UPDATE festival_finance_entries f
SET voucher_number = n.yr || '-' || LPAD((COALESCE(em.max_seq, 0) + n.rn)::text, 4, '0')
FROM numbered n
LEFT JOIN existing_max em ON em.book_id = n.book_id AND em.yr = n.yr
WHERE f.id = n.id;
