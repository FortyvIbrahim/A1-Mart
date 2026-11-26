-- Branch-scoped checklist submissions (run manually; adjust index name if yours differs).
-- Uniqueness: (checklist_form_id, local_date, branch_id)

-- If your table was created with uq_checklist_submissions_form_date:
ALTER TABLE `checklist_submissions` DROP INDEX `uq_checklist_submissions_form_date`;

ALTER TABLE `checklist_submissions`
  ADD COLUMN `branch_id` INT NULL DEFAULT NULL AFTER `checklist_form_id`;

-- Backfill existing rows before NOT NULL (use real branch ids for your data):
UPDATE `checklist_submissions` SET `branch_id` = 1 WHERE `branch_id` IS NULL;

ALTER TABLE `checklist_submissions`
  MODIFY `branch_id` INT NOT NULL,
  ADD UNIQUE KEY `uq_checklist_submissions_form_date_branch` (`checklist_form_id`, `local_date`, `branch_id`),
  ADD KEY `idx_checklist_submissions_branch_id` (`branch_id`),
  ADD CONSTRAINT `fk_checklist_submissions_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
