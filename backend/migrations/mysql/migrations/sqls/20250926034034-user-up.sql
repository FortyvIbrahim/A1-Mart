CREATE TABLE `user` (
  `user_id` int NOT NULL,
  `username` varchar(100) NOT NULL,
  `user_type` int NOT NULL,
  `employee_id` int DEFAULT NULL,
  `password` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` tinyint NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_types` (`user_type_id` INT NOT NULL AUTO_INCREMENT , `type_name` VARCHAR(100) NOT NULL , `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , PRIMARY KEY (`user_type_id`)) ENGINE = InnoDB;

ALTER TABLE user
ADD CONSTRAINT fk_user_type
FOREIGN KEY (user_type)
REFERENCES user_types(user_type_id);

INSERT INTO `user_types` (`user_type_id`, `type_name`, `created_at`, `updated_at`) VALUES
(NULL, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, 'api', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);