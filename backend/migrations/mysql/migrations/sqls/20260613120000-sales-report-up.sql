CREATE TABLE `sales_report` (
  `sales_report_id` INT NOT NULL AUTO_INCREMENT,
  `report_name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `created_by` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sales_report_id`),
  UNIQUE KEY `uq_sales_report_date` (`date`),
  KEY `idx_sales_report_created_by` (`created_by`),
  CONSTRAINT `fk_sales_report_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `employees`(`employee_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `sales_report_items` (
  `sales_report_item_id` INT NOT NULL AUTO_INCREMENT,
  `sales_report_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `sold_qty` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `sold_value` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sales_report_item_id`),
  UNIQUE KEY `uq_sales_report_product_branch` (`sales_report_id`, `product_id`, `branch_id`),
  KEY `idx_sales_report_items_report_id` (`sales_report_id`),
  KEY `idx_sales_report_items_product_id` (`product_id`),
  KEY `idx_sales_report_items_branch_id` (`branch_id`),
  CONSTRAINT `fk_sales_report_items_report`
    FOREIGN KEY (`sales_report_id`) REFERENCES `sales_report`(`sales_report_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_sales_report_items_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`),
  CONSTRAINT `fk_sales_report_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
