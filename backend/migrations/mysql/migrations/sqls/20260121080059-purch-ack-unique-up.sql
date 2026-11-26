WITH ranked AS (
  SELECT
    purchase_acknowledgment_id,
    invoice_no,
    ROW_NUMBER() OVER (
      PARTITION BY invoice_no
      ORDER BY created_at, purchase_acknowledgment_id
    ) AS rn
  FROM purchase_acknowledgment
)
UPDATE purchase_acknowledgment pa
JOIN ranked r
  ON pa.purchase_acknowledgment_id = r.purchase_acknowledgment_id
SET pa.invoice_no = CONCAT(pa.invoice_no, '-DUP-', r.rn - 1)
WHERE r.rn > 1;

ALTER TABLE purchase_acknowledgment
ADD UNIQUE KEY uq_purchase_ack_invoice_no (invoice_no);

ALTER TABLE grn
  DROP FOREIGN KEY fk_grn_purchase_acknowledgment;

ALTER TABLE grn
  ADD CONSTRAINT fk_grn_purchase_acknowledgment
    FOREIGN KEY (purchase_acknowledgment_id)
    REFERENCES purchase_acknowledgment (purchase_acknowledgment_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE wms_purchase_entry
  DROP FOREIGN KEY fk_wms_purchase_entry_acknowledgment;

ALTER TABLE wms_purchase_entry
  ADD CONSTRAINT fk_wms_purchase_entry_acknowledgment
    FOREIGN KEY (purchase_acknowledgment_id)
    REFERENCES purchase_acknowledgment (purchase_acknowledgment_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE stickering
  DROP FOREIGN KEY fk_stickering_purchase_acknowledgment;

ALTER TABLE stickering
  ADD CONSTRAINT fk_stickering_purchase_acknowledgment
    FOREIGN KEY (purchase_acknowledgment_id)
    REFERENCES purchase_acknowledgment (purchase_acknowledgment_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;