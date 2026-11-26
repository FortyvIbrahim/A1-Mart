-- MySQL queries to create purchase_entry and purchase_entry_items tables

CREATE TABLE IF NOT EXISTS `purchase_entry` (
  `purchase_entry_id` INT NOT NULL AUTO_INCREMENT,
  `purchase_order_id` INT NULL,
  `invoice_no` VARCHAR(255) NULL,
  `invoice_date` DATE NULL,
  `invoice_file` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_entry_id`),
  KEY `idx_purchase_entry_purchase_order_id` (`purchase_order_id`),
  KEY `idx_purchase_entry_invoice_date` (`invoice_date`),
  CONSTRAINT `fk_purchase_entry_purchase_order`
    FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_order`(`purchase_order_id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_entry_items` (
  `purchase_entry_item_id` INT NOT NULL AUTO_INCREMENT,
  `purchase_entry_id` INT NOT NULL,
  `material_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `rate` DECIMAL(15,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_entry_item_id`),
  KEY `idx_purchase_entry_items_purchase_entry_id` (`purchase_entry_id`),
  KEY `idx_purchase_entry_items_material_id` (`material_id`),
  CONSTRAINT `fk_purchase_entry_items_purchase_entry`
    FOREIGN KEY (`purchase_entry_id`) REFERENCES `purchase_entry`(`purchase_entry_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `purchase_order` CHANGE `vendor_id` `vendor_id` BIGINT NOT NULL;

