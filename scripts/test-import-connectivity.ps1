# Non-mutating checks for import-expenses (no upload key, no inserts).
$base = "https://wnvndwxwdyenhhulypem.supabase.co/functions/v1/import-expenses"

Write-Host "GET health..."
try {
  $get = Invoke-WebRequest -Uri $base -Method GET -MaximumRedirection 0 -TimeoutSec 20 -UseBasicParsing
  Write-Host "  Status $($get.StatusCode) Body: $($get.Content.Substring(0, [Math]::Min(120, $get.Content.Length)))"
} catch {
  Write-Host "  GET failed: $($_.Exception.Message)"
}

Write-Host "POST without headers (expect 401)..."
try {
  Invoke-WebRequest -Uri $base -Method POST -Body '{"transactions":[]}' -ContentType "application/json" -MaximumRedirection 0 -TimeoutSec 20 -UseBasicParsing | Out-Null
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  Write-Host "  Status $code (expected 401 without auth)"
}

Write-Host "Done. Use a valid x-import-token + anon JWT for full import tests."
