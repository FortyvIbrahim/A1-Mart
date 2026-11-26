-- 1) incentive_generated: change designation_id to JSON (array of designation IDs).
--    Drop FK and index first (JSON columns cannot be indexed directly).
ALTER TABLE incentive_generated
  DROP FOREIGN KEY fk_incentive_generated_designation;

ALTER TABLE incentive_generated
  DROP INDEX idx_incentive_generated_designation;

ALTER TABLE incentive_generated
  MODIFY COLUMN designation_id JSON NULL
  COMMENT 'Array of designation IDs';

-- 2) incentive_generated_items: add extra_data JSON.
ALTER TABLE incentive_generated_items
  ADD COLUMN extra_data JSON NULL
  AFTER incentive;
