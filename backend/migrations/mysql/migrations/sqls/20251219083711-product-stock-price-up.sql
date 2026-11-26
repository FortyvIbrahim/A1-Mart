CREATE TABLE `product_stock_price` (`product_id` INT NOT NULL , `branch_id` INT NOT NULL , `stock` INT NOT NULL , `cost_price` FLOAT NOT NULL , `selling_price` FLOAT NOT NULL , `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ) ENGINE = InnoDB;
ALTER TABLE `product_stock_price` ADD PRIMARY KEY(`product_id`, `branch_id`);

ALTER TABLE `product_stock_price`
  ADD CONSTRAINT `product_stock_price_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  ADD CONSTRAINT `product_stock_price_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);