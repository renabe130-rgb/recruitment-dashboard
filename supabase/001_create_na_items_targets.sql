-- ─────────────────────────────────────────────────
-- 採用ダッシュボード Supabase 初期マイグレーション
-- 実行場所: Supabase ダッシュボード → SQL Editor → New query
-- ─────────────────────────────────────────────────

-- na_items: NA（ネクストアクション）管理
create table if not exists na_items (
  id uuid primary key default gen_random_uuid(),
  assignee   text not null default '',
  action     text not null default '',
  quantity   text not null default '',
  deadline   text not null default '',
  is_valid   boolean not null default false,
  raw        text not null default '',
  created_at timestamptz not null default now()
);

alter table na_items enable row level security;

drop policy if exists "Allow all for anon" on na_items;
create policy "Allow all for anon" on na_items
  for all using (true) with check (true);


-- targets: 採用目標数値（職種別）。1行のみ運用
create table if not exists targets (
  id integer primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint targets_singleton check (id = 1)
);

alter table targets enable row level security;

drop policy if exists "Allow all for anon" on targets;
create policy "Allow all for anon" on targets
  for all using (true) with check (true);

-- 初期1行（既にあれば何もしない）
insert into targets (id, data) values (
  1,
  '{
    "applications":     {"total": 0, "byType": {"エンジニア": 0, "セールス": 0, "コーポレート": 0}},
    "firstInterview":   {"total": 0, "byType": {"エンジニア": 0, "セールス": 0, "コーポレート": 0}},
    "secondInterview":  {"total": 0, "byType": {"エンジニア": 0, "セールス": 0, "コーポレート": 0}},
    "offers":           {"total": 0, "byType": {"エンジニア": 0, "セールス": 0, "コーポレート": 0}},
    "acceptances":      {"total": 0, "byType": {"エンジニア": 0, "セールス": 0, "コーポレート": 0}},
    "hires":            {"total": 0, "byType": {"エンジニア": 0, "セールス": 0, "コーポレート": 0}}
  }'::jsonb
)
on conflict (id) do nothing;

-- 確認
select 'na_items' as table_name, count(*) as row_count from na_items
union all
select 'targets',  count(*) from targets;
