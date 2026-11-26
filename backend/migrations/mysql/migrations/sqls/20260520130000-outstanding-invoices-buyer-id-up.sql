ALTER TABLE `outstanding_invoices`
  ADD COLUMN `buyer_id` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `supplier_id`,
  ADD KEY `idx_outstanding_invoices_buyer_id` (`buyer_id`),
  ADD CONSTRAINT `fk_outstanding_invoices_buyer`
    FOREIGN KEY (`buyer_id`) REFERENCES `employees`(`employee_code`)
    ON DELETE SET NULL;
