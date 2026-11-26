ALTER TABLE `departments` ADD `department_code` VARCHAR(50) NOT NULL AFTER `department_id`;
ALTER TABLE `designations` ADD `designation_code` VARCHAR(50) NOT NULL AFTER `designation_id`;

ALTER TABLE `designations` ADD UNIQUE(`designation_code`);
ALTER TABLE `departments` ADD UNIQUE(`department_code`);