START TRANSACTION;

CREATE TABLE `stock_circle_departments` (
  `stock_circle_id` INT NOT NULL,
  `department_id` INT NOT NULL,
  PRIMARY KEY (`stock_circle_id`, `department_id`),
  CONSTRAINT `fk_stock_circle_departments_circle`
    FOREIGN KEY (`stock_circle_id`) REFERENCES `stock_circles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_circle_departments_department`
    FOREIGN KEY (`department_id`) REFERENCES `products_department` (`department_id`) ON DELETE RESTRICT,
  INDEX `idx_stock_circle_departments_department` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `stock_circle_departments` (`stock_circle_id`, `department_id`)
SELECT `id`, `department_id` FROM `stock_circles`;

ALTER TABLE `stock_circles`
  DROP FOREIGN KEY `stock_circles_ibfk_1`;

ALTER TABLE `stock_circles`
  DROP COLUMN `department_id`;

ALTER TABLE `stock_circles`
  MODIFY COLUMN `period_type`
    ENUM('yearly', 'biyearly', 'quarterly', 'monthly', 'daily', 'term')
    NOT NULL;

COMMIT;
