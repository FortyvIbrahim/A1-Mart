CREATE TABLE `packing_cleaning` (
  `purchase_item` bigint NOT NULL,
  `purchase_item_name` varchar(255) NOT NULL,
  `article_id` int DEFAULT NULL,
  `article_name` varchar(255) DEFAULT NULL,
  `priority_score` float DEFAULT NULL,
  `repackage_conversion` int DEFAULT NULL,
  `planner` varchar(255) DEFAULT NULL,
  `repack_quantity` int DEFAULT NULL,
  `forecast_quantity` int DEFAULT NULL,
  `order_date` date DEFAULT NULL,
  `child_stock_in_hand` float DEFAULT NULL,
  `parent_stock` float DEFAULT NULL,
  `store_uom` int DEFAULT NULL,
  `num_stores_oos` int DEFAULT NULL,
  `chain_bill_count_level` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;