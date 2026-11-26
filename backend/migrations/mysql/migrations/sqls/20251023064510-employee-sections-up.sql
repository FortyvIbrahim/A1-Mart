START TRANSACTION;

CREATE TABLE `employee_sections` (
  `section_id` int NOT NULL,
  `section_code` varchar(50) NOT NULL,
  `section_name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `employee_sections`
  ADD PRIMARY KEY (`section_id`),
  ADD UNIQUE KEY `section_code` (`section_code`);

ALTER TABLE `employee_sections`
  MODIFY `section_id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `employee_sections` CHANGE `section_name` `section_name` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL;

ALTER TABLE `employees` ADD `section_id` INT NULL AFTER `department_id`;

ALTER TABLE `employees` ADD FOREIGN KEY (`section_id`) REFERENCES `employee_sections`(`section_id`);
COMMIT;