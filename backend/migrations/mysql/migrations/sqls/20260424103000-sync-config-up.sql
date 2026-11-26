CREATE TABLE `sync_config` (
  `sync_key` VARCHAR(100) NOT NULL,
  `cron` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sync_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sync_config` (`sync_key`, `cron`, `is_active`) VALUES
  ('cleaning_packing_sync', '0 7 * * *', 1),
  ('digisme_employees_sync', '0,20,40 * * * *', 1),
  ('product_sync', '0,30 * * * *', 1),
  ('digisme_attendance_sync', '0,15,30,45 8-23 * * *', 1);
