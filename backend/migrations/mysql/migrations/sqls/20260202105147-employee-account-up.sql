ALTER TABLE employees
  ADD COLUMN account_no VARCHAR(50) NULL AFTER profile_img_url,
  ADD COLUMN ifsc_code VARCHAR(20) NULL AFTER account_no;