ALTER TABLE `designations`
  ADD COLUMN `working_days` INT NULL DEFAULT NULL AFTER `incentive_type`;

UPDATE `designations` d
JOIN (
  SELECT `designation_id`, MAX(`working_days`) AS `working_days`
  FROM `employee_allocation`
  WHERE `working_days` IS NOT NULL
  GROUP BY `designation_id`
) ea ON ea.designation_id = d.designation_id
SET d.working_days = ea.working_days
WHERE d.working_days IS NULL;

ALTER TABLE `employee_allocation`
  DROP COLUMN `working_days`;
