CREATE TABLE `designations` (`designation_id` INT NOT NULL AUTO_INCREMENT , `designation_name` VARCHAR(100) NOT NULL , `is_active` BOOLEAN NOT NULL DEFAULT TRUE , `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , PRIMARY KEY (`designation_id`)) ENGINE = InnoDB;
CREATE TABLE `departments` (`department_id` INT NOT NULL AUTO_INCREMENT , `department_name` VARCHAR(100) NOT NULL , `is_active` BOOLEAN NOT NULL DEFAULT TRUE , `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , PRIMARY KEY (`department_id`)) ENGINE = InnoDB;
CREATE TABLE `employees` (
  `employee_code` VARCHAR(50) NOT NULL,
  `employee_name` VARCHAR(150) NOT NULL,
  `designation_id` INT NOT NULL,
  `department_id` INT NOT NULL,
  `gender` ENUM('F','M','O') NOT NULL COMMENT 'F = Female, M = Male, O = Other',
  `marital_status` ENUM('S','M') NULL COMMENT 'S = Single, M = Married',
  `birthdate` DATE NULL,
  `probation` INT NULL,
  `confirmation_date` DATE NULL,
  `termination_date` DATE NULL,
  `email_id` VARCHAR(255) NULL,
  `hours_worked_per_year` DECIMAL(10,2) NULL,
  `hours_worked_per_week` DECIMAL(10,2) NULL,
  `part_time` BOOLEAN NOT NULL DEFAULT FALSE,
  `mobile_number` BIGINT NULL,
  `is_face_registered` BOOLEAN NOT NULL DEFAULT FALSE,
  `termination_reason` VARCHAR(500) NULL,
  `terminated` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_code`),
  KEY `idx_employees_designation_id` (`designation_id`),
  KEY `idx_employees_department_id` (`department_id`),
  UNIQUE KEY `uk_employees_email_id` (`email_id`),
  CONSTRAINT `fk_employees_designation`
    FOREIGN KEY (`designation_id`) REFERENCES `designations`(`designation_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_employees_department`
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `employees` CHANGE `designation_id` `designation_id` INT NULL DEFAULT NULL, CHANGE `department_id` `department_id` INT NULL DEFAULT NULL;
ALTER TABLE `employees` DROP INDEX `uk_employees_email_id`;