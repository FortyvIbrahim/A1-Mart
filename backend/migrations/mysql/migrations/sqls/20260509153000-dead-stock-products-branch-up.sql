ALTER TABLE `dead_stock_products`
  ADD COLUMN `branch_id` INT NOT NULL AFTER `product_id`;

ALTER TABLE `dead_stock_products`
  DROP INDEX `uq_dead_stock_report_product`,
  ADD UNIQUE KEY `uq_dead_stock_report_product_branch` (`dead_stock_report_id`, `product_id`, `branch_id`);

ALTER TABLE `dead_stock_products`
  ADD KEY `idx_dead_stock_products_branch_id` (`branch_id`);

ALTER TABLE `dead_stock_products`
  ADD CONSTRAINT `fk_dead_stock_products_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`);
