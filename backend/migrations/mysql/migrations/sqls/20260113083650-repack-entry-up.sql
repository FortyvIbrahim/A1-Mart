ALTER TABLE `stickering` 
ADD COLUMN `supervisor_id` INT NULL DEFAULT NULL 
AFTER `purchase_acknowledgment_id`;

ALTER TABLE `stickering` 
CHANGE COLUMN `supervisor_id` `supervisor_id` VARCHAR(50) NULL DEFAULT NULL;

ALTER TABLE `stickering` 
ADD CONSTRAINT `fk_stickering_supervisor` 
FOREIGN KEY (`supervisor_id`) REFERENCES `employees`(`employee_code`) 
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `stickering` 
ADD INDEX `idx_stickering_supervisor_id` (`supervisor_id`);