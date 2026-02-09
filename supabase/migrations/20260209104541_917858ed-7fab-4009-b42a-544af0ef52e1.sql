UPDATE festival_sections 
SET 
  bg_image_url_desktop = bg_image_url_mobile,
  bg_image_url_mobile = bg_image_url_desktop
WHERE id = '0d16514f-e1d6-44c5-a548-01c868e592ec';