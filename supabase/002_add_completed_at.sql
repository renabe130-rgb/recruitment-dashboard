-- na_items に完了日時カラムを追加
alter table na_items
  add column if not exists completed_at timestamptz;

-- 確認
select column_name, data_type
from information_schema.columns
where table_name = 'na_items' and column_name = 'completed_at';
