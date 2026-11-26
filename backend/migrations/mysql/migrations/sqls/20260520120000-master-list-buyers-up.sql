CREATE TABLE `master_list_buyers` (
  `master_id` BIGINT NOT NULL,
  `employee_id` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`master_id`, `employee_id`),
  KEY `idx_master_list_buyers_employee_id` (`employee_id`),
  CONSTRAINT `fk_master_list_buyers_master`
    FOREIGN KEY (`master_id`) REFERENCES `master_list`(`master_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_master_list_buyers_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_code`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
