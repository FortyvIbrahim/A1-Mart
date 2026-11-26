CREATE TABLE `incentive_generated` (
  `incentive_generated_id` INT NOT NULL AUTO_INCREMENT,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `branch_id` INT NULL,
  `designation_id` INT NULL,
  `incentive_type` VARCHAR(50) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'unapproved',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`incentive_generated_id`),
  KEY `idx_incentive_generated_branch` (`branch_id`),
  KEY `idx_incentive_generated_designation` (`designation_id`),
  CONSTRAINT `fk_incentive_generated_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_incentive_generated_designation`
    FOREIGN KEY (`designation_id`) REFERENCES `designations`(`designation_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `incentive_generated_items` (
  `incentive_generated_id` INT NOT NULL,
  `employee_code` VARCHAR(50) NOT NULL,
  `incentive` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`incentive_generated_id`, `employee_code`),
  KEY `idx_incentive_generated_items_employee` (`employee_code`),
  CONSTRAINT `fk_incentive_generated_items_header`
    FOREIGN KEY (`incentive_generated_id`) REFERENCES `incentive_generated`(`incentive_generated_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_incentive_generated_items_employee`
    FOREIGN KEY (`employee_code`) REFERENCES `employees`(`employee_code`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;