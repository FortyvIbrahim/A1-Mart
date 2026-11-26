CREATE TABLE `checklist_forms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `checklist_form_report_to_designations` (
  `form_id` INT NOT NULL,
  `designation_id` INT NOT NULL,
  PRIMARY KEY (`form_id`, `designation_id`),
  KEY `idx_checklist_form_report_to_designations_designation_id` (`designation_id`),
  CONSTRAINT `fk_checklist_form_report_to_designations_form`
    FOREIGN KEY (`form_id`) REFERENCES `checklist_forms` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_checklist_form_report_to_designations_designation`
    FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `checklist_questions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `form_id` INT NOT NULL,
  `sort_order` INT NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT NULL,
  `question_type` ENUM('boolean','numeric','text','media','date','date_time') NOT NULL,
  `fill_at_from` TIME NULL,
  `fill_at_to` TIME NULL,
  `is_required` TINYINT(1) NOT NULL DEFAULT 0,
  `record_audio` TINYINT(1) NOT NULL DEFAULT 0,
  `take_image` TINYINT(1) NOT NULL DEFAULT 0,
  `is_image_optional` TINYINT(1) NOT NULL DEFAULT 0,
  `take_video` TINYINT(1) NOT NULL DEFAULT 0,
  `is_video_optional` TINYINT(1) NOT NULL DEFAULT 0,
  `allow_comment` TINYINT(1) NOT NULL DEFAULT 0,
  `is_comment_optional` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_checklist_questions_form_id` (`form_id`),
  KEY `idx_checklist_questions_sort_order` (`form_id`, `sort_order`),
  CONSTRAINT `fk_checklist_questions_form`
    FOREIGN KEY (`form_id`) REFERENCES `checklist_forms` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `checklist_submissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `checklist_form_id` INT NOT NULL,
  `local_date` DATE NOT NULL,
  `answers` JSON NOT NULL,
  `updated_by_user_id` INT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_checklist_submissions_form_date` (`checklist_form_id`, `local_date`),
  KEY `idx_checklist_submissions_form_id` (`checklist_form_id`),
  KEY `idx_checklist_submissions_local_date` (`local_date`),
  CONSTRAINT `fk_checklist_submissions_form`
    FOREIGN KEY (`checklist_form_id`) REFERENCES `checklist_forms` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_checklist_submissions_updated_by_user`
    FOREIGN KEY (`updated_by_user_id`) REFERENCES `user` (`user_id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;