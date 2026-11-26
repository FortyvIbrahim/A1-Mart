ALTER TABLE `purchase_returns`
  ADD COLUMN `receiving_branch_id` INT NULL DEFAULT NULL AFTER `receipt_entry_handled_by`,
  ADD KEY `idx_purchase_returns_receiving_branch_id` (`receiving_branch_id`),
  ADD CONSTRAINT `fk_purchase_returns_receiving_branch`
    FOREIGN KEY (`receiving_branch_id`) REFERENCES `branches` (`branch_id`)
    ON UPDATE CASCADE ON DELETE SET NULL;