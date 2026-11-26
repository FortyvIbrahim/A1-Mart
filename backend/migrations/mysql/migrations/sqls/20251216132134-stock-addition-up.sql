START TRANSACTION;

CREATE TABLE `stock_addition` (
  `stock_addition_id` int NOT NULL,
  `created_by` int NOT NULL,
  `is_approved` int NOT NULL,
  `invoice_number` varchar(200) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `stock_addition`
  ADD PRIMARY KEY (`stock_addition_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `supplier_id` (`supplier_id`);

ALTER TABLE `stock_addition`
  MODIFY `stock_addition_id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `stock_addition` CHANGE `supplier_id` `supplier_id` BIGINT NULL DEFAULT NULL;

ALTER TABLE `stock_addition`
  ADD CONSTRAINT `stock_addition_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `stock_addition_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `master_list` (`master_id`);

CREATE TABLE `stock_addition_list` (
  `stock_addition_list_id` int NOT NULL,
  `stock_addition_id` int NOT NULL,
  `material_id` int NOT NULL,
  `quantity` int NOT NULL,
  `remark` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `stock_addition_list`
  ADD PRIMARY KEY (`stock_addition_list_id`),
  ADD KEY `stock_addition_id` (`stock_addition_id`);

ALTER TABLE `stock_addition_list`
  MODIFY `stock_addition_list_id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `stock_addition_list`
  ADD CONSTRAINT `stock_addition_list_ibfk_1` FOREIGN KEY (`stock_addition_id`) REFERENCES `stock_addition` (`stock_addition_id`);

COMMIT;