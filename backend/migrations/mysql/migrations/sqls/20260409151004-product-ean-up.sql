ALTER TABLE `products`
  ADD COLUMN `ean_number` VARCHAR(50) NULL DEFAULT NULL AFTER `store_uom`;