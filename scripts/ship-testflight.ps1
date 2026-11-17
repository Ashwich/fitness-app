# Ship Fitsera to TestFlight (run in an interactive terminal — Apple login required once)
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\ship-testflight.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$env:EAS_BUILD_NO_EXPO_GO_WARNING = "true"
$env:EAS_SKIP_AUTO_FINGERPRINT = "1"

Write-Host "==> Ensuring iOS credentials (Apple login / 2FA may prompt)..." -ForegroundColor Cyan
eas credentials:configure-build -p ios -e production

Write-Host "==> Starting iOS production build + auto-submit to TestFlight..." -ForegroundColor Cyan
eas build -p ios --profile production --auto-submit --no-wait

Write-Host "Done. Watch progress: https://expo.dev/accounts/ashwich/projects/fitsera-app/builds" -ForegroundColor Green
