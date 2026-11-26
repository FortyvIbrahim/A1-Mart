ALTER TABLE `outstanding_invoices`
  MODIFY COLUMN `invoice_no` VARCHAR(255) NULL,
  MODIFY COLUMN `ref_no` VARCHAR(255) NOT NULL;
