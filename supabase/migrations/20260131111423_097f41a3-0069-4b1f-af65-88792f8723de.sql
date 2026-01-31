-- Delete all checkins first (foreign key dependency)
DELETE FROM checkins;

-- Delete all scan_logs
DELETE FROM scan_logs;

-- Delete all tickets
DELETE FROM tickets;

-- Reset attendance counters
UPDATE ticket_events SET attendance_count = 0, boilerroom_attendance_count = 0;