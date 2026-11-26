ALTER TABLE `stock_holding_items`
  ADD COLUMN `buyer_id` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `distributor_name`,
  ADD KEY `idx_stock_holding_items_buyer_id` (`buyer_id`),
  ADD CONSTRAINT `fk_stock_holding_items_buyer`
    FOREIGN KEY (`buyer_id`) REFERENCES `employees`(`employee_code`);
