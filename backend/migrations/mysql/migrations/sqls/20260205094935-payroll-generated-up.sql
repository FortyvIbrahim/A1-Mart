ALTER TABLE `payroll_employees` ADD COLUMN `is_generated` TINYINT(1) NOT NULL DEFAULT 0 AFTER `payment_details`;
