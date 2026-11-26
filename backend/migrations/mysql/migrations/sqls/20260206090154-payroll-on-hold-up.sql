ALTER TABLE `payroll_employees`
  ADD COLUMN `on_hold` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_generated`;