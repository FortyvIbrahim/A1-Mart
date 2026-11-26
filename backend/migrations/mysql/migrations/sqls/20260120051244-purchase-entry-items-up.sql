CREATE TABLE `wms_purchase_entry_items` (
  `wms_purchase_entry_item_id` INT NOT NULL AUTO_INCREMENT,
  `purchase_entry_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `rate` DECIMAL(15,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`wms_purchase_entry_item_id`),
  KEY `idx_wms_purchase_entry_items_purchase_entry_id` (`purchase_entry_id`),
  KEY `idx_wms_purchase_entry_items_product_id` (`product_id`),
  CONSTRAINT `fk_wms_purchase_entry_items_purchase_entry`
    FOREIGN KEY (`purchase_entry_id`) REFERENCES `wms_purchase_entry`(`purchase_entry_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wms_purchase_entry_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
