CREATE TABLE `employee_attendance` (
  `attendance_id` INT NOT NULL AUTO_INCREMENT,
  `employee_code` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `clock_date_time` DATETIME NOT NULL,
  `punch_action` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `uq_employee_clock` (`employee_code`, `clock_date_time`),
  KEY `idx_employee_code` (`employee_code`),
  KEY `idx_clock_date_time` (`clock_date_time`),
  CONSTRAINT `fk_employee_attendance_employee`
    FOREIGN KEY (`employee_code`) REFERENCES `employees`(`employee_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
