CREATE TABLE payroll_generated_payslip (
  payroll_generated_payslip_id INT NOT NULL AUTO_INCREMENT,
  payroll_id INT NOT NULL,
  employee_code VARCHAR(50) NOT NULL,
  selected_month DATE NOT NULL,
  payslip_data JSON NOT NULL,
  payslip_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (payroll_generated_payslip_id),
  KEY idx_payroll_employee (payroll_id, employee_code),
  KEY idx_employee_code_selected_month (employee_code, selected_month),
  CONSTRAINT fk_payroll_generated_payslip_payroll
    FOREIGN KEY (payroll_id) REFERENCES payroll (payroll_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
