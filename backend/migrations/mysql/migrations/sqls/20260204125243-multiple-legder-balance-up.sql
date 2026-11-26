ALTER TABLE ledgers DROP COLUMN balance;

CREATE TABLE IF NOT EXISTS `ledger_balances` (
  `ledger_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  `balance` DECIMAL(15,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`ledger_id`, `branch_id`),
  CONSTRAINT `fk_ledger_balances_ledger`
    FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`ledger_id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_ledger_balances_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;