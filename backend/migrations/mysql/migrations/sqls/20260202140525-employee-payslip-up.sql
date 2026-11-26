ALTER TABLE payroll_employees
  ADD COLUMN payslip_url VARCHAR(500) NULL AFTER payment_details;
