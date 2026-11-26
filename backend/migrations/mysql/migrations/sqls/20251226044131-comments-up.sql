CREATE TABLE IF NOT EXISTS `task_comments` (
  `task_comment_id` INT NOT NULL AUTO_INCREMENT,
  `task_id` INT NOT NULL,
  `message` TEXT NOT NULL,
  `created_by` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`task_comment_id`),
  KEY `idx_task_comments_task_id` (`task_id`),
  KEY `idx_task_comments_created_by` (`created_by`),
  KEY `idx_task_comments_created_at` (`created_at`),
  CONSTRAINT `fk_task_comments_task`
    FOREIGN KEY (`task_id`) REFERENCES `tasks`(`task_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_task_comments_employee`
    FOREIGN KEY (`created_by`) REFERENCES `employees`(`employee_code`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `task_comment_files` (
  `task_comment_file_id` INT NOT NULL AUTO_INCREMENT,
  `task_comment_id` INT NOT NULL,
  `file_url` VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`task_comment_file_id`),
  KEY `idx_task_comment_files_task_comment_id` (`task_comment_id`),
  CONSTRAINT `fk_task_comment_files_task_comment`
    FOREIGN KEY (`task_comment_id`) REFERENCES `task_comments`(`task_comment_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
