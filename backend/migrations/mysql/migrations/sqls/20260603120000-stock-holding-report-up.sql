CREATE TABLE `stock_holding_report` (
  `stock_holding_report_id` INT NOT NULL AUTO_INCREMENT,
  `report_name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `created_by` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stock_holding_report_id`),
  KEY `idx_stock_holding_report_date` (`date`),
  KEY `idx_stock_holding_report_created_by` (`created_by`),
  CONSTRAINT `fk_stock_holding_report_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `employees`(`employee_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `stock_holding_items` (
  `stock_holding_item_id` INT NOT NULL AUTO_INCREMENT,
  `stock_holding_report_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  `purchase_type` VARCHAR(100) NULL,
  `current_stock` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `current_stock_value` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `stock_duration` VARCHAR(100) NULL,
  `status` VARCHAR(100) NULL,
  `chain_bill_count_level` VARCHAR(100) NULL,
  `manufacturer_name` VARCHAR(255) NULL,
  `distributor_name` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stock_holding_item_id`),
  UNIQUE KEY `uq_stock_holding_report_product_branch` (`stock_holding_report_id`, `product_id`, `branch_id`),
  KEY `idx_stock_holding_items_report_id` (`stock_holding_report_id`),
  KEY `idx_stock_holding_items_product_id` (`product_id`),
  KEY `idx_stock_holding_items_branch_id` (`branch_id`),
  CONSTRAINT `fk_stock_holding_items_report`
    FOREIGN KEY (`stock_holding_report_id`) REFERENCES `stock_holding_report`(`stock_holding_report_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_stock_holding_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`),
  CONSTRAINT `fk_stock_holding_items_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
