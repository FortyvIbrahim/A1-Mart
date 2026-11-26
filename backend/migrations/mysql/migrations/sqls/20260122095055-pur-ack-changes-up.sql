ALTER TABLE wms_purchase_entry
ADD COLUMN credit_note_link VARCHAR(500) NULL
AFTER handled_by;