SET FOREIGN_KEY_CHECKS = 0;

-- LEDGERS
CREATE TABLE IF NOT EXISTS `ledgers` (
  `ledger_id` INT NOT NULL AUTO_INCREMENT,
  `label` VARCHAR(255) NOT NULL,
  `balance` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ledger_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PAYMENTS (header)
CREATE TABLE IF NOT EXISTS `payments` (
  `payment_id` INT NOT NULL AUTO_INCREMENT,
  `voucher_date` DATE NOT NULL,
  `branch_id` INT NULL,
  `created_by` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `idx_payments_branch_id` (`branch_id`),
  KEY `idx_payments_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PAYMENT ITEMS (detail)
CREATE TABLE IF NOT EXISTS `payment_items` (
  `payment_item_id` INT NOT NULL AUTO_INCREMENT,
  `payment_id` INT NOT NULL,
  `ledger_id` INT NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `narration` VARCHAR(500) NULL,
  `file_url` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_item_id`),
  KEY `idx_payment_items_payment_id` (`payment_id`),
  KEY `idx_payment_items_ledger_id` (`ledger_id`),
  CONSTRAINT `fk_payment_items_payment`
    FOREIGN KEY (`payment_id`) REFERENCES `payments`(`payment_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_payment_items_ledger`
    FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`ledger_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RECEIPTS (header)
CREATE TABLE IF NOT EXISTS `receipts` (
  `receipt_id` INT NOT NULL AUTO_INCREMENT,
  `voucher_date` DATE NOT NULL,
  `branch_id` INT NULL,
  `created_by` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`receipt_id`),
  KEY `idx_receipts_branch_id` (`branch_id`),
  KEY `idx_receipts_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RECEIPT ITEMS (detail)
CREATE TABLE IF NOT EXISTS `receipt_items` (
  `receipt_item_id` INT NOT NULL AUTO_INCREMENT,
  `receipt_id` INT NOT NULL,
  `ledger_id` INT NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `narration` VARCHAR(500) NULL,
  `file_url` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`receipt_item_id`),
  KEY `idx_receipt_items_receipt_id` (`receipt_id`),
  KEY `idx_receipt_items_ledger_id` (`ledger_id`),
  CONSTRAINT `fk_receipt_items_receipt`
    FOREIGN KEY (`receipt_id`) REFERENCES `receipts`(`receipt_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_receipt_items_ledger`
    FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`ledger_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `ledgers` (`ledger_id`, `label`, `balance`, `created_at`, `updated_at`) VALUES ('1', 'Administative Expenses', '0.00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

SET FOREIGN_KEY_CHECKS = 1;

