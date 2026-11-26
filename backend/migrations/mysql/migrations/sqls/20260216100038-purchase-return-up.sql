-- Table 1: purchase_returns (driver_id is employee_code from employees)
CREATE TABLE `purchase_returns` (
  `purchase_return_id` INT NOT NULL AUTO_INCREMENT,
  `driver_id` VARCHAR(50) NOT NULL COMMENT 'employee_code of driver',
  `attachment` VARCHAR(2048) NULL COMMENT 'file url',
  `status` VARCHAR(50) NOT NULL DEFAULT 'open',
  `receipt_entry_handled_by` VARCHAR(50) NULL DEFAULT NULL COMMENT 'employee_code who handled receipt entry',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_return_id`),
  KEY `idx_purchase_returns_driver_id` (`driver_id`),
  KEY `idx_purchase_returns_status` (`status`),
  KEY `idx_purchase_returns_receipt_entry_handled_by` (`receipt_entry_handled_by`),
  CONSTRAINT `fk_purchase_returns_driver`
    FOREIGN KEY (`driver_id`) REFERENCES `employees` (`employee_code`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_purchase_returns_receipt_entry_handled_by`
    FOREIGN KEY (`receipt_entry_handled_by`) REFERENCES `employees` (`employee_code`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: purchase_returns_buyers (employees)
CREATE TABLE `purchase_returns_buyers` (
  `purchase_returns_buyers_id` INT NOT NULL AUTO_INCREMENT,
  `employee_code` VARCHAR(50) NOT NULL,
  `purchase_return_id` INT NOT NULL,
  PRIMARY KEY (`purchase_returns_buyers_id`),
  KEY `idx_purchase_returns_buyers_purchase_return_id` (`purchase_return_id`),
  KEY `idx_purchase_returns_buyers_employee_code` (`employee_code`),
  CONSTRAINT `fk_purchase_returns_buyers_return`
    FOREIGN KEY (`purchase_return_id`) REFERENCES `purchase_returns` (`purchase_return_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_purchase_returns_buyers_employee`
    FOREIGN KEY (`employee_code`) REFERENCES `employees` (`employee_code`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 3: purchase_returns_items (suppliers per buyer)
CREATE TABLE `purchase_returns_items` (
  `purchase_returns_items_id` INT NOT NULL AUTO_INCREMENT,
  `purchase_returns_buyers_id` INT NOT NULL,
  `supplier_id` BIGINT NOT NULL,
  `no_of_boxes` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_returns_items_id`),
  KEY `idx_purchase_returns_items_buyers_id` (`purchase_returns_buyers_id`),
  KEY `idx_purchase_returns_items_supplier_id` (`supplier_id`),
  CONSTRAINT `fk_purchase_returns_items_buyer`
    FOREIGN KEY (`purchase_returns_buyers_id`) REFERENCES `purchase_returns_buyers` (`purchase_returns_buyers_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_purchase_returns_items_supplier`
    FOREIGN KEY (`supplier_id`) REFERENCES `master_list` (`master_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 4: purchase_return_products (products per item/supplier line)
CREATE TABLE `purchase_return_products` (
  `purchase_return_products_id` INT NOT NULL AUTO_INCREMENT,
  `purchase_returns_items_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `qty` INT NOT NULL DEFAULT 0,
  `total_amount` DECIMAL(15,2) NULL DEFAULT NULL,
  `pr_date` VARCHAR(20) NULL DEFAULT NULL,
  `pr_no` VARCHAR(100) NULL DEFAULT NULL,
  `outlet_id` INT NULL DEFAULT NULL,
  PRIMARY KEY (`purchase_return_products_id`),
  KEY `idx_purchase_return_products_items_id` (`purchase_returns_items_id`),
  KEY `idx_purchase_return_products_product_id` (`product_id`),
  CONSTRAINT `fk_purchase_return_products_item`
    FOREIGN KEY (`purchase_returns_items_id`) REFERENCES `purchase_returns_items` (`purchase_returns_items_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_purchase_return_products_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 5: purchase_returns_items_delivered (one row per delivered record; links to many items via junction)
CREATE TABLE `purchase_returns_items_delivered` (
  `purchase_returns_items_delivered_id` INT NOT NULL AUTO_INCREMENT,
  `supplier_id` BIGINT NULL DEFAULT NULL,
  `pick_up_name` VARCHAR(255) NULL DEFAULT NULL,
  `pick_up_number` VARCHAR(50) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_returns_items_delivered_id`),
  KEY `idx_purchase_returns_items_delivered_supplier_id` (`supplier_id`),
  CONSTRAINT `fk_purchase_returns_items_delivered_supplier`
    FOREIGN KEY (`supplier_id`) REFERENCES `master_list` (`master_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 5b: junction – many purchase_returns_items_id per purchase_returns_items_delivered_id
CREATE TABLE `purchase_returns_items_delivered_items` (
  `purchase_returns_items_delivered_id` INT NOT NULL,
  `purchase_returns_items_id` INT NOT NULL,
  PRIMARY KEY (`purchase_returns_items_delivered_id`, `purchase_returns_items_id`),
  KEY `idx_delivered_items_item_id` (`purchase_returns_items_id`),
  CONSTRAINT `fk_delivered_items_delivered`
    FOREIGN KEY (`purchase_returns_items_delivered_id`) REFERENCES `purchase_returns_items_delivered` (`purchase_returns_items_delivered_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_delivered_items_item`
    FOREIGN KEY (`purchase_returns_items_id`) REFERENCES `purchase_returns_items` (`purchase_returns_items_id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;