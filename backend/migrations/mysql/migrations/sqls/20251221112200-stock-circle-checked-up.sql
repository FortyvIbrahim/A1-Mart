CREATE TABLE `stock_circle_checked` (`stock_circle_id` INT NOT NULL , `product_id` INT NOT NULL , `checked_stock` INT NOT NULL , `created_by` VARCHAR(50) NOT NULL , `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ) ENGINE = InnoDB;
ALTER TABLE `stock_circle_checked` ADD PRIMARY KEY(`stock_circle_id`, `product_id`);

ALTER TABLE `stock_circle_checked` 
MODIFY COLUMN `created_by` VARCHAR(50) 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci 
NOT NULL;