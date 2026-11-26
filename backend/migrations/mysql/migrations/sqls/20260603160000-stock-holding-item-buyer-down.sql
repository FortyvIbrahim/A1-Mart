ALTER TABLE `stock_holding_items`
  DROP FOREIGN KEY `fk_stock_holding_items_buyer`,
  DROP KEY `idx_stock_holding_items_buyer_id`,
  DROP COLUMN `buyer_id`;
