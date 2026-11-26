ALTER TABLE `employees` 
ADD COLUMN `profile_img_url` VARCHAR(500) NULL DEFAULT NULL 
AFTER `mobile_number`;