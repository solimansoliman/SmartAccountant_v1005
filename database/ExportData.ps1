$connectionString = "Server=localhost\SQLEXPRESS;Database=SmartAccountant_v1005_DB;Integrated Security=True;TrustServerCertificate=True;"
$outputFile = "c:\MO\ai_proj\SmartAccountant_v1005\database\fullDB_data.sql"

$connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
$connection.Open()

Write-Host "Connected to database..." -ForegroundColor Green

$output = "-- SmartAccountant_v1005_DB Data Export`r`n"
$output += "-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`r`n"
$output += "USE [SmartAccountant_v1005_DB];`r`nGO`r`nSET NOCOUNT ON;`r`nGO`r`n`r`n"

function Export-Table {
    param ([string]$tableName, [string[]]$columns)
    
    $columnList = $columns -join ", "
    $query = "SELECT $columnList FROM [$tableName]"
    
    $command = New-Object System.Data.SqlClient.SqlCommand($query, $connection)
    $reader = $command.ExecuteReader()
    
    $result = @()
    $result += "-- ========== $tableName =========="
    $result += "SET IDENTITY_INSERT [$tableName] ON;"
    
    while ($reader.Read()) {
        $values = @()
        for ($i = 0; $i -lt $reader.FieldCount; $i++) {
            if ($reader.IsDBNull($i)) {
                $values += "NULL"
            } else {
                $value = $reader.GetValue($i)
                $type = $reader.GetFieldType($i)
                
                if ($type -eq [DateTime]) {
                    $values += "'" + $value.ToString("yyyy-MM-dd HH:mm:ss") + "'"
                } elseif ($type -eq [Boolean]) {
                    $values += if ($value) { "1" } else { "0" }
                } elseif ($type -eq [String]) {
                    $escaped = $value.Replace("'", "''")
                    $values += "N'$escaped'"
                } elseif ($type -eq [Decimal] -or $type -eq [Double] -or $type -eq [Single]) {
                    $values += $value.ToString([System.Globalization.CultureInfo]::InvariantCulture)
                } else {
                    $values += $value.ToString()
                }
            }
        }
        $valueStr = $values -join ", "
        $result += "INSERT INTO [$tableName] ([$($columns -join '], [')]) VALUES ($valueStr);"
    }
    
    $reader.Close()
    $result += "SET IDENTITY_INSERT [$tableName] OFF;"
    $result += "GO`r`n"
    
    return $result -join "`r`n"
}

Write-Host "Exporting tables..." -ForegroundColor Yellow

$tables = @(
    @{ Name = "Currencies"; Columns = @("Id", "Code", "Name", "NameEn", "Symbol", "ExchangeRate", "IsDefault", "IsActive", "CreatedAt") },
    @{ Name = "Accounts"; Columns = @("Id", "Name", "NameEn", "Email", "Phone", "Address", "CurrencyId", "IsActive", "CreatedAt") },
    @{ Name = "Users"; Columns = @("Id", "AccountId", "Username", "Email", "PasswordHash", "FullName", "Phone", "RoleType", "IsActive", "IsSuperAdmin", "Language", "CreatedAt") },
    @{ Name = "Roles"; Columns = @("Id", "AccountId", "Name", "NameEn", "Description", "IsSystemRole", "IsActive", "CreatedAt") },
    @{ Name = "UserRoles"; Columns = @("Id", "UserId", "RoleId", "AssignedAt") },
    @{ Name = "Permissions"; Columns = @("Id", "Code", "Name", "NameEn", "Description", "Module", "IsActive") },
    @{ Name = "RolePermissions"; Columns = @("Id", "RoleId", "PermissionId", "AssignedAt") },
    @{ Name = "Units"; Columns = @("Id", "AccountId", "Name", "NameEn", "Symbol", "IsBase", "ConversionFactor", "IsActive", "CreatedAt") },
    @{ Name = "ProductCategories"; Columns = @("Id", "AccountId", "Name", "NameEn", "IsActive") },
    @{ Name = "Products"; Columns = @("Id", "AccountId", "CategoryId", "UnitId", "Code", "Barcode", "Name", "NameEn", "Description", "CostPrice", "SellingPrice", "TaxPercent", "StockQuantity", "MinStockLevel", "IsActive", "CreatedAt") },
    @{ Name = "PhoneNumbers"; Columns = @("Id", "AccountId", "EntityType", "EntityId", "PhoneNumber", "CountryCode", "PhoneType", "IsPrimary", "IsWhatsApp", "IsActive", "CreatedAt") },
    @{ Name = "Emails"; Columns = @("Id", "AccountId", "EntityType", "EntityId", "EmailAddress", "EmailType", "IsPrimary", "IsActive", "CreatedAt") },
    @{ Name = "Customers"; Columns = @("Id", "AccountId", "CurrencyId", "Code", "Name", "NameEn", "Type", "TaxNumber", "Address", "City", "Balance", "CreditLimit", "TotalPurchases", "TotalPayments", "InvoiceCount", "IsActive", "CreatedAt") },
    @{ Name = "Invoices"; Columns = @("Id", "AccountId", "CustomerId", "UserId", "InvoiceNumber", "InvoiceType", "InvoiceDate", "SubTotal", "DiscountPercent", "DiscountAmount", "TaxAmount", "TotalAmount", "PaidAmount", "PaymentMethod", "Status", "Notes", "CreatedAt") },
    @{ Name = "InvoiceItems"; Columns = @("Id", "InvoiceId", "ProductId", "UnitId", "ProductName", "Quantity", "UnitPrice", "DiscountPercent", "DiscountAmount", "TaxPercent", "TaxAmount", "LineTotal") },
    @{ Name = "Payments"; Columns = @("Id", "AccountId", "CustomerId", "InvoiceId", "PaymentNumber", "PaymentType", "PaymentMethod", "Amount", "PaymentDate", "Description", "Status", "CreatedAt") },
    @{ Name = "ExpenseCategories"; Columns = @("Id", "AccountId", "Name", "NameEn", "IsActive") },
    @{ Name = "Expenses"; Columns = @("Id", "AccountId", "CategoryId", "Description", "Amount", "ExpenseDate", "PaymentMethod", "Status", "CreatedAt") },
    @{ Name = "SystemSettings"; Columns = @("Id", "AccountId", "Key", "Value", "Description", "UpdatedAt") }
)

foreach ($table in $tables) {
    try {
        Write-Host "  Exporting $($table.Name)..." -NoNewline
        $tableData = Export-Table -tableName $table.Name -columns $table.Columns
        $output += $tableData + "`r`n"
        Write-Host " Done" -ForegroundColor Green
    } catch {
        Write-Host " Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

$connection.Close()

[System.IO.File]::WriteAllText($outputFile, $output, [System.Text.Encoding]::UTF8)

Write-Host "`nExport completed successfully!" -ForegroundColor Green
Write-Host "Output file: $outputFile" -ForegroundColor Cyan
