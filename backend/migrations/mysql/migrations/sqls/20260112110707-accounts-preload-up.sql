CREATE TABLE `accounts_preload_data` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `no_of_bills` INT NOT NULL DEFAULT 0,
  `no_of_items` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_sales` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `billing_counter_id` INT NULL,
  `branch_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_accounts_preload_data_branch_id` (`branch_id`),
  KEY `idx_accounts_preload_data_billing_counter_id` (`billing_counter_id`),
  KEY `idx_accounts_preload_data_date` (`date`),
  CONSTRAINT `fk_accounts_preload_data_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_accounts_preload_data_billing_counter`
    FOREIGN KEY (`billing_counter_id`) REFERENCES `billing_counter`(`counter_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;