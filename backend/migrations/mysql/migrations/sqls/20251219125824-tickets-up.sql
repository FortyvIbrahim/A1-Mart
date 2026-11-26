CREATE TABLE `tasks`
    (`task_id` INT NOT NULL AUTO_INCREMENT ,
    `title` VARCHAR(200) NOT NULL ,
    `description` TEXT NOT NULL ,
    `priority` ENUM('low','medium','high','urgent') NOT NULL ,
    `status` ENUM('open','in_progress','done','closed') NOT NULL ,
    `assigned_to` VARCHAR(50) NOT NULL ,
    `created_by` VARCHAR(50) NOT NULL ,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
    `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
PRIMARY KEY (`task_id`)) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `tasks` CHANGE `assigned_to` `assigned_to` VARCHAR(50) NOT NULL, CHANGE `created_by` `created_by` VARCHAR(50) NOT NULL;
ALTER TABLE `tasks` CHANGE `assigned_to` `assigned_to` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL;

ALTER TABLE `tasks` ADD FOREIGN KEY (`created_by`) REFERENCES employees(`employee_code`);
ALTER TABLE `tasks` ADD FOREIGN KEY (`assigned_to`) REFERENCES employees(`employee_code`);

CREATE TABLE `tasks_files` (`file_id` INT NOT NULL AUTO_INCREMENT , `task_id` INT NOT NULL , `s3_url` TEXT NOT NULL , `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , PRIMARY KEY (`file_id`)) ENGINE = InnoDB;