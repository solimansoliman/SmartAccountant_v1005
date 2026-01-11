# سكريبت تصدير قاعدة البيانات SmartAccountant_v1005_DB
# يُنشئ ملفين: schema.sql (الهيكل) و fullDB_data.sql (البيانات)

$ServerInstance = "localhost\SQLEXPRESS"
$Database = "SmartAccountant_v1005_DB"
$OutputPath = "c:\MO\ai_proj\SmartAccountant_v1005\database"

Write-Host "=== تصدير قاعدة البيانات ===" -ForegroundColor Cyan
Write-Host "Server: $ServerInstance" -ForegroundColor Gray
Write-Host "Database: $Database" -ForegroundColor Gray
Write-Host ""

# تحميل SMO Assembly
try {
    [System.Reflection.Assembly]::LoadWithPartialName('Microsoft.SqlServer.SMO') | Out-Null
    [System.Reflection.Assembly]::LoadWithPartialName('Microsoft.SqlServer.SMOExtended') | Out-Null
}
catch {
    Write-Host "خطأ في تحميل مكتبات SQL Server" -ForegroundColor Red
    exit 1
}

# الاتصال بالسيرفر
$srv = New-Object Microsoft.SqlServer.Management.Smo.Server($ServerInstance)
$db = $srv.Databases[$Database]

if ($null -eq $db) {
    Write-Host "لم يتم العثور على قاعدة البيانات: $Database" -ForegroundColor Red
    exit 1
}

# إعداد خيارات السكريبت للهيكل
$schemaOptions = New-Object Microsoft.SqlServer.Management.Smo.ScriptingOptions
$schemaOptions.ScriptDrops = $false
$schemaOptions.ScriptSchema = $true
$schemaOptions.ScriptData = $false
$schemaOptions.Indexes = $true
$schemaOptions.DriAll = $true
$schemaOptions.Triggers = $true
$schemaOptions.NoCollation = $true
$schemaOptions.ToFileOnly = $true
$schemaOptions.FileName = "$OutputPath\schema.sql"
$schemaOptions.Encoding = [System.Text.Encoding]::UTF8

# تصدير الهيكل
Write-Host "جاري تصدير هيكل قاعدة البيانات..." -ForegroundColor Yellow

$scripter = New-Object Microsoft.SqlServer.Management.Smo.Scripter($srv)
$scripter.Options = $schemaOptions

# جمع الكائنات للتصدير
$objects = @()
foreach ($table in $db.Tables) {
    if (-not $table.IsSystemObject) {
        $objects += $table
    }
}

try {
    $scripter.Script($objects)
    Write-Host "تم تصدير الهيكل إلى: $OutputPath\schema.sql" -ForegroundColor Green
}
catch {
    Write-Host "خطأ في تصدير الهيكل: $_" -ForegroundColor Red
}

# تصدير البيانات
Write-Host ""
Write-Host "جاري تصدير البيانات..." -ForegroundColor Yellow

$dataFile = "$OutputPath\fullDB_data.sql"
$dataContent = @()
$dataContent += "-- ====================================="
$dataContent += "-- سكريبت بيانات قاعدة البيانات SmartAccountant_v1005_DB"
$dataContent += "-- تاريخ التصدير: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$dataContent += "-- ====================================="
$dataContent += ""
$dataContent += "SET IDENTITY_INSERT ON;"
$dataContent += "SET NOCOUNT ON;"
$dataContent += ""

# ترتيب الجداول بناءً على العلاقات
$tableOrder = @(
    "Accounts",
    "Currencies", 
    "Users",
    "Roles",
    "UserRoles",
    "Permissions",
    "RolePermissions",
    "SystemSettings",
    "MenuItems",
    "Tags",
    "TransactionTypes",
    "ProductCategories",
    "Units",
    "Products",
    "ProductUnits",
    "PhoneNumbers",
    "Emails",
    "Customers",
    "Invoices",
    "InvoiceItems",
    "Payments",
    "ExpenseCategories",
    "Expenses",
    "RevenueCategories",
    "Revenues",
    "Messages",
    "Notifications",
    "Comments",
    "Attachments",
    "EntityTags",
    "ActivityLogs"
)

foreach ($tableName in $tableOrder) {
    $table = $db.Tables[$tableName]
    if ($null -eq $table) {
        continue
    }
    
    Write-Host "  - جاري تصدير: $tableName" -ForegroundColor Gray
    
    # جلب البيانات
    $query = "SELECT * FROM [$tableName]"
    $reader = $db.ExecuteReader($query)
    
    $hasRows = $false
    $columns = @()
    
    while ($reader.Read()) {
        if (-not $hasRows) {
            $hasRows = $true
            $dataContent += "-- جدول: $tableName"
            $dataContent += "SET IDENTITY_INSERT [$tableName] ON;"
            
            # جمع أسماء الأعمدة
            for ($i = 0; $i -lt $reader.FieldCount; $i++) {
                $columns += $reader.GetName($i)
            }
        }
        
        # بناء INSERT statement
        $values = @()
        for ($i = 0; $i -lt $reader.FieldCount; $i++) {
            $val = $reader.GetValue($i)
            if ($null -eq $val -or $val -is [DBNull]) {
                $values += "NULL"
            }
            elseif ($val -is [string]) {
                $escaped = $val.Replace("'", "''")
                $values += "N'$escaped'"
            }
            elseif ($val -is [datetime]) {
                $values += "'" + $val.ToString("yyyy-MM-dd HH:mm:ss.fff") + "'"
            }
            elseif ($val -is [bool]) {
                $values += if ($val) { "1" } else { "0" }
            }
            elseif ($val -is [byte[]]) {
                $values += "0x" + [BitConverter]::ToString($val).Replace("-", "")
            }
            else {
                $values += $val.ToString()
            }
        }
        
        $colList = "[" + ($columns -join "],[") + "]"
        $valList = $values -join ","
        $dataContent += "INSERT INTO [$tableName] ($colList) VALUES ($valList);"
    }
    
    $reader.Close()
    
    if ($hasRows) {
        $dataContent += "SET IDENTITY_INSERT [$tableName] OFF;"
        $dataContent += ""
    }
}

$dataContent += ""
$dataContent += "SET NOCOUNT OFF;"
$dataContent += "PRINT N'تم استيراد البيانات بنجاح!';"

# حفظ ملف البيانات
$dataContent | Out-File -FilePath $dataFile -Encoding UTF8

Write-Host ""
Write-Host "تم تصدير البيانات إلى: $dataFile" -ForegroundColor Green
Write-Host ""
Write-Host "=== تم الانتهاء ===" -ForegroundColor Cyan
