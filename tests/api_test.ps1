# Smart Accountant API Test Script

$baseUrl = "http://localhost:5000/api"
$headers = @{
    "Content-Type" = "application/json"
    "X-Account-Id" = "1"
    "X-User-Id" = "1"
    "Authorization" = "Bearer temp-token-1-639032411405682952"
}

$results = @()

function Test-API {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null
    )
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = $Body | ConvertTo-Json -Depth 10
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "[PASS] $Name" -ForegroundColor Green
        return @{ Name = $Name; Status = "Pass"; Response = $response }
    }
    catch {
        $errorMsg = $_.Exception.Message
        Write-Host "[FAIL] $Name - $errorMsg" -ForegroundColor Red
        return @{ Name = $Name; Status = "Fail"; Error = $errorMsg }
    }
}

Write-Host ""
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "   Smart Accountant API Test" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan

# 1. Products Tests
Write-Host ""
Write-Host "--- Products Tests ---" -ForegroundColor Yellow
$results += Test-API -Name "Get Products" -Method "GET" -Url "$baseUrl/products"

# 2. Customers Tests
Write-Host ""
Write-Host "--- Customers Tests ---" -ForegroundColor Yellow
$results += Test-API -Name "Get Customers" -Method "GET" -Url "$baseUrl/customers"

$newCustomer = @{
    name = "Test Customer"
    nameEn = "Test Customer EN"
    type = "Individual"
    phone = "+966500000001"
    email = "test@test.com"
    creditLimit = 10000
}
$results += Test-API -Name "Create Customer" -Method "POST" -Url "$baseUrl/customers" -Body $newCustomer

# 3. Invoices Tests
Write-Host ""
Write-Host "--- Invoices Tests ---" -ForegroundColor Yellow
$results += Test-API -Name "Get Invoices" -Method "GET" -Url "$baseUrl/invoices"

# 4. Units Tests
Write-Host ""
Write-Host "--- Units Tests ---" -ForegroundColor Yellow
$results += Test-API -Name "Get Units" -Method "GET" -Url "$baseUrl/units"

$newUnit = @{
    name = "Test Unit"
    symbol = "TU"
}
$results += Test-API -Name "Create Unit" -Method "POST" -Url "$baseUrl/units" -Body $newUnit

# 5. Expenses Tests
Write-Host ""
Write-Host "--- Expenses Tests ---" -ForegroundColor Yellow
$results += Test-API -Name "Get Expenses" -Method "GET" -Url "$baseUrl/expenses"

# 6. Revenues Tests
Write-Host ""
Write-Host "--- Revenues Tests ---" -ForegroundColor Yellow
$results += Test-API -Name "Get Revenues" -Method "GET" -Url "$baseUrl/revenues"

# 7. Tags Tests
Write-Host ""
Write-Host "--- Tags Tests ---" -ForegroundColor Yellow
$results += Test-API -Name "Get Tags" -Method "GET" -Url "$baseUrl/tags"

# 8. Transaction Types Tests
Write-Host ""
Write-Host "--- Transaction Types Tests ---" -ForegroundColor Yellow
$results += Test-API -Name "Get Transaction Types" -Method "GET" -Url "$baseUrl/transactiontypes"

# 9. Currencies Tests
Write-Host ""
Write-Host "--- Currencies Tests ---" -ForegroundColor Yellow
$results += Test-API -Name "Get Currencies" -Method "GET" -Url "$baseUrl/currencies"

# 10. Notifications Tests
Write-Host ""
Write-Host "--- Notifications Tests ---" -ForegroundColor Yellow
$results += Test-API -Name "Get Notifications" -Method "GET" -Url "$baseUrl/notifications"

# 11. System Settings Tests
Write-Host ""
Write-Host "--- System Settings Tests ---" -ForegroundColor Yellow
$results += Test-API -Name "Get System Settings" -Method "GET" -Url "$baseUrl/systemsettings"

# 12. Menu Tests
Write-Host ""
Write-Host "--- Menu Tests ---" -ForegroundColor Yellow
$results += Test-API -Name "Get Menu" -Method "GET" -Url "$baseUrl/menu"

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Test Results Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.Status -eq "Pass" }).Count
$failed = ($results | Where-Object { $_.Status -eq "Fail" }).Count
$total = $results.Count

Write-Host ""
Write-Host "Passed: $passed / $total" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "Failed: $failed / $total" -ForegroundColor Red
} else {
    Write-Host "Failed: $failed / $total" -ForegroundColor Green
}

if ($failed -gt 0) {
    Write-Host ""
    Write-Host "Failed Tests:" -ForegroundColor Red
    $results | Where-Object { $_.Status -eq "Fail" } | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
