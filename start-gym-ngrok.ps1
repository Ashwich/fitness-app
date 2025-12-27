# Start ngrok tunnel for gym-management-service (port 4000)
# This is a SEPARATE tunnel from the users-service tunnel

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting ngrok for Gym-Management-Service" -ForegroundColor Cyan
Write-Host "Port: 4000" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if gym-service is running
Write-Host "Checking if gym-service is running on port 4000..." -ForegroundColor Yellow
$portCheck = netstat -ano | findstr :4000
if (-not $portCheck) {
    Write-Host "⚠️  WARNING: Nothing is running on port 4000!" -ForegroundColor Red
    Write-Host "Please start gym-management-service first:" -ForegroundColor Yellow
    Write-Host "  cd C:\Users\Lenovo\Desktop\Gym-Backend\gym-management-service" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

# Start ngrok
Write-Host "Starting ngrok tunnel..." -ForegroundColor Green
Write-Host ""

# Use full path to ngrok
$ngrokPath = "C:\Users\Lenovo\Downloads\ngrok\ngrok.exe"

if (Test-Path $ngrokPath) {
    & $ngrokPath http 4000
} else {
    Write-Host "❌ Error: ngrok.exe not found at: $ngrokPath" -ForegroundColor Red
    Write-Host "Please update the path in this script or add ngrok to PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To add ngrok to PATH:" -ForegroundColor Yellow
    Write-Host "1. Open System Properties > Environment Variables" -ForegroundColor White
    Write-Host "2. Add C:\Users\Lenovo\Downloads\ngrok to PATH" -ForegroundColor White
    Write-Host "3. Or use: `$env:Path += ';C:\Users\Lenovo\Downloads\ngrok'" -ForegroundColor White
    exit 1
}







