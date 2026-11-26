ALTER TABLE grn
ADD COLUMN grn_method ENUM('device', 'manual') NULL
AFTER purchase_order_id;