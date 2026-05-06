-- 月別KPI集計のキャッシュ
-- HERPから集計したデータを保存し、TTL以内は再利用する
create table if not exists kpi_cache (
  month       text primary key,
  data        jsonb not null,
  fetched_at  timestamptz not null default now()
);

alter table kpi_cache enable row level security;

drop policy if exists "Allow all for anon" on kpi_cache;
create policy "Allow all for anon" on kpi_cache
  for all using (true) with check (true);

select 'kpi_cache created' as result;
