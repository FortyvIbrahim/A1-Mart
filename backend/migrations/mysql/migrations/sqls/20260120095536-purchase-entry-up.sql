ALTER TABLE `purchase_entry`
ADD COLUMN `accounts_file` VARCHAR(500) NULL AFTER `invoice_file`;