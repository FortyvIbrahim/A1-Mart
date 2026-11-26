CREATE TABLE `outstanding_report` (
  `outstanding_report_id` INT NOT NULL AUTO_INCREMENT,
  `report_name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `created_by` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`outstanding_report_id`),
  KEY `idx_outstanding_report_date` (`date`),
  KEY `idx_outstanding_report_created_by` (`created_by`),
  CONSTRAINT `fk_outstanding_report_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `employees`(`employee_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `outstanding_invoices` (
  `outstanding_invoice_id` INT NOT NULL AUTO_INCREMENT,
  `outstanding_report_id` INT NOT NULL,
  `supplier_id` BIGINT NOT NULL,
  `invoice_no` VARCHAR(255) NOT NULL,
  `ref_no` VARCHAR(255) NULL,
  `invoice_date` DATE NOT NULL,
  `net_balance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`outstanding_invoice_id`),
  KEY `idx_outstanding_invoices_report_id` (`outstanding_report_id`),
  KEY `idx_outstanding_invoices_supplier_id` (`supplier_id`),
  CONSTRAINT `fk_outstanding_invoices_report`
    FOREIGN KEY (`outstanding_report_id`) REFERENCES `outstanding_report`(`outstanding_report_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_outstanding_invoices_supplier`
    FOREIGN KEY (`supplier_id`) REFERENCES `master_list`(`master_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
