-- final_stage_candidates に内定承諾期限・入社予定日カラムを追加
alter table final_stage_candidates
  add column if not exists offer_deadline timestamptz,
  add column if not exists join_date date;

select 'columns added' as result;
