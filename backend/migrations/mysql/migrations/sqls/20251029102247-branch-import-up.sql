START TRANSACTION;

ALTER TABLE `branches` ADD UNIQUE(`branch_name`);
ALTER TABLE `employees` ADD `branch_id` INT NULL DEFAULT NULL AFTER `section_id`;

ALTER TABLE `employees` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`);

COMMIT;