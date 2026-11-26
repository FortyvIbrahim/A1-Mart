CREATE TABLE `employee_attendance_processed` (
  `attendance_processed_id` INT NOT NULL AUTO_INCREMENT,
  `employee_code` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` DATE NOT NULL,
  `is_late` TINYINT(1) NOT NULL DEFAULT 0,
  `is_early` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`attendance_processed_id`),
  UNIQUE KEY `uq_employee_attendance_processed` (`employee_code`, `date`),
  KEY `idx_employee_attendance_processed_date` (`date`),
  CONSTRAINT `fk_employee_attendance_processed_employee`
    FOREIGN KEY (`employee_code`) REFERENCES `employees`(`employee_code`),
  CONSTRAINT `chk_employee_attendance_processed_flags`
    CHECK (NOT (`is_late` = 1 AND `is_early` = 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
