CREATE TABLE `branches` (
  `branch_id` int NOT NULL,
  `branch_name` varchar(255) DEFAULT NULL,
  `branch_address` varchar(200) DEFAULT NULL,
  `branch_phone` varchar(100) DEFAULT NULL,
  `phone` text,
  `branch_nickname` varchar(100) DEFAULT NULL,
  `telegram_chat_id` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;