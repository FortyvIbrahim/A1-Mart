CREATE TABLE `repack_items_master` (
  `item_id` int NOT NULL,
  `cleaning` tinyint(1) DEFAULT NULL,
  `packing_type` int DEFAULT NULL,
  `packing_material` int DEFAULT NULL,
  `packing_material_size` int DEFAULT NULL,
  `sticker` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;