START TRANSACTION;
-- MySQL queries to create purchase_order and purchase_order_items tables

CREATE TABLE IF NOT EXISTS `purchase_order` (
  `purchase_order_id` INT NOT NULL AUTO_INCREMENT,
  `purchase_order_ref` VARCHAR(255) NULL,
  `vendor_id` INT NOT NULL,
  `date` DATE NULL,
  `delivery_date` DATE NULL,
  `discount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `adjustment` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `tax` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('active', 'inactive', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_order_id`),
  KEY `idx_purchase_order_vendor_id` (`vendor_id`),
  KEY `idx_purchase_order_status` (`status`),
  KEY `idx_purchase_order_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `purchase_order_item_id` INT NOT NULL AUTO_INCREMENT,
  `purchase_order_id` INT NOT NULL,
  `material_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `rate` DECIMAL(15,2) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_order_item_id`),
  KEY `idx_purchase_order_items_purchase_order_id` (`purchase_order_id`),
  KEY `idx_purchase_order_items_material_id` (`material_id`),
  CONSTRAINT `fk_purchase_order_items_purchase_order`
    FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_order`(`purchase_order_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_order_pdf` (
  `purchase_order_pdf_id` INT NOT NULL AUTO_INCREMENT,
  `purchase_order_id` INT NOT NULL,
  `pdf_path` VARCHAR(500) NOT NULL,
  `pdf_filename` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_order_pdf_id`),
  KEY `idx_purchase_order_pdf_purchase_order_id` (`purchase_order_id`),
  KEY `idx_purchase_order_pdf_created_at` (`created_at`),
  CONSTRAINT `fk_purchase_order_pdf_purchase_order`
    FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_order`(`purchase_order_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `purchase_order` 
MODIFY COLUMN `status` ENUM('raised', 'approved', 'purchased') 
NOT NULL DEFAULT 'raised';

ALTER TABLE `purchase_order_items` 
DROP COLUMN `stock`;

COMMIT;