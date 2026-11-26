START TRANSACTION;

CREATE TABLE `materials` (
  `material_id` int NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `unit_id` int DEFAULT NULL,
  `material_category_id` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `materials`
  ADD PRIMARY KEY (`material_id`);

ALTER TABLE `materials`
  MODIFY `material_id` int NOT NULL AUTO_INCREMENT;

CREATE TABLE `material_request` (
  `material_request_id` int NOT NULL,
  `created_by` int NOT NULL,
  `outlet_id` int NOT NULL,
  `is_approved` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `material_request`
  ADD PRIMARY KEY (`material_request_id`),
  ADD KEY `outlet_id` (`outlet_id`),
  ADD KEY `created_by` (`created_by`);

ALTER TABLE `material_request`
  MODIFY `material_request_id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `material_request`
  ADD CONSTRAINT `material_request_ibfk_1` FOREIGN KEY (`outlet_id`) REFERENCES `branches` (`branch_id`),
  ADD CONSTRAINT `material_request_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`);

CREATE TABLE `material_request_list` (
  `material_request_list_id` int NOT NULL,
  `material_request_id` int NOT NULL,
  `material_id` int NOT NULL,
  `quantity` int NOT NULL,
  `remark` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `material_request_list`
  ADD PRIMARY KEY (`material_request_list_id`),
  ADD KEY `material_request_id` (`material_request_id`);

ALTER TABLE `material_request_list`
  MODIFY `material_request_list_id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `material_request_list`
  ADD CONSTRAINT `material_request_list_ibfk_1` FOREIGN KEY (`material_request_id`) REFERENCES `material_request` (`material_request_id`);

CREATE TABLE `materials_category` (
  `material_category_id` int NOT NULL,
  `category_name` varchar(200) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `materials_category`
  ADD PRIMARY KEY (`material_category_id`);

ALTER TABLE `materials_category`
  MODIFY `material_category_id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `user` CHANGE `employee_id` `employee_id` VARCHAR(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NULL DEFAULT NULL;

COMMIT;