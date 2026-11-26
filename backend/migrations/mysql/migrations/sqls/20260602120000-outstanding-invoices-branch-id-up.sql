ALTER TABLE `outstanding_invoices`
  ADD COLUMN `branch_id` INT NULL AFTER `buyer_id`,
  ADD KEY `idx_outstanding_invoices_branch_id` (`branch_id`),
  ADD CONSTRAINT `fk_outstanding_invoices_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`)
    ON DELETE SET NULL;
