# Deploy ChatGPT import Edge Function (run in PowerShell after: supabase login)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Checking Supabase CLI..."
supabase --version | Out-Null

Write-Host "Deploying import-expenses to wnvndwxwdyenhhulypem (JWT verify OFF for x-import-token auth)..."
supabase functions deploy import-expenses `
  --project-ref wnvndwxwdyenhhulypem `
  --no-verify-jwt

Write-Host "Done. Test URL:"
Write-Host "  https://wnvndwxwdyenhhulypem.supabase.co/functions/v1/import-expenses"
