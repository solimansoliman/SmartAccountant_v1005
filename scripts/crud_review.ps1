param(
	[string]$BaseUrl = 'http://localhost:5000/api',
	[int]$AccountId,
	[int]$UserId
)

$base = $BaseUrl
$providedAccountId = $null
$providedUserId = $null
$accountProvided = $PSBoundParameters.ContainsKey('AccountId')
$userProvided = $PSBoundParameters.ContainsKey('UserId')

if ($accountProvided) { $providedAccountId = $AccountId }
if ($userProvided) { $providedUserId = $UserId }

$defaultAccountHeader = if ($providedAccountId) { "$providedAccountId" } else { '2' }
$defaultUserHeader = if ($providedUserId) { "$providedUserId" } else { '2' }
$headers = @{ 'X-Account-Id' = $defaultAccountHeader; 'X-User-Id' = $defaultUserHeader; 'Content-Type' = 'application/json' }

function Resolve-TestIdentity {
	$resolvedAccountId = if ($providedAccountId) { [int]$providedAccountId } else { 2 }
	$resolvedUserId = if ($providedUserId) { [int]$providedUserId } else { 2 }

	if (-not $accountProvided) {
		for ($attempt = 1; $attempt -le 5; $attempt++) {
			try {
				$accountsResponse = Invoke-WebRequest -Uri "$base/accounts" -Headers $headers -UseBasicParsing
				$accountsData = $accountsResponse.Content | ConvertFrom-Json
				$firstAccount = @($accountsData | Where-Object { $_.id -ne $null -or $_.Id -ne $null }) | Select-Object -First 1
				if ($firstAccount) {
					$resolvedAccountId = if ($firstAccount.id -ne $null) { [int]$firstAccount.id } else { [int]$firstAccount.Id }
					break
				}
			}
			catch {
				Start-Sleep -Seconds 1
			}
		}
	}

	if (-not $userProvided) {
		for ($probeUser = 1; $probeUser -le 25; $probeUser++) {
			try {
				$probeHeaders = @{ 'X-Account-Id' = "$resolvedAccountId"; 'X-User-Id' = "$probeUser"; 'Content-Type' = 'application/json' }
				$usersResponse = Invoke-WebRequest -Uri "$base/messages/users" -Headers $probeHeaders -UseBasicParsing
				$usersData = $usersResponse.Content | ConvertFrom-Json
				$matchingUser = @($usersData | Where-Object { ($_.accountId -ne $null -and [int]$_.accountId -eq $resolvedAccountId) -or ($_.AccountId -ne $null -and [int]$_.AccountId -eq $resolvedAccountId) }) | Select-Object -First 1
				if (-not $matchingUser) {
					$matchingUser = @($usersData) | Select-Object -First 1
				}
				if ($matchingUser) {
					$resolvedUserId = if ($matchingUser.id -ne $null) { [int]$matchingUser.id } else { [int]$matchingUser.Id }
					break
				}
			}
			catch {}
		}
	}

	$script:headers = @{ 'X-Account-Id' = "$resolvedAccountId"; 'X-User-Id' = "$resolvedUserId"; 'Content-Type' = 'application/json' }
	if ($accountProvided -or $userProvided) {
		Write-Output "Using headers: AccountId=$resolvedAccountId, UserId=$resolvedUserId (from args/fallback)"
	}
	else {
		Write-Output "Using headers: AccountId=$resolvedAccountId, UserId=$resolvedUserId"
	}
}

function Invoke-Api {
	param(
		[string]$Method,
		[string]$Path,
		$Body = $null
	)

	$url = "$base$Path"
	try {
		if ($null -ne $Body) {
			$json = $Body | ConvertTo-Json -Depth 30 -Compress
			$res = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -Body $json -UseBasicParsing
		}
		else {
			$res = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -UseBasicParsing
		}

		$data = $null
		if ($res.Content) {
			try { $data = $res.Content | ConvertFrom-Json }
			catch { $data = $res.Content }
		}

		return [pscustomobject]@{ ok = $true; status = [int]$res.StatusCode; data = $data; raw = $res.Content; url = $url; method = $Method }
	}
	catch {
		$status = 0
		$raw = ''
		if ($_.Exception.Response) {
			try { $status = [int]$_.Exception.Response.StatusCode }
			catch { $status = 0 }
			try {
				$sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
				$raw = $sr.ReadToEnd()
				$sr.Close()
			}
			catch {}
		}
		else {
			$raw = $_.Exception.Message
		}

		$data = $null
		if ($raw) {
			try { $data = $raw | ConvertFrom-Json }
			catch { $data = $raw }
		}

		return [pscustomobject]@{ ok = $false; status = $status; data = $data; raw = $raw; url = $url; method = $Method }
	}
}

$results = New-Object System.Collections.Generic.List[object]
function Add-Result {
	param([string]$Module, [string]$Operation, $Response, [int[]]$Expected)

	$pass = $Expected -contains [int]$Response.status
	$msg = ''
	if (-not $pass) {
		if ($Response.data -and $Response.data.message) { $msg = [string]$Response.data.message }
		elseif ($Response.raw) { $msg = [string]$Response.raw }
	}

	$results.Add([pscustomobject]@{
			Module    = $Module
			Operation = $Operation
			Status    = [int]$Response.status
			Pass      = $pass
			Message   = $msg
		}) | Out-Null
}

function Get-EntityId {
	param($Obj)

	if ($null -eq $Obj) { return $null }
	if ($Obj.PSObject.Properties['Id']) { return [int]$Obj.Id }
	if ($Obj.PSObject.Properties['id']) { return [int]$Obj.id }
	return $null
}

Resolve-TestIdentity

$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$productId = $null
$customerId = $null
$invoiceId = $null
$paymentId = $null
$expenseId = $null
$revenueId = $null

# Expense category precondition
$expCats = Invoke-Api -Method 'GET' -Path '/expenses/categories'
Add-Result -Module 'Expenses' -Operation 'ListCategories' -Response $expCats -Expected @(200)
$expenseCategoryId = $null
if ($expCats.ok -and $expCats.status -eq 200 -and $expCats.data) {
	$firstCat = @($expCats.data)[0]
	$firstCatId = Get-EntityId $firstCat
	if ($firstCatId) { $expenseCategoryId = $firstCatId }
}
if (-not $expenseCategoryId) {
	$newExpCat = Invoke-Api -Method 'POST' -Path '/expenses/categories' -Body @{ name = "AutoExpenseCat-$ts"; nameEn = "Auto Expense Cat $ts"; code = "AEC$ts"; isActive = $true }
	Add-Result -Module 'Expenses' -Operation 'CreateCategoryFallback' -Response $newExpCat -Expected @(200, 201)
	$expenseCategoryId = Get-EntityId $newExpCat.data
}

# Revenue category precondition
$revCats = Invoke-Api -Method 'GET' -Path '/revenues/categories'
Add-Result -Module 'Revenues' -Operation 'ListCategories' -Response $revCats -Expected @(200)
$revenueCategoryId = $null
if ($revCats.ok -and $revCats.status -eq 200 -and $revCats.data) {
	$firstRCat = @($revCats.data)[0]
	$firstRCatId = Get-EntityId $firstRCat
	if ($firstRCatId) { $revenueCategoryId = $firstRCatId }
}
if (-not $revenueCategoryId) {
	$newRevCat = Invoke-Api -Method 'POST' -Path '/revenues/categories' -Body @{ name = "AutoRevenueCat-$ts"; nameEn = "Auto Revenue Cat $ts"; code = "ARC$ts"; isActive = $true }
	Add-Result -Module 'Revenues' -Operation 'CreateCategoryFallback' -Response $newRevCat -Expected @(200, 201)
	$revenueCategoryId = Get-EntityId $newRevCat.data
}

# Products
$pList = Invoke-Api -Method 'GET' -Path '/products'
Add-Result -Module 'Products' -Operation 'List' -Response $pList -Expected @(200)

$pCreate = Invoke-Api -Method 'POST' -Path '/products' -Body @{
	code         = "TP$ts"
	name         = "CRUD Product $ts"
	description  = 'auto test'
	costPrice    = 10
	sellingPrice = 15
	stockQuantity = 5
	minStockLevel = 1
	taxPercent   = 0
	isActive     = $true
}
Add-Result -Module 'Products' -Operation 'Create' -Response $pCreate -Expected @(200, 201)
$productId = Get-EntityId $pCreate.data

if ($productId) {
	$pGet = Invoke-Api -Method 'GET' -Path "/products/$productId"
	Add-Result -Module 'Products' -Operation 'GetById' -Response $pGet -Expected @(200)

	$pUpdate = Invoke-Api -Method 'PUT' -Path "/products/$productId" -Body @{
		id          = $productId
		code        = "TP$ts-U"
		name        = "CRUD Product Updated $ts"
		description = 'auto test updated'
		costPrice   = 11
		sellingPrice = 16
		stockQuantity = 6
		minStockLevel = 1
		taxPercent  = 0
		isActive    = $true
	}
	Add-Result -Module 'Products' -Operation 'Update' -Response $pUpdate -Expected @(200, 204)
}

# Customers
$cList = Invoke-Api -Method 'GET' -Path '/customers'
Add-Result -Module 'Customers' -Operation 'List' -Response $cList -Expected @(200)

$cCreate = Invoke-Api -Method 'POST' -Path '/customers' -Body @{
	code                = "TC$ts"
	name                = "CRUD Customer $ts"
	address             = 'Test Address'
	type                = 1
	notes               = 'auto test'
	isVIP               = $false
	primaryEmailAddress = "crud$ts@example.com"
}
Add-Result -Module 'Customers' -Operation 'Create' -Response $cCreate -Expected @(200, 201)
$customerId = Get-EntityId $cCreate.data

if ($customerId) {
	$cGet = Invoke-Api -Method 'GET' -Path "/customers/$customerId"
	Add-Result -Module 'Customers' -Operation 'GetById' -Response $cGet -Expected @(200)

	$cUpdate = Invoke-Api -Method 'PUT' -Path "/customers/$customerId" -Body @{
		name                = "CRUD Customer Updated $ts"
		address             = 'Updated Address'
		type                = 2
		notes               = 'updated'
		isVIP               = $true
		primaryEmailAddress = "crud-upd$ts@example.com"
	}
	Add-Result -Module 'Customers' -Operation 'Update' -Response $cUpdate -Expected @(200, 204)
}

# Invoices
$iList = Invoke-Api -Method 'GET' -Path '/invoices'
Add-Result -Module 'Invoices' -Operation 'List' -Response $iList -Expected @(200)

if ($productId) {
	$invoiceCustomerId = if ($customerId) { $customerId } else { 0 }
	$iCreate = Invoke-Api -Method 'POST' -Path '/invoices' -Body @{
		invoiceType     = 'Sales'
		customerId      = $invoiceCustomerId
		invoiceDate     = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
		dueDate         = (Get-Date).AddDays(7).ToString('yyyy-MM-ddTHH:mm:ss')
		notes           = "Invoice auto test $ts"
		discountPercent = 0
		discountAmount  = 0
		paidAmount      = 0
		paymentMethod   = 'Cash'
		items           = @(
			@{ productId = $productId; productName = "Invoice Product $ts"; quantity = 1; unitPrice = 20; discountPercent = 0; discountAmount = 0; taxPercent = 0 }
		)
	}
	Add-Result -Module 'Invoices' -Operation 'Create' -Response $iCreate -Expected @(200, 201)
	$invoiceId = Get-EntityId $iCreate.data

	if ($invoiceId) {
		$iGet = Invoke-Api -Method 'GET' -Path "/invoices/$invoiceId"
		Add-Result -Module 'Invoices' -Operation 'GetById' -Response $iGet -Expected @(200)

		$iUpdate = Invoke-Api -Method 'PUT' -Path "/invoices/$invoiceId" -Body @{
			invoiceType     = 'Sales'
			customerId      = $invoiceCustomerId
			invoiceDate     = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
			dueDate         = (Get-Date).AddDays(10).ToString('yyyy-MM-ddTHH:mm:ss')
			notes           = "Invoice updated auto test $ts"
			discountPercent = 0
			discountAmount  = 0
			paidAmount      = 0
			paymentMethod   = 'Cash'
			items           = @(
				@{ productId = $productId; productName = "Invoice Product Updated $ts"; quantity = 1; unitPrice = 22; discountPercent = 0; discountAmount = 0; taxPercent = 0 }
			)
		}
		Add-Result -Module 'Invoices' -Operation 'Update' -Response $iUpdate -Expected @(200, 204)
	}
}

# Payments
$payList = Invoke-Api -Method 'GET' -Path '/payments'
Add-Result -Module 'Payments' -Operation 'List' -Response $payList -Expected @(200)

$paymentCustomerId = if ($customerId) { $customerId } else { 1 }
$payCreate = Invoke-Api -Method 'POST' -Path '/payments' -Body @{
	paymentType   = 'Receipt'
	customerId    = $paymentCustomerId
	amount        = 7
	paymentDate   = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
	paymentMethod = 'Cash'
	description   = "Payment auto test $ts"
	status        = 'Completed'
	notes         = 'auto'
}
Add-Result -Module 'Payments' -Operation 'Create' -Response $payCreate -Expected @(200, 201)
$paymentId = Get-EntityId $payCreate.data

if ($paymentId) {
	$payGet = Invoke-Api -Method 'GET' -Path "/payments/$paymentId"
	Add-Result -Module 'Payments' -Operation 'GetById' -Response $payGet -Expected @(200)

	$payUpdate = Invoke-Api -Method 'PUT' -Path "/payments/$paymentId" -Body @{
		amount        = 8
		notes         = "updated $ts"
		paymentMethod = 'Cash'
		status        = 'Completed'
	}
	Add-Result -Module 'Payments' -Operation 'Update' -Response $payUpdate -Expected @(200, 204)
}

# Expenses
$eList = Invoke-Api -Method 'GET' -Path '/expenses'
Add-Result -Module 'Expenses' -Operation 'List' -Response $eList -Expected @(200)

$eCreate = Invoke-Api -Method 'POST' -Path '/expenses' -Body @{
	expenseDate   = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
	categoryId    = $expenseCategoryId
	amount        = 12
	taxAmount     = 0
	paymentMethod = 'Cash'
	description   = "Expense auto test $ts"
	status        = 'Pending'
}
Add-Result -Module 'Expenses' -Operation 'Create' -Response $eCreate -Expected @(200, 201)
$expenseId = Get-EntityId $eCreate.data

if ($expenseId) {
	$eGet = Invoke-Api -Method 'GET' -Path "/expenses/$expenseId"
	Add-Result -Module 'Expenses' -Operation 'GetById' -Response $eGet -Expected @(200)

	$eUpdate = Invoke-Api -Method 'PUT' -Path "/expenses/$expenseId" -Body @{
		id            = $expenseId
		expenseDate   = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
		categoryId    = $expenseCategoryId
		amount        = 13
		taxAmount     = 0
		paymentMethod = 'Cash'
		description   = "Expense updated $ts"
		status        = 'Pending'
	}
	Add-Result -Module 'Expenses' -Operation 'Update' -Response $eUpdate -Expected @(200, 204)
}

# Revenues
$rList = Invoke-Api -Method 'GET' -Path '/revenues'
Add-Result -Module 'Revenues' -Operation 'List' -Response $rList -Expected @(200)

if ($revenueCategoryId) {
	$rCreate = Invoke-Api -Method 'POST' -Path '/revenues' -Body @{
		categoryId    = $revenueCategoryId
		amount        = 18
		taxAmount     = 0
		revenueDate   = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
		description   = "Revenue auto test $ts"
		paymentMethod = 'Cash'
		notes         = 'auto'
	}
	Add-Result -Module 'Revenues' -Operation 'Create' -Response $rCreate -Expected @(200, 201)
	$revenueId = Get-EntityId $rCreate.data

	if ($revenueId) {
		$rGet = Invoke-Api -Method 'GET' -Path "/revenues/$revenueId"
		Add-Result -Module 'Revenues' -Operation 'GetById' -Response $rGet -Expected @(200)

		$rUpdate = Invoke-Api -Method 'PUT' -Path "/revenues/$revenueId" -Body @{
			id            = $revenueId
			categoryId    = $revenueCategoryId
			amount        = 19
			taxAmount     = 0
			revenueDate   = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
			description   = "Revenue updated $ts"
			paymentMethod = 'Cash'
			notes         = 'updated'
		}
		Add-Result -Module 'Revenues' -Operation 'Update' -Response $rUpdate -Expected @(200, 204)
	}
}

# Cleanup delete operations
if ($paymentId) {
	$payDelete = Invoke-Api -Method 'DELETE' -Path "/payments/$paymentId"
	Add-Result -Module 'Payments' -Operation 'Delete' -Response $payDelete -Expected @(200, 204)
}
if ($invoiceId) {
	$iDelete = Invoke-Api -Method 'DELETE' -Path "/invoices/$invoiceId"
	Add-Result -Module 'Invoices' -Operation 'Delete' -Response $iDelete -Expected @(200, 204)
}
if ($expenseId) {
	$eDelete = Invoke-Api -Method 'DELETE' -Path "/expenses/$expenseId"
	Add-Result -Module 'Expenses' -Operation 'Delete' -Response $eDelete -Expected @(200, 204)
}
if ($revenueId) {
	$rDelete = Invoke-Api -Method 'DELETE' -Path "/revenues/$revenueId"
	Add-Result -Module 'Revenues' -Operation 'Delete' -Response $rDelete -Expected @(200, 204)
}
if ($customerId) {
	$cDelete = Invoke-Api -Method 'DELETE' -Path "/customers/$customerId"
	Add-Result -Module 'Customers' -Operation 'Delete' -Response $cDelete -Expected @(200, 204)
}
if ($productId) {
	$pDelete = Invoke-Api -Method 'DELETE' -Path "/products/$productId"
	Add-Result -Module 'Products' -Operation 'Delete' -Response $pDelete -Expected @(200, 204)
}

$failed = @($results | Where-Object { -not $_.Pass })
$passedCount = ($results | Where-Object { $_.Pass }).Count
$totalCount = $results.Count

Write-Output '=== CRUD REVIEW SUMMARY ==='
Write-Output "Passed: $passedCount / $totalCount"
if ($failed.Count -gt 0) {
	Write-Output '--- FAILED OPS ---'
	$failed | Select-Object Module, Operation, Status, Message | Format-Table -AutoSize | Out-String | Write-Output
}
Write-Output '--- ALL OPS ---'
$results | Select-Object Module, Operation, Status, Pass | Format-Table -AutoSize | Out-String | Write-Output
