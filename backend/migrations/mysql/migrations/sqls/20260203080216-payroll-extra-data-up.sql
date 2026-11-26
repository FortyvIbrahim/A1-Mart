ALTER TABLE payroll_employees
  ADD COLUMN employer_esi DECIMAL(15,2) NULL AFTER employee_epf;

ALTER TABLE payroll_employees
  ADD COLUMN employer_epf DECIMAL(15,2) NULL AFTER employer_esi;