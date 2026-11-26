ALTER TABLE `outstanding_invoices`
  DROP FOREIGN KEY `fk_outstanding_invoices_buyer`,
  DROP KEY `idx_outstanding_invoices_buyer_id`,
  DROP COLUMN `buyer_id`;
