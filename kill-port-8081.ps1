# Kill all processes using port 8081
Write-Host "Finding processes using port 8081..." -ForegroundColor Yellow

$processes = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    foreach ($processId in $processes) {
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Killing process: $($proc.ProcessName) (PID: $processId)" -ForegroundColor Red
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "Done! Port 8081 should be free now." -ForegroundColor Green
} else {
    Write-Host "No processes found using port 8081." -ForegroundColor Green
}

Write-Host "`nVerifying port 8081 is free..." -ForegroundColor Yellow
$check = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
if ($check) {
    Write-Host "⚠️  Port 8081 is still in use!" -ForegroundColor Red
} else {
    Write-Host "✅ Port 8081 is free!" -ForegroundColor Green
}

