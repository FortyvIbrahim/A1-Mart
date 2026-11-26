ALTER TABLE designations
  ADD COLUMN incentive_type VARCHAR(50) NULL AFTER requires_2fa;

ALTER TABLE employees
  ADD COLUMN incentive_type VARCHAR(50) NULL AFTER profile_img_url;