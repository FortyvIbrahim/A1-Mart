-- Purchase Order (new schema): header + items + items_stock
-- Run manually; not in migrations.
-- Uses po_header, po_items, po_items_stock to avoid conflicting with existing purchase_order / purchase_order_items.

-- 1) Header: one row per order
CREATE TABLE `po_header` (
  `po_id` INT NOT NULL AUTO_INCREMENT,
  `raised_date` DATE NULL DEFAULT NULL,
  `buyer_id` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_id` BIGINT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`po_id`),
  KEY `idx_po_header_buyer_id` (`buyer_id`),
  KEY `idx_po_header_supplier_id` (`supplier_id`),
  CONSTRAINT `fk_po_header_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `employees` (`employee_code`),
  CONSTRAINT `fk_po_header_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `master_list` (`master_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Line items: one row per product in the order
CREATE TABLE `po_items` (
  `po_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `qty` INT NOT NULL DEFAULT 0,
  `mrp` DECIMAL(15,2) NULL DEFAULT NULL,
  `net_cost` DECIMAL(15,2) NULL DEFAULT NULL,
  PRIMARY KEY (`po_id`, `product_id`),
  KEY `idx_po_items_product_id` (`product_id`),
  CONSTRAINT `fk_po_items_header` FOREIGN KEY (`po_id`) REFERENCES `po_header` (`po_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_po_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Stock allocation per branch for each product in the order
CREATE TABLE `po_items_stock` (
  `po_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  `qty` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`po_id`, `product_id`, `branch_id`),
  KEY `idx_po_items_stock_branch_id` (`branch_id`),
  CONSTRAINT `fk_po_items_stock_header` FOREIGN KEY (`po_id`) REFERENCES `po_header` (`po_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_po_items_stock_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  CONSTRAINT `fk_po_items_stock_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
