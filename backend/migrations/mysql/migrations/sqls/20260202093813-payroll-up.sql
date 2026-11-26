CREATE TABLE `payroll` (
  `payroll_id` INT NOT NULL AUTO_INCREMENT,
  `payroll_month` DATE NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payroll_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payroll_employees` (
  `payroll_employee_id` INT NOT NULL AUTO_INCREMENT,
  `payroll_id` INT NOT NULL,
  `employee_code` VARCHAR(50) NOT NULL,
  `date_of_joining` DATE NULL,
  `actual_pay` DECIMAL(15,2) NULL,
  `no_of_working_days` INT NULL,
  `incentive` DECIMAL(15,2) NULL,
  `lateness_amt` DECIMAL(15,2) NULL,
  `overtime_amt` DECIMAL(15,2) NULL,
  `advance` DECIMAL(15,2) NULL,
  `penalty` DECIMAL(15,2) NULL,
  `employee_esi` DECIMAL(15,2) NULL,
  `employee_epf` DECIMAL(15,2) NULL,
  `days_per_month` INT NULL,
  `lop_days` INT NULL,
  `per_day_salary` DECIMAL(15,2) NULL,
  `gross_pay` DECIMAL(15,2) NULL,
  `lop_amount` DECIMAL(15,2) NULL,
  `net_pay` DECIMAL(15,2) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payroll_employee_id`),
  UNIQUE KEY `uq_payroll_employee` (`payroll_id`, `employee_code`),
  KEY `idx_payroll_id` (`payroll_id`),
  KEY `idx_employee_code` (`employee_code`),
  CONSTRAINT `fk_payroll_employees_payroll`
    FOREIGN KEY (`payroll_id`) REFERENCES `payroll`(`payroll_id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE payroll_employees
  MODIFY COLUMN no_of_working_days DECIMAL(10,2) NULL;

ALTER TABLE payroll_employees
  MODIFY COLUMN lop_days DECIMAL(10,2) NULL;

