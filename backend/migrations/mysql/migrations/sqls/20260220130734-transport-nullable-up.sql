ALTER TABLE `transports`
  MODIFY COLUMN `asset_name` VARCHAR(255) NULL,
  MODIFY COLUMN `acquisition_type` VARCHAR(50) NULL,
  MODIFY COLUMN `dependency_type` VARCHAR(50) NULL,
  MODIFY COLUMN `working_status` VARCHAR(50) NULL,
  MODIFY COLUMN `is_depreciation_applicable` VARCHAR(3) NULL DEFAULT NULL;