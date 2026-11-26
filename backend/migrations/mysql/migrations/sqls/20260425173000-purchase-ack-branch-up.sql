ALTER TABLE `purchase_acknowledgment`
  ADD COLUMN `branch_id` INT NULL AFTER `amount`,
  ADD INDEX `idx_purchase_acknowledgment_branch_id` (`branch_id`),
  ADD CONSTRAINT `fk_purchase_acknowledgment_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
