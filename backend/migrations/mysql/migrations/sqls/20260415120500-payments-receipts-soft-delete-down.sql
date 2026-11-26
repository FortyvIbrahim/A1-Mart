ALTER TABLE `payments`
  DROP COLUMN `deleted_by`,
  DROP COLUMN `is_deleted`;

ALTER TABLE `receipts`
  DROP COLUMN `deleted_by`,
  DROP COLUMN `is_deleted`;
