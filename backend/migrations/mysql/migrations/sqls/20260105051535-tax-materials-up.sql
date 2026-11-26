ALTER TABLE `materials` 
  ADD `tax_percentage` DECIMAL(10,2) NULL AFTER `supplier_id`,
  ADD `hsn_number` VARCHAR(50) NULL AFTER `tax_percentage`;