# ============================================
# SmartAccountant IIS Setup Script
# يجب تشغيل هذا الملف كـ Administrator
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   SmartAccountant IIS Setup Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# التحقق من صلاحيات Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "`n❌ يجب تشغيل هذا السكربت كـ Administrator!" -ForegroundColor Red
    Write-Host "اضغط Win+X ثم اختر 'Windows Terminal (Admin)'" -ForegroundColor Yellow
    pause
    exit 1
}

$appcmd = "$env:windir\system32\inetsrv\appcmd.exe"

# ============================================
# 1. إنشاء Application Pool للـ API
# ============================================
Write-Host "`n[1/5] Creating API Application Pool..." -ForegroundColor Yellow

$poolExists = & $appcmd list apppool /name:"SmartAccountantAPI" 2>$null
if ($poolExists) {
    Write-Host "   ⚠️ Application Pool already exists, skipping..." -ForegroundColor DarkYellow
} else {
    & $appcmd add apppool /name:"SmartAccountantAPI" /managedRuntimeVersion:"" /managedPipelineMode:"Integrated"
    Write-Host "   ✅ Application Pool created" -ForegroundColor Green
}

# ============================================
# 2. إنشاء موقع الـ API على Port 5000
# ============================================
Write-Host "`n[2/5] Creating API Website (Port 5000)..." -ForegroundColor Yellow

$apiSiteExists = & $appcmd list site /name:"SmartAccountantAPI" 2>$null
if ($apiSiteExists) {
    Write-Host "   ⚠️ API Site already exists, skipping..." -ForegroundColor DarkYellow
} else {
    & $appcmd add site /name:"SmartAccountantAPI" /physicalPath:"C:\inetpub\wwwroot\SmartAccountant\api" /bindings:http/*:5000:
    & $appcmd set site "SmartAccountantAPI" /applicationDefaults.applicationPool:"SmartAccountantAPI"
    Write-Host "   ✅ API Site created on port 5000" -ForegroundColor Green
}

# ============================================
# 3. إنشاء موقع الـ Frontend على Port 3000
# ============================================
Write-Host "`n[3/5] Creating Frontend Website (Port 3000)..." -ForegroundColor Yellow

$webSiteExists = & $appcmd list site /name:"SmartAccountantWeb" 2>$null
if ($webSiteExists) {
    Write-Host "   ⚠️ Frontend Site already exists, skipping..." -ForegroundColor DarkYellow
} else {
    & $appcmd add site /name:"SmartAccountantWeb" /physicalPath:"C:\inetpub\wwwroot\SmartAccountant\www" /bindings:http/*:3000:
    Write-Host "   ✅ Frontend Site created on port 3000" -ForegroundColor Green
}

# ============================================
# 4. تشغيل المواقع
# ============================================
Write-Host "`n[4/5] Starting sites..." -ForegroundColor Yellow

& $appcmd start site "SmartAccountantAPI" 2>$null
& $appcmd start site "SmartAccountantWeb" 2>$null
Write-Host "   ✅ Sites started" -ForegroundColor Green

# ============================================
# 5. إعادة تشغيل IIS
# ============================================
Write-Host "`n[5/5] Restarting IIS..." -ForegroundColor Yellow
iisreset /restart
Write-Host "   ✅ IIS restarted" -ForegroundColor Green

# ============================================
# النتيجة
# ============================================
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "   ✅ Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   API:      http://localhost:5000/api" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "   Test API: http://localhost:5000/api/products" -ForegroundColor DarkGray
Write-Host ""

# اختبار الاتصال
Write-Host "Testing connections..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $apiTest = Invoke-WebRequest -Uri "http://localhost:5000/api/products" -Headers @{"X-Account-Id"="1"} -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ API: Working (Status $($apiTest.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ API: Not responding - $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $webTest = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Frontend: Working (Status $($webTest.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Frontend: Not responding - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
pause
