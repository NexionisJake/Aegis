# Quick Verification Test for Production Deployment

Write-Host "`n=== Testing Production Deployment ===`n" -ForegroundColor Cyan

# Wait a moment
Write-Host "Waiting 30 seconds for deployment to stabilize..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Test Backend
Write-Host "`n1. Testing Backend..." -ForegroundColor Yellow
try {
    $backend = Invoke-RestMethod -Uri "https://aegis-production-1445.up.railway.app/health"
    Write-Host "   Backend: " -NoNewline
    Write-Host "OPERATIONAL" -ForegroundColor Green
    Write-Host "   Status: $($backend.status)" -ForegroundColor Gray
    Write-Host "   NASA API: $($backend.nasa_api_configured)" -ForegroundColor Gray
} catch {
    Write-Host "   Backend: " -NoNewline
    Write-Host "ERROR" -ForegroundColor Red
}

# Test Frontend
Write-Host "`n2. Testing Frontend..." -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "https://aegis-neo.vercel.app" -UseBasicParsing
    if ($frontend.StatusCode -eq 200) {
        Write-Host "   Frontend: " -NoNewline
        Write-Host "ACCESSIBLE" -ForegroundColor Green
    }
} catch {
    Write-Host "   Frontend: " -NoNewline
    Write-Host "ERROR" -ForegroundColor Red
}

# Test Integration
Write-Host "`n3. Testing Backend Integration..." -ForegroundColor Yellow
try {
    $asteroids = Invoke-RestMethod -Uri "https://aegis-production-1445.up.railway.app/api/asteroids/list?limit=3"
    Write-Host "   API Integration: " -NoNewline
    Write-Host "WORKING" -ForegroundColor Green
    Write-Host "   Asteroids Loaded: $($asteroids.asteroids.Count)" -ForegroundColor Gray
} catch {
    Write-Host "   API Integration: " -NoNewline
    Write-Host "ERROR" -ForegroundColor Red
}

# Final Status
Write-Host "`n=== Final Status ===" -ForegroundColor Cyan
Write-Host "`nBackend:  " -NoNewline
Write-Host "https://aegis-production-1445.up.railway.app" -ForegroundColor Green
Write-Host "Frontend: " -NoNewline  
Write-Host "https://aegis-neo.vercel.app" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Visit https://aegis-neo.vercel.app in your browser" -ForegroundColor Gray
Write-Host "2. Open browser console (F12) and check for errors" -ForegroundColor Gray
Write-Host "3. Select an asteroid to test full functionality" -ForegroundColor Gray
Write-Host "4. Verify 3D visualization and calculations work" -ForegroundColor Gray

Write-Host "`nIf you see CORS errors, wait another minute and refresh.`n" -ForegroundColor Yellow
