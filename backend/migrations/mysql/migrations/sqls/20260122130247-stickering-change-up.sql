-- MySQL query to remove material_type column from materials table
ALTER TABLE materials
DROP COLUMN material_type;

-- MySQL query to add material_type column to stickering table
ALTER TABLE stickering
ADD COLUMN material_type ENUM('single', 'double', 'looping') NULL
AFTER supervisor_id;
