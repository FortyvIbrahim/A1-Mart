ALTER TABLE `grn` 
ADD COLUMN `purchase_order_id` INT NULL DEFAULT NULL 
AFTER `credit_note_link`;