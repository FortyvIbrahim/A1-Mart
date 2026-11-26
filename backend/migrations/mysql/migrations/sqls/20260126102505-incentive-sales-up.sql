CREATE TABLE `incentive_sales` (
  `incentive_sales_id` INT NOT NULL AUTO_INCREMENT,
  `cluster_type` ENUM('small', 'medium', 'large') NOT NULL,
  `incentive_type` ENUM('single_percentage', 'ranged_percentage', 'fixed', 'ranged_fixed') NOT NULL,
  `value` DECIMAL(15,2) NULL,
  `ranges` JSON NULL,
  `selected_month` DATE NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`incentive_sales_id`),
  INDEX `idx_cluster_type` (`cluster_type`),
  INDEX `idx_incentive_type` (`incentive_type`),
  UNIQUE KEY `uq_cluster_type_selected_month` (`cluster_type`, `selected_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;