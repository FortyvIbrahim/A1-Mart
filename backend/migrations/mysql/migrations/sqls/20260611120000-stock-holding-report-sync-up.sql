INSERT INTO `sync_config` (`sync_key`, `cron`, `is_active`) VALUES
  ('stock_holding_report_sync', '30 7 * * *', 1)
ON DUPLICATE KEY UPDATE
  `cron` = VALUES(`cron`),
  `is_active` = VALUES(`is_active`);
