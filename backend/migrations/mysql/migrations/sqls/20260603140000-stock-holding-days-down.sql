ALTER TABLE `stock_holding_items`
  MODIFY COLUMN `stock_duration` VARCHAR(100) NULL;

ALTER TABLE `products`
  DROP COLUMN `holding_days`;
