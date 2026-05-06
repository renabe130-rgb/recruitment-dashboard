-- 最終選考以降の候補者管理
-- HERPからの自動同期 + 連が手動で追加・編集
create table if not exists final_stage_candidates (
  candidacy_id     text primary key,
  month            text not null,
  candidate_name   text not null default '',
  group_name       text not null default '',
  current_step     text not null,                -- finalInterview / offered / offerAccepted
  next_schedule    timestamptz,
  notes            text not null default '',
  hidden_at        timestamptz,
  source           text not null default 'herp', -- herp / manual
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table final_stage_candidates enable row level security;

drop policy if exists "Allow all for anon" on final_stage_candidates;
create policy "Allow all for anon" on final_stage_candidates
  for all using (true) with check (true);

create index if not exists idx_final_stage_month_visible
  on final_stage_candidates(month, hidden_at)
  where hidden_at is null;

select 'final_stage_candidates created' as result;
