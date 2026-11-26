ALTER TABLE payroll_employees
  ADD COLUMN payment_details JSON NULL AFTER net_pay;
