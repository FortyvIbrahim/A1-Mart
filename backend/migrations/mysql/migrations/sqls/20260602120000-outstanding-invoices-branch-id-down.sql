ALTER TABLE `outstanding_invoices`
  DROP FOREIGN KEY `fk_outstanding_invoices_branch`,
  DROP KEY `idx_outstanding_invoices_branch_id`,
  DROP COLUMN `branch_id`;
