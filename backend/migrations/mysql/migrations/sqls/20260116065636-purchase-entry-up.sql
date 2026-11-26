CREATE TABLE `wms_purchase_entry` (
  `purchase_entry_id` INT NOT NULL AUTO_INCREMENT,
  `purchase_acknowledgment_id` INT NOT NULL,
  `invoice_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `handled_by` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_entry_id`),
  KEY `idx_wms_purchase_entry_ack_id` (`purchase_acknowledgment_id`),
  KEY `idx_wms_purchase_entry_handled_by` (`handled_by`),
  CONSTRAINT `fk_wms_purchase_entry_employee`
    FOREIGN KEY (`handled_by`) REFERENCES `employees`(`employee_code`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_wms_purchase_entry_acknowledgment`
    FOREIGN KEY (`purchase_acknowledgment_id`) REFERENCES `purchase_acknowledgment`(`purchase_acknowledgment_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
