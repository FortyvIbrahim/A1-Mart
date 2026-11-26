ALTER TABLE `payments`
  ADD COLUMN `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 AFTER `account_asset_id`,
  ADD COLUMN `deleted_by` VARCHAR(50) NULL DEFAULT NULL AFTER `is_deleted`;

ALTER TABLE `receipts`
  ADD COLUMN `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 AFTER `account_asset_id`,
  ADD COLUMN `deleted_by` VARCHAR(50) NULL DEFAULT NULL AFTER `is_deleted`;
