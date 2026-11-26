START TRANSACTION;

UPDATE `stock_circles`
SET `period_type` = 'monthly'
WHERE `period_type` = 'term';

ALTER TABLE `stock_circles`
  MODIFY COLUMN `period_type`
    ENUM('yearly', 'biyearly', 'quarterly', 'monthly', 'daily')
    NOT NULL;

ALTER TABLE `stock_circles`
  ADD COLUMN `department_id` INT NULL AFTER `id`;

UPDATE `stock_circles` sc
INNER JOIN (
  SELECT `stock_circle_id`, MIN(`department_id`) AS `department_id`
  FROM `stock_circle_departments`
  GROUP BY `stock_circle_id`
) x ON x.`stock_circle_id` = sc.`id`
SET sc.`department_id` = x.`department_id`;

ALTER TABLE `stock_circles`
  MODIFY COLUMN `department_id` INT NOT NULL,
  ADD CONSTRAINT `stock_circles_ibfk_1`
    FOREIGN KEY (`department_id`) REFERENCES `products_department` (`department_id`) ON DELETE RESTRICT,
  ADD INDEX `idx_department_id` (`department_id`);

DROP TABLE `stock_circle_departments`;

COMMIT;
