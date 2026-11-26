CREATE TABLE `permissions` (
  `permission_key` varchar(100) NOT NULL,
  `designation_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `permissions`
  ADD CONSTRAINT `permissions_ibfk_1` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`designation_id`)