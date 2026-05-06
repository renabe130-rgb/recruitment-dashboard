-- ─────────────────────────────────────────────────
-- 承諾済み候補者スナップショット
-- HERPで承諾(offerAccepted)になった候補者を月別に保管
-- HERP側で消えてもダッシュボードには残し、手動で消すまで表示する
-- ─────────────────────────────────────────────────
create table if not exists accepted_snapshots (
  id                       uuid primary key default gen_random_uuid(),
  candidacy_id             text not null unique,
  candidate_name           text,
  requisition_id           text,
  requisition_group_id     text,
  requisition_group_name   text,
  accepted_month           text not null,                -- "2026-05" 形式
  offer_accepted_at        timestamptz,                  -- HERP上の承諾日時
  hidden_at                timestamptz,                  -- 手動非表示の日時 (null = 表示中)
  snapshot_at              timestamptz not null default now(),
  created_at               timestamptz not null default now()
);

alter table accepted_snapshots enable row level security;

drop policy if exists "Allow all for anon" on accepted_snapshots;
create policy "Allow all for anon" on accepted_snapshots
  for all using (true) with check (true);

create index if not exists idx_accepted_snapshots_month
  on accepted_snapshots(accepted_month);
create index if not exists idx_accepted_snapshots_visible
  on accepted_snapshots(hidden_at) where hidden_at is null;

-- 確認
select 'accepted_snapshots created' as result;
