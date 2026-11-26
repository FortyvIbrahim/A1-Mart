-- MySQL statements for TOTP 2FA implementation

-- 1. Add requires_2fa column to designations table
-- This column determines which designations require 2FA login
ALTER TABLE `designations` 
ADD COLUMN `requires_2fa` BOOLEAN NOT NULL DEFAULT TRUE 
AFTER `is_active`;

-- 2. Add TOTP-related columns to user table
-- totp_secret: Encrypted TOTP secret (stored as VARCHAR for encrypted data)
-- totp_enabled: Boolean flag to indicate if 2FA is enabled for the user
ALTER TABLE `user` 
ADD COLUMN `totp_secret` VARCHAR(255) NULL 
AFTER `password`,
ADD COLUMN `totp_enabled` BOOLEAN NOT NULL DEFAULT FALSE 
AFTER `totp_secret`;

-- Optional: Add index on totp_enabled for faster queries
CREATE INDEX `idx_user_totp_enabled` ON `user` (`totp_enabled`);

-- Optional: Add index on requires_2fa for faster queries
CREATE INDEX `idx_designations_requires_2fa` ON `designations` (`requires_2fa`);

-- Example: Update specific designations to require 2FA
-- UPDATE `designations` SET `requires_2fa` = TRUE WHERE `designation_name` IN ('Admin', 'Manager');
-- Replace the designation names above with the actual designations that should require 2FA

