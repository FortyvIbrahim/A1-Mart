ALTER TABLE `stock_holding_report`
  ADD COLUMN `is_system_sync` TINYINT(1) NOT NULL DEFAULT 0 AFTER `created_by`;
