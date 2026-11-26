-- Add credit_note_link column to grn table
ALTER TABLE `grn` 
  ADD COLUMN `credit_note_link` VARCHAR(500) NULL DEFAULT NULL AFTER `missing_value`;

