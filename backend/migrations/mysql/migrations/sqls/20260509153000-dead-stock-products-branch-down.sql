ALTER TABLE `dead_stock_products`
  DROP FOREIGN KEY `fk_dead_stock_products_branch`;

ALTER TABLE `dead_stock_products`
  DROP INDEX `idx_dead_stock_products_branch_id`;

ALTER TABLE `dead_stock_products`
  DROP INDEX `uq_dead_stock_report_product_branch`,
  ADD UNIQUE KEY `uq_dead_stock_report_product` (`dead_stock_report_id`, `product_id`);

ALTER TABLE `dead_stock_products`
  DROP COLUMN `branch_id`;
