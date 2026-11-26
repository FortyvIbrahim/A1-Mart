ALTER TABLE `stock_holding_items`
  ADD COLUMN `stock_on_order` DECIMAL(12,3) NULL AFTER `current_stock_value`;
