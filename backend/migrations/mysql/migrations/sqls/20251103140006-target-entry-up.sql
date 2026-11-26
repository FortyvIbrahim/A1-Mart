START TRANSACTION;

CREATE TABLE `employee_sales` (`date` DATE NOT NULL , `employee_code` VARCHAR(50) CHARACTER SET utf16 COLLATE utf16_unicode_ci NOT NULL , `sales_amount` INT NOT NULL , `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ) ENGINE = InnoDB;
ALTER TABLE `employee_sales` ADD UNIQUE(`date`, `employee_code`);
ALTER TABLE `employee_sales` CHANGE `employee_code` `employee_code` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;
ALTER TABLE `employee_sales` ADD FOREIGN KEY (`employee_code`) REFERENCES `employees`(`employee_code`);

COMMIT;