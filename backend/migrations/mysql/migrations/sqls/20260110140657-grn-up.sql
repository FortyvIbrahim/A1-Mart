-- Create GRN (Goods Receipt Note) table
CREATE TABLE `grn` (
  `grn_id` INT NOT NULL AUTO_INCREMENT,
  `purchase_acknowledgment_id` INT NOT NULL,
  `employee_id` VARCHAR(100) NULL,
  `missing_qty` DECIMAL(15,2) NULL,
  `missing_value` DECIMAL(15,2) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`grn_id`),
  INDEX `idx_purchase_acknowledgment_id` (`purchase_acknowledgment_id`),
  INDEX `idx_employee_id` (`employee_id`),
  CONSTRAINT `fk_grn_purchase_acknowledgment` 
    FOREIGN KEY (`purchase_acknowledgment_id`) REFERENCES `purchase_acknowledgment` (`purchase_acknowledgment_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_grn_employee` 
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_code`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;