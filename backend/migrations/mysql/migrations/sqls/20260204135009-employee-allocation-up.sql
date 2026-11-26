CREATE TABLE IF NOT EXISTS `employee_allocation` (
  `employee_allocation_id` INT NOT NULL AUTO_INCREMENT,
  `branch_id` INT NOT NULL,
  `designation_id` INT NOT NULL,
  `required_count` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_allocation_id`),
  KEY `idx_employee_allocation_branch_id` (`branch_id`),
  KEY `idx_employee_allocation_designation_id` (`designation_id`),
  CONSTRAINT `fk_employee_allocation_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_employee_allocation_designation`
    FOREIGN KEY (`designation_id`) REFERENCES `designations`(`designation_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;