ALTER TABLE `employee_sales` ADD UNIQUE(`date`, `employee_code`);
ALTER TABLE `employee_sales` CHANGE `sales_amount` `sales_amount` DECIMAL(10,2) NOT NULL;