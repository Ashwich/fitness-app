# Restart Services Script for Fitsera App
# This script helps restart all services in the correct order

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fitsera App - Service Restart Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check what's running on port 8081
Write-Host "Step 1: Checking port 8081..." -ForegroundColor Yellow
$port8081 = netstat -ano | findstr :8081
if ($port8081) {
    Write-Host "⚠️  Port 8081 is in use:" -ForegroundColor Yellow
    Write-Host $port8081
    Write-Host ""
    Write-Host "Please stop the service using port 8081 manually:" -ForegroundColor Yellow
    Write-Host "1. Find the process in Task Manager, OR" -ForegroundColor Yellow
    Write-Host "2. Run: taskkill /PID <PID> /F" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "✅ Port 8081 is free" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Manual Steps Required:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. STOP all running services (Expo, ngrok, Backend)" -ForegroundColor Yellow
Write-Host "   Press Ctrl+C in each terminal window" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. START Backend (Terminal 1):" -ForegroundColor Green
Write-Host "   cd C:\Users\Lenovo\Desktop\Gym-Backend\users-service" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host "   Wait for: 'Users service is running port: 8081'" -ForegroundColor White
Write-Host ""
Write-Host "3. TEST Backend locally:" -ForegroundColor Green
Write-Host "   Open browser: http://localhost:8081/health" -ForegroundColor White
Write-Host "   Should return: {""status"":""ok"",""service"":""users-service""}" -ForegroundColor White
Write-Host ""
Write-Host "4. START ngrok (Terminal 2):" -ForegroundColor Green
Write-Host "   ngrok http 8081" -ForegroundColor White
Write-Host "   Copy the HTTPS URL (e.g., https://xxx.ngrok-free.dev)" -ForegroundColor White
Write-Host ""
Write-Host "5. TEST ngrok Backend:" -ForegroundColor Green
Write-Host "   In phone browser: https://xxx.ngrok-free.dev/health" -ForegroundColor White
Write-Host "   Should return: {""status"":""ok"",""service"":""users-service""}" -ForegroundColor White
Write-Host "   ❌ If you get Expo manifest, ngrok is routing to Expo (wrong!)" -ForegroundColor Red
Write-Host ""
Write-Host "6. UPDATE .env file:" -ForegroundColor Green
Write-Host "   EXPO_PUBLIC_USERS_SERVICE_URL=https://xxx.ngrok-free.dev" -ForegroundColor White
Write-Host "   (NO port number, NO /api/users)" -ForegroundColor White
Write-Host ""
Write-Host "7. START Expo WITHOUT --tunnel (Terminal 3):" -ForegroundColor Green
Write-Host "   cd C:\Users\Lenovo\Desktop\fitsera-app" -ForegroundColor White
Write-Host "   npx expo start --port 5173 --clear" -ForegroundColor White
Write-Host "   ⚠️  NO --tunnel flag!" -ForegroundColor Red
Write-Host ""
Write-Host "8. TEST Login/Register in app" -ForegroundColor Green
Write-Host "   Check backend logs - should see: 'Incoming request method: POST path: /api/users/login'" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

