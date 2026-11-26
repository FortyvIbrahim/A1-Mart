CREATE TABLE `employee_driver` (
  `employee_code` VARCHAR(50) NOT NULL,
  `dl_number` VARCHAR(100) NULL,
  `dl_file` VARCHAR(500) NULL,
  `vehicle_classes` JSON NULL COMMENT 'Array of vehicle class strings, e.g. ["MC","LMV"]',
  `valid_till` DATE NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_code`),
  CONSTRAINT `fk_employee_driver_employee`
    FOREIGN KEY (`employee_code`) REFERENCES `employees`(`employee_code`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;