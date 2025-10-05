# Test Deployment Script for Project Aegis
# Tests both frontend (Vercel) and backend (Railway) deployments

Write-Host "`nProject Aegis - Deployment Test`n" -ForegroundColor Cyan

# Configuration
$frontendUrl = "https://aegis-neo.vercel.app"
$backendUrl = "https://aegis-production-1445.up.railway.app"

# Test 1: Backend Health Check
Write-Host "1. Testing Backend Health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/health" -Method Get
    Write-Host "   SUCCESS Backend is healthy!" -ForegroundColor Green
    Write-Host "   Status: $($healthResponse.status)" -ForegroundColor Gray
    if ($healthResponse.nasa_api_configured) {
        Write-Host "   NASA API: Configured" -ForegroundColor Green
    } else {
        Write-Host "   NASA API: Not configured" -ForegroundColor Red
    }
} catch {
    Write-Host "   FAILED Backend health check failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Backend Root Endpoint
Write-Host "`n2. Testing Backend Root Endpoint..." -ForegroundColor Yellow
try {
    $rootResponse = Invoke-RestMethod -Uri "$backendUrl/" -Method Get
    Write-Host "   SUCCESS Root endpoint working!" -ForegroundColor Green
    Write-Host "   Message: $($rootResponse.message)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED Root endpoint failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Backend API Endpoints
Write-Host "`n3. Testing Backend API Endpoints..." -ForegroundColor Yellow
try {
    $asteroidResponse = Invoke-RestMethod -Uri "$backendUrl/api/asteroids?limit=5" -Method Get
    Write-Host "   SUCCESS Asteroids API working!" -ForegroundColor Green
    Write-Host "   Fetched: $($asteroidResponse.asteroids.Count) asteroids" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED Asteroids API failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Frontend Accessibility
Write-Host "`n4. Testing Frontend Accessibility..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri $frontendUrl -Method Get
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "   SUCCESS Frontend is accessible!" -ForegroundColor Green
        Write-Host "   Status Code: $($frontendResponse.StatusCode)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   FAILED Frontend access failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: CORS Configuration
Write-Host "`n5. Checking CORS Configuration..." -ForegroundColor Yellow
Write-Host "   Backend should allow: $frontendUrl" -ForegroundColor Gray
Write-Host "   WARNING: CORS can only be fully tested in browser" -ForegroundColor Yellow

# Summary
Write-Host "`nDeployment Summary:" -ForegroundColor Cyan
Write-Host "   Frontend: $frontendUrl" -ForegroundColor White
Write-Host "   Backend:  $backendUrl" -ForegroundColor White
Write-Host "`n   Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Visit $frontendUrl in your browser" -ForegroundColor Gray
Write-Host "   2. Open browser console (F12)" -ForegroundColor Gray
Write-Host "   3. Select an asteroid to test the connection" -ForegroundColor Gray
Write-Host "   4. Check for any CORS errors" -ForegroundColor Gray

Write-Host "`nTest Complete!`n" -ForegroundColor Cyan
