CREATE TABLE `incentive_common` (
  `incentive_common_id` INT NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(100) NOT NULL,
  `incentive_type` ENUM('single_percentage', 'ranged_percentage', 'fixed', 'ranged_fixed') NOT NULL,
  `value` DECIMAL(15,2) NULL,
  `ranges` JSON NULL,
  `selected_month` DATE NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`incentive_common_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_incentive_type` (`incentive_type`),
  UNIQUE KEY `uq_type_selected_month` (`type`, `selected_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;