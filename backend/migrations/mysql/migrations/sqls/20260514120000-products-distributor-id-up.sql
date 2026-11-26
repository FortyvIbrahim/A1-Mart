ALTER TABLE `products`
  ADD COLUMN `distributor_id` BIGINT NULL DEFAULT NULL AFTER `de_distributor`,
  ADD KEY `idx_products_distributor_id` (`distributor_id`);

UPDATE products p
INNER JOIN (
  SELECT MIN(master_id) AS master_id, name
  FROM master_list
  WHERE person_type = 3
  GROUP BY name
) ml ON ml.name <=> p.de_distributor
SET p.distributor_id = ml.master_id;
