ALTER TABLE `billing_counter` 
ADD COLUMN `counter_code` VARCHAR(100) NULL DEFAULT NULL 
AFTER `counter_name`;