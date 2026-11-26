CREATE TABLE `billing_counter` (`counter_id` INT NOT NULL AUTO_INCREMENT , `counter_name` VARCHAR(200) NOT NULL , `branch_id` INT NOT NULL , `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , PRIMARY KEY (`counter_id`)) ENGINE = InnoDB;

ALTER TABLE `billing_counter` 
ADD CONSTRAINT `fk_billing_counter_branch_id` 
FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add the billing_counter_id column
ALTER TABLE `accounts_sheet` 
ADD COLUMN `billing_counter_id` INT NULL AFTER `employee_id`;

-- Add the foreign key constraint
ALTER TABLE `accounts_sheet` 
ADD CONSTRAINT `fk_accounts_sheet_billing_counter` 
FOREIGN KEY (`billing_counter_id`) REFERENCES `billing_counter`(`counter_id`) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add an index for better query performance
ALTER TABLE `accounts_sheet` 
ADD INDEX `idx_accounts_sheet_billing_counter_id` (`billing_counter_id`);