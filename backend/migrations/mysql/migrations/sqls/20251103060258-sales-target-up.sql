START TRANSACTION;

CREATE TABLE `target_branch` (`target_branch_id` INT NOT NULL AUTO_INCREMENT , `branch_id` INT NOT NULL , `target_amount` INT NOT NULL , `target_month` DATE NOT NULL , `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , PRIMARY KEY (`target_branch_id`)) ENGINE = InnoDB;


ALTER TABLE `target_branch` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`);
ALTER TABLE `target_branch` CHANGE `target_amount` `target_amount` DECIMAL NOT NULL;
ALTER TABLE `target_branch` ADD UNIQUE(`branch_id`, `target_month`);


CREATE TABLE `target_department` (`target_department_id` INT NOT NULL AUTO_INCREMENT , `branch_id` INT NOT NULL , `department_id` INT NOT NULL , `target_amount` DECIMAL NOT NULL , `target_date` DATE NOT NULL , `created_at` TIMESTAMP NOT NULL , `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL , PRIMARY KEY (`target_department_id`)) ENGINE = InnoDB;

ALTER TABLE `target_department` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`);
ALTER TABLE `target_department` ADD FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`);
ALTER TABLE `target_department` ADD UNIQUE(`branch_id`, `department_id`, `target_date`);
ALTER TABLE `target_department` CHANGE `created_at` `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CHANGE `updated_at` `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;


CREATE TABLE `target_section` (`target_section_id` INT NOT NULL AUTO_INCREMENT , `branch_id` INT NOT NULL , `department_id` INT NOT NULL , `section_id` INT NOT NULL , `target_amount` DECIMAL NOT NULL , `target_date` DATE NOT NULL , `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , PRIMARY KEY (`target_section_id`)) ENGINE = InnoDB;

ALTER TABLE `target_section` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`);
ALTER TABLE `target_section` ADD FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`);
ALTER TABLE `target_section` ADD FOREIGN KEY (`section_id`) REFERENCES `employee_sections`(`section_id`);


CREATE TABLE `target_employee` (`target_employee_id` INT NOT NULL AUTO_INCREMENT , `branch_id` INT NOT NULL , `department_id` INT NOT NULL , `section_id` INT NOT NULL,`employee_id` varchar(50) NOT NULL  , `target_amount` DECIMAL NOT NULL , `target_date` DATE NOT NULL , `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , PRIMARY KEY (`target_employee_id`)) ENGINE = InnoDB;

ALTER TABLE `target_employee` ADD FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`);
ALTER TABLE `target_employee` ADD FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`);
ALTER TABLE `target_employee` ADD FOREIGN KEY (`section_id`) REFERENCES `employee_sections`(`section_id`);
ALTER TABLE `target_employee` CHANGE `employee_id` `employee_id` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE `target_employee` ADD FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_code`);

COMMIT;