param(
  [string]$Month = '2026-05'
)
$start = Get-Date
$bytes = (Invoke-WebRequest "http://localhost:3000/api/herp?type=kpi&month=$Month" -UseBasicParsing -TimeoutSec 600).RawContentStream.ToArray()
$json = [System.Text.Encoding]::UTF8.GetString($bytes)
$obj = $json | ConvertFrom-Json
$elapsed = (Get-Date) - $start
Write-Output ("elapsed: {0:N1}s, source: {1}, month: {2}" -f $elapsed.TotalSeconds, $obj.source, $Month)
@('applications','firstInterview','finalInterview','offered','offerAccepted') | ForEach-Object {
  $stage = $obj.data.$_
  Write-Output ("  {0,-16}: {1}" -f $_, $stage.total)
}
Write-Output ("totalCandidacies: {0}" -f $obj.data.totalCandidacies)
