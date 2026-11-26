-- MySQL query to create incentive_stickering table
CREATE TABLE `incentive_stickering` (
  `incentive_stickering_id` INT NOT NULL AUTO_INCREMENT,
  `material_type` ENUM('single', 'double', 'looping') NOT NULL,
  `incentive_type` ENUM('single_percentage', 'ranged_percentage', 'fixed', 'ranged_fixed') NOT NULL,
  `value` DECIMAL(15,2) NULL,
  `ranges` JSON NULL,
  `selected_month` DATE NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`incentive_stickering_id`),
  INDEX `idx_material_type` (`material_type`),
  INDEX `idx_incentive_type` (`incentive_type`),
  UNIQUE KEY `uq_material_type_selected_month` (`material_type`, `selected_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
