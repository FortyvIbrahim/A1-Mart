-- 1) Add column
ALTER TABLE incentive_common
  ADD COLUMN cluster_size ENUM('small', 'medium', 'large') NULL
  AFTER selected_month;

-- 2) Drop old unique key
ALTER TABLE incentive_common
  DROP INDEX uq_type_selected_month;

-- 3) Add new unique key including cluster_size
ALTER TABLE incentive_common
  ADD UNIQUE KEY uq_type_selected_month_cluster (type, selected_month, cluster_size);
