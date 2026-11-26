CREATE TABLE `accounts_sheet` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `employee_id` VARCHAR(50) NOT NULL,
  `no_of_bills` INT NOT NULL DEFAULT 0,
  `no_of_items` INT NOT NULL DEFAULT 0,
  `total_sales` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `cash_sales` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `cash_type` ENUM('excess', 'short', 'exact') NOT NULL DEFAULT 'exact',
  `cash_reason` VARCHAR(500) NULL,
  `card_sales` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `card_type` ENUM('excess', 'short', 'exact') NOT NULL DEFAULT 'exact',
  `card_reason` VARCHAR(500) NULL,
  `paytm_sales` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `paytm_type` ENUM('excess', 'short', 'exact') NOT NULL DEFAULT 'exact',
  `paytm_reason` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_accounts_sheet_employee_id` (`employee_id`),
  KEY `idx_accounts_sheet_date` (`date`),
  CONSTRAINT `fk_accounts_sheet_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_code`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;