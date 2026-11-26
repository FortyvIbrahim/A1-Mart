ALTER TABLE `employee_allocation`
  ADD COLUMN `working_days` INT NULL DEFAULT NULL AFTER `required_count`;
