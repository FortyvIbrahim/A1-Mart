ALTER TABLE `wms_purchase_entry` 
ADD COLUMN `is_job_entry_needed` TINYINT(1) DEFAULT 0 AFTER `handled_by`;