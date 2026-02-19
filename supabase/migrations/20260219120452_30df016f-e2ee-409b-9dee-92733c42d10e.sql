UPDATE festival_participants
SET is_public = true
WHERE festival_id = '40000000-0000-0000-0000-000000000001'
AND zone = 'backstage'
AND is_public = false;