CREATE TABLE `stickering` (
  `stickering_id` INT NOT NULL AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `qty` INT NOT NULL,
  `employee_code` VARCHAR(100) NOT NULL,
  `status` ENUM('open', 'in_progress', 'done', 'cancelled') NOT NULL DEFAULT 'open',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stickering_id`),
  INDEX `idx_product_id` (`product_id`),
  INDEX `idx_employee_code` (`employee_code`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `stickering` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `stickering` 
  ADD `packing` INT NULL AFTER `qty`,
  ADD `loose` INT NULL AFTER `packing`,
  ADD `pur_ret` INT NULL AFTER `loose`,
  ADD `wastage` INT NULL AFTER `pur_ret`;

ALTER TABLE `branches` ADD `cluster_size` ENUM('small', 'medium', 'large') NULL AFTER `branch_nickname`;