-- SQL queries for purchase_acknowledgment table and stickering table alteration

-- 1. Create purchase_acknowledgment table
CREATE TABLE `purchase_acknowledgment` (
  `purchase_acknowledgment_id` INT NOT NULL AUTO_INCREMENT,
  `supplier_id` BIGINT NOT NULL,
  `invoice_no` VARCHAR(255) NOT NULL,
  `invoice_date` DATE NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_acknowledgment_id`),
  INDEX `idx_supplier_id` (`supplier_id`),
  INDEX `idx_invoice_no` (`invoice_no`),
  CONSTRAINT `fk_purchase_acknowledgment_supplier` 
    FOREIGN KEY (`supplier_id`) REFERENCES `master_list` (`master_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Alter stickering table to add purchase_acknowledgment_id
ALTER TABLE `stickering` 
  ADD `purchase_acknowledgment_id` INT NULL AFTER `wastage`,
  ADD INDEX `idx_purchase_acknowledgment_id` (`purchase_acknowledgment_id`),
  ADD CONSTRAINT `fk_stickering_purchase_acknowledgment` 
    FOREIGN KEY (`purchase_acknowledgment_id`) REFERENCES `purchase_acknowledgment` (`purchase_acknowledgment_id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

