ALTER TABLE `employee_allocation`
  ADD COLUMN `working_days` INT NULL DEFAULT NULL AFTER `required_count`;

UPDATE `employee_allocation` ea
JOIN `designations` d
  ON d.designation_id = ea.designation_id
SET ea.working_days = d.working_days
WHERE d.working_days IS NOT NULL;

ALTER TABLE `designations`
  DROP COLUMN `working_days`;
