ALTER TABLE `products`
  ADD COLUMN `holding_days` INT NULL AFTER `store_uom`;

ALTER TABLE `stock_holding_items`
  MODIFY COLUMN `stock_duration` INT NULL;
