-- ─────────────────────────────────────────────────
-- 月別の採用目標値
-- 既存 targets テーブル（id=1 singleton）は廃止し、月単位で管理
-- ─────────────────────────────────────────────────
create table if not exists monthly_targets (
  month       text primary key,                 -- "2026-05" 形式
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table monthly_targets enable row level security;

drop policy if exists "Allow all for anon" on monthly_targets;
create policy "Allow all for anon" on monthly_targets
  for all using (true) with check (true);

-- 確認
select 'monthly_targets created' as result;
