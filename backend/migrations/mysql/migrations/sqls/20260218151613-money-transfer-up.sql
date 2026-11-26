CREATE TABLE IF NOT EXISTS `money_transfer` (
  `money_transfer_id` INT NOT NULL AUTO_INCREMENT,
  `from_branch_id` INT NOT NULL,
  `to_branch_id` INT NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `account_asset_id` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`money_transfer_id`),
  KEY `idx_money_transfer_from_branch` (`from_branch_id`),
  KEY `idx_money_transfer_to_branch` (`to_branch_id`),
  KEY `idx_money_transfer_account_asset` (`account_asset_id`),
  CONSTRAINT `fk_money_transfer_from_branch`
    FOREIGN KEY (`from_branch_id`) REFERENCES `branches`(`branch_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_money_transfer_to_branch`
    FOREIGN KEY (`to_branch_id`) REFERENCES `branches`(`branch_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_money_transfer_account_asset`
    FOREIGN KEY (`account_asset_id`) REFERENCES `account_assets`(`account_asset_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
