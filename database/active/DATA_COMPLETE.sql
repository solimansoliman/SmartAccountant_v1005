-- =====================================================
-- ملف: البيانات الأساسية الكاملة
-- الوصف: ملف شامل يحتوي على جميع البيانات الأساسية والإصلاحات
-- الإصدار: 1.0.5
-- آخر تحديث: مارس 2026
-- المتطلبات: تشغيل SCHEMA_COMPLETE.sql أولاً
-- الاستخدام: sqlcmd -S "(localdb)\mssqllocaldb" -d "SmartAccountant_v1005_DB" -f 65001 -i "DATA_COMPLETE.sql"
-- =====================================================

USE [SmartAccountant_v1005_DB];

PRINT N'';
PRINT N'═══════════════════════════════════════════════════════════';
PRINT N'مرحباً - جاري تحضير البيانات الأساسية...';
PRINT N'═══════════════════════════════════════════════════════════';
PRINT N'';

-- =====================================================
-- 1. CLEANUP DATA
-- =====================================================

PRINT N'[1/5] تنظيف البيانات السابقة...';

DELETE FROM [ActivityLogs];
DELETE FROM [PhoneNumbers];
DELETE FROM [Invoices];
DELETE FROM [Customers];
DELETE FROM [Cities];
DELETE FROM [Provinces];
DELETE FROM [RolePermissions];
DELETE FROM [Users];
DELETE FROM [SystemSettings];
DELETE FROM [Accounts];
DELETE FROM [Countries];
DELETE FROM [Permissions];
DELETE FROM [Roles];
DELETE FROM [Plans];
DELETE FROM [Currencies];

-- Reset identity seeds
DBCC CHECKIDENT ('[ActivityLogs]', RESEED, 0);
DBCC CHECKIDENT ('[PhoneNumbers]', RESEED, 0);
DBCC CHECKIDENT ('[Invoices]', RESEED, 0);
DBCC CHECKIDENT ('[Customers]', RESEED, 0);
DBCC CHECKIDENT ('[Cities]', RESEED, 0);
DBCC CHECKIDENT ('[Provinces]', RESEED, 0);
DBCC CHECKIDENT ('[Users]', RESEED, 0);
DBCC CHECKIDENT ('[SystemSettings]', RESEED, 0);
DBCC CHECKIDENT ('[Accounts]', RESEED, 0);
DBCC CHECKIDENT ('[Countries]', RESEED, 0);
DBCC CHECKIDENT ('[Permissions]', RESEED, 0);
DBCC CHECKIDENT ('[Roles]', RESEED, 0);
DBCC CHECKIDENT ('[Plans]', RESEED, 0);
DBCC CHECKIDENT ('[Currencies]', RESEED, 0);

PRINT N'✓ تم التنظيف بنجاح';

-- =====================================================
-- 2. INSERT CURRENCIES
-- =====================================================

PRINT N'[2/5] إضافة العملات...';

INSERT INTO [Currencies] ([Code], [Name], [NameEn], [Symbol], [Country], [CountryCode], [DecimalPlaces], [IsActive], [IsDefault])
VALUES
(N'SAR', N'ريال سعودي', 'Saudi Riyal', N'﷼', N'المملكة العربية السعودية', 'SA', 2, 1, 1),
(N'AED', N'درهم إماراتي', 'AED', N'د.إ', N'الإمارات', 'AE', 2, 1, 0),
(N'EGP', N'جنيه مصري', 'Egyptian Pound', N'£', N'مصر', 'EG', 2, 1, 0),
(N'USD', N'دولار أمريكي', 'US Dollar', N'$', N'USA', 'US', 2, 1, 0),
(N'EUR', N'يورو', 'Euro', N'€', N'EU', 'EU', 2, 1, 0);

PRINT N'✓ تمت إضافة 5 عملات';

-- =====================================================
-- 3. INSERT PLANS
-- =====================================================

PRINT N'[3/5] إضافة الخطط والأدوار...';

-- مهم: عند إدراج نص عربي في SQL Server استخدم N قبل النص: N'...'
-- هذا يمنع ظهور نصوص مشوهة مثل: Ø§Ù„Ø®Ø·Ø© ...
INSERT INTO [Plans] ([Name], [Description], [Price], [BillingCycle], [MaxAccounts], [MaxUsers], [MaxInvoices], [MaxCustomers], [IsActive], [DisplayOrder])
VALUES
(N'الخطة الأساسية', N'خطة أساسية مناسبة للشركات الصغيرة والمتوسطة الناشئة', 99.00, 30, 1, 3, 100, 50, 1, 1),
(N'الخطة الاحترافية', N'خطة احترافية مناسبة للشركات المتوسطة والنامية', 299.00, 30, 3, 10, 1000, 500, 1, 2),
(N'خطة المؤسسات', N'خطة متقدمة للمؤسسات الكبرى مع كامل المزايا', 999.00, 30, 10, 50, 10000, 5000, 1, 3);

-- =====================================================
-- 4. INSERT ROLES AND PERMISSIONS
-- =====================================================

INSERT INTO [Roles] ([Name], [Description], [IsSystemRole], [IsActive], [RoleType])
VALUES
(N'مسؤول', N'دور مسؤول بصلاحيات كاملة', 1, 1, N'Admin'),
(N'مدير', N'دور مدير العمليات', 1, 1, N'Manager'),
(N'محاسب', N'إدارة العمليات المالية اليومية', 1, 1, N'Accountant'),
(N'أمين مخزون', N'إدارة المخزون وحركة المنتجات', 1, 1, N'Inventory'),
(N'موظف مبيعات', N'إدخال الفواتير ومتابعة العملاء', 1, 1, N'Sales'),
(N'موظف', N'دور موظف', 1, 1, N'Staff'),
(N'عارض', N'عارض فقط', 1, 1, N'Viewer');

INSERT INTO [Permissions] ([Name], [Description], [Category], [IsActive])
VALUES
(N'عرض', N'عرض البيانات', N'view', 1),
(N'إضافة', N'إضافة سجل جديد', N'create', 1),
(N'تعديل', N'تعديل البيانات', N'edit', 1),
(N'حذف', N'حذف السجل', N'delete', 1),
(N'تصدير', N'تصدير البيانات', N'export', 1);

PRINT N'✓ تمت إضافة 7 أدوار و 5 صلاحيات';

-- Assign permissions to roles
INSERT INTO [RolePermissions] ([RoleId], [PermissionId])
SELECT 1, [Id] FROM [Permissions] WHERE [IsActive] = 1;

INSERT INTO [RolePermissions] ([RoleId], [PermissionId])
SELECT 2, [Id] FROM [Permissions] WHERE [IsActive] = 1;

INSERT INTO [RolePermissions] ([RoleId], [PermissionId])
SELECT 3, [Id] FROM [Permissions] WHERE [Category] IN (N'view', N'create', N'edit', N'export') AND [IsActive] = 1;

INSERT INTO [RolePermissions] ([RoleId], [PermissionId])
SELECT 4, [Id] FROM [Permissions] WHERE [Category] IN (N'view', N'create', N'edit') AND [IsActive] = 1;

INSERT INTO [RolePermissions] ([RoleId], [PermissionId])
SELECT 5, [Id] FROM [Permissions] WHERE [Category] IN (N'view', N'create') AND [IsActive] = 1;

INSERT INTO [RolePermissions] ([RoleId], [PermissionId])
SELECT 6, [Id] FROM [Permissions] WHERE [Category] IN (N'view', N'create', N'edit') AND [IsActive] = 1;

INSERT INTO [RolePermissions] ([RoleId], [PermissionId])
SELECT 7, [Id] FROM [Permissions] WHERE [Category] = N'view' AND [IsActive] = 1;

-- =====================================================
-- 5. INSERT COUNTRIES
-- =====================================================

INSERT INTO [Countries] ([Code], [Name], [NameEn], [Region], [PhoneCode], [IsActive])
VALUES
(N'SA', N'المملكة العربية السعودية', 'Saudi Arabia', N'الخليج', N'+966', 1),
(N'AE', N'الإمارات العربية المتحدة', 'United Arab Emirates', N'الخليج', N'+971', 1),
(N'KW', N'دولة الكويت', 'Kuwait', N'الخليج', N'+965', 1),
(N'QA', N'دولة قطر', 'Qatar', N'الخليج', N'+974', 1),
(N'OM', N'سلطنة عمان', 'Oman', N'الخليج', N'+968', 1),
(N'BH', N'مملكة البحرين', 'Bahrain', N'الخليج', N'+973', 1),
(N'EG', N'جمهورية مصر العربية', 'Egypt', N'شمال أفريقيا', N'+20', 1),
(N'JO', N'المملكة الأردنية الهاشمية', 'Jordan', N'بلاد الشام', N'+962', 1),
(N'LB', N'جمهورية لبنان', 'Lebanon', N'بلاد الشام', N'+961', 1),
(N'SY', N'الجمهورية العربية السورية', 'Syria', N'بلاد الشام', N'+963', 1),
(N'IQ', N'جمهورية العراق', 'Iraq', N'بلاد الشام', N'+964', 1),
(N'PS', N'دولة فلسطين', 'Palestine', N'بلاد الشام', N'+970', 1),
(N'SD', N'جمهورية السودان', 'Sudan', N'شرق أفريقيا', N'+249', 1),
(N'LY', N'دولة ليبيا', 'Libya', N'شمال أفريقيا', N'+218', 1),
(N'TN', N'الجمهورية التونسية', 'Tunisia', N'شمال أفريقيا', N'+216', 1),
(N'DZ', N'الجمهورية الجزائرية', 'Algeria', N'شمال أفريقيا', N'+213', 1),
(N'MA', N'المملكة المغربية', 'Morocco', N'شمال أفريقيا', N'+212', 1),
(N'MR', N'الجمهورية الإسلامية الموريتانية', 'Mauritania', N'شمال أفريقيا', N'+222', 1),
(N'DJ', N'جمهورية جيبوتي', 'Djibouti', N'شرق أفريقيا', N'+253', 1),
(N'SO', N'جمهورية الصومال', 'Somalia', N'شرق أفريقيا', N'+252', 1);

PRINT N'✓ تمت إضافة 20 دولة عربية';

-- =====================================================
-- 5.1 INSERT PROVINCES
-- =====================================================

INSERT INTO [Provinces] ([CountryId], [Code], [Name], [NameEn], [IsActive])
VALUES
((SELECT TOP 1 [Id] FROM [Countries] WHERE [Code] = N'SA'), N'RIY', N'منطقة الرياض', N'Riyadh Region', 1),
((SELECT TOP 1 [Id] FROM [Countries] WHERE [Code] = N'SA'), N'MKK', N'منطقة مكة المكرمة', N'Makkah Region', 1),
((SELECT TOP 1 [Id] FROM [Countries] WHERE [Code] = N'SA'), N'EST', N'المنطقة الشرقية', N'Eastern Region', 1),

((SELECT TOP 1 [Id] FROM [Countries] WHERE [Code] = N'AE'), N'DXB', N'إمارة دبي', N'Dubai', 1),
((SELECT TOP 1 [Id] FROM [Countries] WHERE [Code] = N'AE'), N'AUH', N'إمارة أبوظبي', N'Abu Dhabi', 1),
((SELECT TOP 1 [Id] FROM [Countries] WHERE [Code] = N'AE'), N'SHJ', N'إمارة الشارقة', N'Sharjah', 1),

((SELECT TOP 1 [Id] FROM [Countries] WHERE [Code] = N'EG'), N'C', N'محافظة القاهرة', N'Cairo Governorate', 1),
((SELECT TOP 1 [Id] FROM [Countries] WHERE [Code] = N'EG'), N'GZ', N'محافظة الجيزة', N'Giza Governorate', 1),
((SELECT TOP 1 [Id] FROM [Countries] WHERE [Code] = N'EG'), N'ALX', N'محافظة الإسكندرية', N'Alexandria Governorate', 1);

PRINT N'✓ تمت إضافة المحافظات الأساسية';

-- =====================================================
-- 5.2 INSERT CITIES
-- =====================================================

INSERT INTO [Cities] ([ProvinceId], [Name], [NameEn], [IsActive])
VALUES
((SELECT TOP 1 p.[Id] FROM [Provinces] p INNER JOIN [Countries] c ON p.[CountryId] = c.[Id] WHERE c.[Code] = N'SA' AND p.[Code] = N'RIY'), N'الرياض', N'Riyadh', 1),
((SELECT TOP 1 p.[Id] FROM [Provinces] p INNER JOIN [Countries] c ON p.[CountryId] = c.[Id] WHERE c.[Code] = N'SA' AND p.[Code] = N'RIY'), N'الخرج', N'Al Kharj', 1),
((SELECT TOP 1 p.[Id] FROM [Provinces] p INNER JOIN [Countries] c ON p.[CountryId] = c.[Id] WHERE c.[Code] = N'SA' AND p.[Code] = N'MKK'), N'جدة', N'Jeddah', 1),
((SELECT TOP 1 p.[Id] FROM [Provinces] p INNER JOIN [Countries] c ON p.[CountryId] = c.[Id] WHERE c.[Code] = N'SA' AND p.[Code] = N'MKK'), N'مكة المكرمة', N'Makkah', 1),
((SELECT TOP 1 p.[Id] FROM [Provinces] p INNER JOIN [Countries] c ON p.[CountryId] = c.[Id] WHERE c.[Code] = N'SA' AND p.[Code] = N'EST'), N'الدمام', N'Dammam', 1),
((SELECT TOP 1 p.[Id] FROM [Provinces] p INNER JOIN [Countries] c ON p.[CountryId] = c.[Id] WHERE c.[Code] = N'SA' AND p.[Code] = N'EST'), N'الخبر', N'Al Khobar', 1),

((SELECT TOP 1 p.[Id] FROM [Provinces] p INNER JOIN [Countries] c ON p.[CountryId] = c.[Id] WHERE c.[Code] = N'AE' AND p.[Code] = N'DXB'), N'دبي', N'Dubai', 1),
((SELECT TOP 1 p.[Id] FROM [Provinces] p INNER JOIN [Countries] c ON p.[CountryId] = c.[Id] WHERE c.[Code] = N'AE' AND p.[Code] = N'AUH'), N'أبوظبي', N'Abu Dhabi', 1),
((SELECT TOP 1 p.[Id] FROM [Provinces] p INNER JOIN [Countries] c ON p.[CountryId] = c.[Id] WHERE c.[Code] = N'AE' AND p.[Code] = N'SHJ'), N'الشارقة', N'Sharjah', 1),

((SELECT TOP 1 p.[Id] FROM [Provinces] p INNER JOIN [Countries] c ON p.[CountryId] = c.[Id] WHERE c.[Code] = N'EG' AND p.[Code] = N'C'), N'القاهرة', N'Cairo', 1),
((SELECT TOP 1 p.[Id] FROM [Provinces] p INNER JOIN [Countries] c ON p.[CountryId] = c.[Id] WHERE c.[Code] = N'EG' AND p.[Code] = N'GZ'), N'الجيزة', N'Giza', 1),
((SELECT TOP 1 p.[Id] FROM [Provinces] p INNER JOIN [Countries] c ON p.[CountryId] = c.[Id] WHERE c.[Code] = N'EG' AND p.[Code] = N'ALX'), N'الإسكندرية', N'Alexandria', 1);

PRINT N'✓ تمت إضافة المدن الأساسية';

-- =====================================================
-- 6. CREATE ADMIN ACCOUNT
-- =====================================================

PRINT N'[4/5] إنشاء حساب الإدارة...';

INSERT INTO [Accounts] ([Name], [NameEn], [Email], [Phone], [CurrencyId], [TaxNumber], [IsActive], [PlanId])
VALUES
(N'شركة التجريب', 'Demo Company', N'admin@smartaccountant.local', N'+966123456789', 
    (SELECT TOP 1 [Id] FROM [Currencies] WHERE [Code] = N'SAR'),
    N'300000000000003', 1, 
    (SELECT TOP 1 [Id] FROM [Plans] WHERE [DisplayOrder] = 3));

DECLARE @AdminAccountId INT = SCOPE_IDENTITY();

-- Create Admin User (bcrypt hash for "admin123")
INSERT INTO [Users] 
([AccountId], [Username], [PasswordHash], [FullName], [Email], [Phone], [RoleId], [RoleType],
 [IsSuperAdmin], [IsActive], [CanCreateInvoices], [CanManageCustomers], [CanManageExpenses],
 [CanManageProducts], [CanManageSettings], [CanManageUsers], [CanViewReports], [EmailVerified],
 [PhoneVerified], [MaxMessageLength], [MaxNotificationLength], [FailedLoginAttempts], [PreferredLanguage])
VALUES
(@AdminAccountId, N'admin', 
    N'$2a$11$8JCccbQN4gqGEoMQdAWdq.u8Z3/qfIpgvgxEgGTjrJXzKFZUqQJLO',  -- admin123
    N'مسؤول النظام', N'admin@smartaccountant.local', N'+966123456789',
    (SELECT TOP 1 [Id] FROM [Roles] WHERE [Name] = N'مسؤول'),
    0,  -- RoleType = Owner
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1000, 500, 0, N'ar');

PRINT N'✓ تم إنشاء حساب الإدارة ومستخدم المسؤول';

-- =====================================================
-- 7. INSERT SYSTEM SETTINGS
-- =====================================================

PRINT N'[5/5] إضافة الإعدادات النظامية...';

INSERT INTO [SystemSettings] ([AccountId], [SettingKey], [SettingValue], [SettingType], [Description], [IsPublic])
VALUES
(NULL, N'AppTitle', N'مدقق الحسابات الذكي', N'string', N'اسم التطبيق', 1),
(NULL, N'AppVersion', N'1.0.5', N'string', N'رقم الإصدار', 1),
(NULL, N'DefaultCurrency', N'SAR', N'string', N'العملة الافتراضية', 1),
(NULL, N'DefaultLanguage', N'ar', N'string', N'اللغة الافتراضية', 1),
(NULL, N'InvoicePrefix', N'INV', N'string', N'بادئة الفاتورة', 0),
(NULL, N'TaxRate', N'0.15', N'decimal', N'نسبة الضريبة', 0);

PRINT N'✓ تمت إضافة الإعدادات';

PRINT N'';
PRINT N'═══════════════════════════════════════════════════════════';
PRINT N'✓ اكتملت إضافة جميع البيانات الأساسية بنجاح!';
PRINT N'═══════════════════════════════════════════════════════════';
PRINT N'';
PRINT N'بيانات الدخول:';
PRINT N'  المستخدم: admin';
PRINT N'  كلمة المرور: admin123';
PRINT N'';
PRINT N'═══════════════════════════════════════════════════════════';
