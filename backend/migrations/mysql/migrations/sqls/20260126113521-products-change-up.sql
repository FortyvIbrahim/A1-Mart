-- MySQL query to add repln_mode column to products table
ALTER TABLE `products` 
ADD COLUMN `repln_mode` VARCHAR(50) NULL AFTER `image_url`;
