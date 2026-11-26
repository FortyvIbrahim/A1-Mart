-- Account assets (e.g. cash, bank)
CREATE TABLE IF NOT EXISTS `account_assets` (
  `account_asset_id` INT NOT NULL AUTO_INCREMENT,
  `label` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-branch balance for each account asset
CREATE TABLE IF NOT EXISTS `account_asset_balances` (
  `account_asset_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  `balance` DECIMAL(15,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`account_asset_id`, `branch_id`),
  CONSTRAINT `fk_account_asset_balances_asset`
    FOREIGN KEY (`account_asset_id`) REFERENCES `account_assets`(`account_asset_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_account_asset_balances_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Link payments to an account asset (optional). Payment total reduces that asset's balance.
ALTER TABLE `payments`
  ADD COLUMN `account_asset_id` INT NULL AFTER `created_by`,
  ADD KEY `idx_payments_account_asset_id` (`account_asset_id`),
  ADD CONSTRAINT `fk_payments_account_asset`
    FOREIGN KEY (`account_asset_id`) REFERENCES `account_assets`(`account_asset_id`)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- Link receipts to an account asset (optional). Receipt total increases that asset's balance.
ALTER TABLE `receipts`
  ADD COLUMN `account_asset_id` INT NULL AFTER `created_by`,
  ADD KEY `idx_receipts_account_asset_id` (`account_asset_id`),
  ADD CONSTRAINT `fk_receipts_account_asset`
    FOREIGN KEY (`account_asset_id`) REFERENCES `account_assets`(`account_asset_id`)
    ON UPDATE CASCADE ON DELETE SET NULL;
