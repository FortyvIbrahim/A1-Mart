CREATE TABLE `purchase_returns_items_delivered_attachments` (
  `purchase_returns_items_delivered_attachment_id` INT NOT NULL AUTO_INCREMENT,
  `purchase_returns_items_delivered_id` INT NOT NULL,
  `file_url` VARCHAR(2048) NOT NULL COMMENT 'attachment file URL',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_returns_items_delivered_attachment_id`),
  KEY `idx_delivered_attachments_delivered_id` (`purchase_returns_items_delivered_id`),
  CONSTRAINT `fk_delivered_attachments_delivered`
    FOREIGN KEY (`purchase_returns_items_delivered_id`) REFERENCES `purchase_returns_items_delivered` (`purchase_returns_items_delivered_id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;