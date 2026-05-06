-- 旧版残骸テーブルの削除
-- targets:    monthly_targets に置き換わったため不要
-- strategies: 旧版から残っていた未使用テーブル（連が DROP OK と判断済み）
-- tasks:      連が「残す」と判断したため削除しない

drop table if exists targets cascade;
drop table if exists strategies cascade;

select 'legacy tables dropped' as result;
