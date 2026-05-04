$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '..\.env.local'
$envFile = (Resolve-Path $envFile -ErrorAction SilentlyContinue).Path
if (-not $envFile) {
  $envFile = Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path '.env.local'
}

Write-Host ""
Write-Host "=== .env.local 設定スクリプト ===" -ForegroundColor Cyan
Write-Host "対象ファイル: $envFile"
Write-Host ""
Write-Host "各キーに値を入力してください（空 Enter でスキップ）"
Write-Host ""

$labels = [ordered]@{
  'HERP_API_KEY'                    = 'HERP API キー'
  'NEXT_PUBLIC_SUPABASE_URL'        = 'Supabase Project URL'
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'   = 'Supabase anon public key'
}

$existing = if (Test-Path $envFile) { Get-Content $envFile -Raw } else { '' }
if ($null -eq $existing) { $existing = '' }

foreach ($key in $labels.Keys) {
  $label = $labels[$key]
  $value = Read-Host -Prompt "$label  ($key)"
  if (-not $value) {
    Write-Host "  -> skip" -ForegroundColor DarkGray
    continue
  }
  $line = "$key='$value'"
  if ($existing -match "(?m)^$([regex]::Escape($key))=") {
    $existing = [regex]::Replace($existing, "(?m)^$([regex]::Escape($key))=.*$", $line)
    Write-Host "  -> updated" -ForegroundColor Green
  } else {
    if ($existing -and -not $existing.EndsWith("`n")) { $existing += "`n" }
    $existing += $line + "`n"
    Write-Host "  -> added" -ForegroundColor Green
  }
}

if (Test-Path $envFile) {
  Copy-Item $envFile "$envFile.bak" -Force
}
Set-Content -Path $envFile -Value $existing -Encoding utf8 -NoNewline

Write-Host ""
Write-Host "=== 完了 ===" -ForegroundColor Cyan
Write-Host "バックアップ: $envFile.bak"
Write-Host ""
Write-Host "現在の .env.local に存在するキー:"
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^([A-Z_]+)=') {
    $k = $matches[1]
    $hasValue = ($_ -replace '^[A-Z_]+=', '').Length -gt 2
    $status = if ($hasValue) { 'set' } else { 'empty' }
    $color = if ($hasValue) { 'Green' } else { 'Yellow' }
    Write-Host ("  {0,-32} {1}" -f $k, $status) -ForegroundColor $color
  }
}
Write-Host ""
