-- Add branch_id column to stock_circles table
ALTER TABLE `stock_circles` 
ADD COLUMN `branch_id` INT NULL 
AFTER `subcategory_id`,
ADD INDEX `idx_branch_id` (`branch_id`),
ADD CONSTRAINT `stock_circles_ibfk_branch` 
  FOREIGN KEY (`branch_id`) 
  REFERENCES `branches` (`branch_id`) 
  ON DELETE RESTRICT;
