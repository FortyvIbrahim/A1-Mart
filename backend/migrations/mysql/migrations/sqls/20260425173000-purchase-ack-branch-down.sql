ALTER TABLE `purchase_acknowledgment`
  DROP FOREIGN KEY `fk_purchase_acknowledgment_branch`,
  DROP INDEX `idx_purchase_acknowledgment_branch_id`,
  DROP COLUMN `branch_id`;
