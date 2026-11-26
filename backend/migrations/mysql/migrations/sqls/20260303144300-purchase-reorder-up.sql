CREATE TABLE `purchase_reorders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `qty` DECIMAL(15,4) NOT NULL DEFAULT 0,
  `mrp` DECIMAL(15,4) NULL DEFAULT NULL,
  `cost_price` DECIMAL(15,4) NULL DEFAULT NULL,
  `discount` DECIMAL(15,4) NULL DEFAULT NULL,
  `order_worth` DECIMAL(15,4) NULL DEFAULT NULL,
  `tax_amount` DECIMAL(15,4) NULL DEFAULT NULL,
  `buyer_id` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'employee_code from employees',
  `supplier_id` BIGINT NOT NULL,
  `is_purchased` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_purchase_reorders_product_buyer_supplier` (`product_id`, `buyer_id`, `supplier_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_buyer_id` (`buyer_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  CONSTRAINT `fk_purchase_reorders_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  CONSTRAINT `fk_purchase_reorders_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `employees` (`employee_code`),
  CONSTRAINT `fk_purchase_reorders_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `master_list` (`master_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `purchase_reorders` CHANGE `qty` `qty` DECIMAL(15,2) NOT NULL DEFAULT '0.0000', CHANGE `mrp` `mrp` DECIMAL(15,2) NULL DEFAULT NULL, CHANGE `cost_price` `cost_price` DECIMAL(15,2) NULL DEFAULT NULL, CHANGE `discount` `discount` DECIMAL(15,2) NULL DEFAULT NULL, CHANGE `order_worth` `order_worth` DECIMAL(15,2) NULL DEFAULT NULL, CHANGE `tax_amount` `tax_amount` DECIMAL(15,2) NULL DEFAULT NULL;
ALTER TABLE `purchase_reorders` CHANGE `qty` `qty` INT NOT NULL DEFAULT '0';