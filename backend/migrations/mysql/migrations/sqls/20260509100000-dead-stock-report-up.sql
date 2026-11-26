CREATE TABLE `dead_stock_report` (
  `dead_stock_report_id` INT NOT NULL AUTO_INCREMENT,
  `report_name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `created_by` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`dead_stock_report_id`),
  KEY `idx_dead_stock_report_date` (`date`),
  KEY `idx_dead_stock_report_created_by` (`created_by`),
  CONSTRAINT `fk_dead_stock_report_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `employees`(`employee_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `dead_stock_products` (
  `dead_stock_product_id` INT NOT NULL AUTO_INCREMENT,
  `dead_stock_report_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `30_days_stock` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `30_days_stock_value` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `90_days_stock` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `90_days_stock_value` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `120_days_stock` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `120_days_stock_value` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `than_120_days_stock` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `than_120_days_stock_value` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`dead_stock_product_id`),
  UNIQUE KEY `uq_dead_stock_report_product` (`dead_stock_report_id`, `product_id`),
  KEY `idx_dead_stock_products_product_id` (`product_id`),
  CONSTRAINT `fk_dead_stock_products_report`
    FOREIGN KEY (`dead_stock_report_id`) REFERENCES `dead_stock_report`(`dead_stock_report_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_dead_stock_products_product`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
