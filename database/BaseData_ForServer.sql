-- =============================================
-- SmartAccountant - البيانات الأساسية للنشر
-- =============================================
-- هذا الملف يحتوي على البيانات الأساسية للنظام
-- يجب تنفيذه بعد إنشاء الجداول (schema.sql أو SmartAccountant_BaseSetup.sql)
-- تاريخ الإنشاء: 2026-01-27
-- =============================================

USE SmartAccountant;
GO

PRINT N'جاري إدخال البيانات الأساسية...';
GO

-- =============================================
-- 1. العملات (Currencies)
-- =============================================
PRINT N'إدخال العملات...';

IF NOT EXISTS (SELECT 1 FROM Currencies WHERE Code = 'EGP')
BEGIN
    SET IDENTITY_INSERT Currencies ON;
    
    INSERT INTO Currencies (Id, Code, Name, NameEn, Symbol, Country, CountryCode, Flag, ExchangeRate, DecimalPlaces, SubUnit, IsDefault, IsActive)
    VALUES 
    (1, N'EGP', N'جنيه مصري', N'Egyptian Pound', N'ج.م', N'مصر', N'EG', N'🇪🇬', 1.000000, 2, N'قرش', 1, 1),
    (2, N'SAR', N'ريال سعودي', N'Saudi Riyal', N'ر.س', N'السعودية', N'SA', N'🇸🇦', 8.300000, 2, N'هللة', 0, 1),
    (3, N'AED', N'درهم إماراتي', N'UAE Dirham', N'د.إ', N'الإمارات', N'AE', N'🇦🇪', 8.450000, 2, N'فلس', 0, 1),
    (4, N'KWD', N'دينار كويتي', N'Kuwaiti Dinar', N'د.ك', N'الكويت', N'KW', N'🇰🇼', 101.500000, 3, N'فلس', 0, 1),
    (5, N'QAR', N'ريال قطري', N'Qatari Riyal', N'ر.ق', N'قطر', N'QA', N'🇶🇦', 8.530000, 2, N'درهم', 0, 1),
    (6, N'BHD', N'دينار بحريني', N'Bahraini Dinar', N'د.ب', N'البحرين', N'BH', N'🇧🇭', 82.400000, 3, N'فلس', 0, 1),
    (7, N'OMR', N'ريال عماني', N'Omani Rial', N'ر.ع', N'عمان', N'OM', N'🇴🇲', 80.700000, 3, N'بيسة', 0, 1),
    (8, N'JOD', N'دينار أردني', N'Jordanian Dinar', N'د.أ', N'الأردن', N'JO', N'🇯🇴', 43.850000, 3, N'قرش', 0, 1),
    (9, N'LBP', N'ليرة لبنانية', N'Lebanese Pound', N'ل.ل', N'لبنان', N'LB', N'🇱🇧', 0.000350, 0, N'قرش', 0, 1),
    (10, N'SYP', N'ليرة سورية', N'Syrian Pound', N'ل.س', N'سوريا', N'SY', N'🇸🇾', 0.002400, 0, N'قرش', 0, 1),
    (11, N'IQD', N'دينار عراقي', N'Iraqi Dinar', N'د.ع', N'العراق', N'IQ', N'🇮🇶', 0.023700, 0, N'فلس', 0, 1),
    (12, N'LYD', N'دينار ليبي', N'Libyan Dinar', N'د.ل', N'ليبيا', N'LY', N'🇱🇾', 6.430000, 3, N'درهم', 0, 1),
    (13, N'TND', N'دينار تونسي', N'Tunisian Dinar', N'د.ت', N'تونس', N'TN', N'🇹🇳', 9.950000, 3, N'مليم', 0, 1),
    (14, N'DZD', N'دينار جزائري', N'Algerian Dinar', N'د.ج', N'الجزائر', N'DZ', N'🇩🇿', 0.232000, 2, N'سنتيم', 0, 1),
    (15, N'MAD', N'درهم مغربي', N'Moroccan Dirham', N'د.م', N'المغرب', N'MA', N'🇲🇦', 3.080000, 2, N'سنتيم', 0, 1),
    (16, N'SDG', N'جنيه سوداني', N'Sudanese Pound', N'ج.س', N'السودان', N'SD', N'🇸🇩', 0.052000, 2, N'قرش', 0, 1),
    (17, N'YER', N'ريال يمني', N'Yemeni Rial', N'ر.ي', N'اليمن', N'YE', N'🇾🇪', 0.124000, 2, N'فلس', 0, 1),
    (18, N'USD', N'دولار أمريكي', N'US Dollar', N'$', N'أمريكا', N'US', N'🇺🇸', 50.500000, 2, N'سنت', 0, 1),
    (19, N'EUR', N'يورو', N'Euro', N'€', N'أوروبا', N'EU', N'🇪🇺', 53.500000, 2, N'سنت', 0, 1),
    (20, N'GBP', N'جنيه إسترليني', N'British Pound', N'£', N'بريطانيا', N'GB', N'🇬🇧', 64.200000, 2, N'بنس', 0, 1);
    
    SET IDENTITY_INSERT Currencies OFF;
    PRINT N'✓ تم إدخال العملات';
END
ELSE
    PRINT N'⚠ العملات موجودة مسبقاً';
GO

-- =============================================
-- 2. الصلاحيات (Permissions)
-- =============================================
PRINT N'إدخال الصلاحيات...';

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE Code = 'dashboard.view')
BEGIN
    SET IDENTITY_INSERT Permissions ON;
    
    INSERT INTO Permissions (Id, Code, Name, NameEn, Module, [Type], [Description], SortOrder)
    VALUES 
    -- لوحة التحكم
    (1, N'dashboard.view', N'عرض لوحة التحكم', N'View Dashboard', N'dashboard', 0, N'عرض لوحة التحكم الرئيسية', 1),
    
    -- المنتجات
    (2, N'products.view', N'عرض المنتجات', N'View Products', N'products', 0, N'عرض قائمة المنتجات', 10),
    (3, N'products.create', N'إضافة منتج', N'Create Product', N'products', 1, N'إضافة منتجات جديدة', 11),
    (4, N'products.edit', N'تعديل منتج', N'Edit Product', N'products', 2, N'تعديل بيانات المنتجات', 12),
    (5, N'products.delete', N'حذف منتج', N'Delete Product', N'products', 3, N'حذف المنتجات', 13),
    
    -- العملاء
    (6, N'customers.view', N'عرض العملاء', N'View Customers', N'customers', 0, N'عرض قائمة العملاء', 20),
    (7, N'customers.create', N'إضافة عميل', N'Create Customer', N'customers', 1, N'إضافة عملاء جدد', 21),
    (8, N'customers.edit', N'تعديل عميل', N'Edit Customer', N'customers', 2, N'تعديل بيانات العملاء', 22),
    (9, N'customers.delete', N'حذف عميل', N'Delete Customer', N'customers', 3, N'حذف العملاء', 23),
    
    -- الفواتير
    (10, N'invoices.view', N'عرض الفواتير', N'View Invoices', N'invoices', 0, N'عرض قائمة الفواتير', 30),
    (11, N'invoices.create', N'إنشاء فاتورة', N'Create Invoice', N'invoices', 1, N'إنشاء فواتير جديدة', 31),
    (12, N'invoices.edit', N'تعديل فاتورة', N'Edit Invoice', N'invoices', 2, N'تعديل الفواتير', 32),
    (13, N'invoices.delete', N'حذف فاتورة', N'Delete Invoice', N'invoices', 3, N'حذف الفواتير', 33),
    (14, N'invoices.print', N'طباعة فاتورة', N'Print Invoice', N'invoices', 6, N'طباعة الفواتير', 34),
    
    -- المصروفات
    (15, N'expenses.view', N'عرض المصروفات', N'View Expenses', N'expenses', 0, N'عرض قائمة المصروفات', 40),
    (16, N'expenses.create', N'إضافة مصروف', N'Create Expense', N'expenses', 1, N'إضافة مصروفات جديدة', 41),
    (17, N'expenses.edit', N'تعديل مصروف', N'Edit Expense', N'expenses', 2, N'تعديل المصروفات', 42),
    (18, N'expenses.delete', N'حذف مصروف', N'Delete Expense', N'expenses', 3, N'حذف المصروفات', 43),
    (19, N'expenses.approve', N'اعتماد مصروف', N'Approve Expense', N'expenses', 7, N'اعتماد المصروفات', 44),
    
    -- التقارير
    (20, N'reports.view', N'عرض التقارير', N'View Reports', N'reports', 0, N'عرض التقارير', 50),
    (21, N'reports.sales', N'تقرير المبيعات', N'Sales Report', N'reports', 0, N'عرض تقرير المبيعات', 51),
    (22, N'reports.purchases', N'تقرير المشتريات', N'Purchases Report', N'reports', 0, N'عرض تقرير المشتريات', 52),
    (23, N'reports.inventory', N'تقرير المخزون', N'Inventory Report', N'reports', 0, N'عرض تقرير المخزون', 53),
    (24, N'reports.financial', N'التقرير المالي', N'Financial Report', N'reports', 0, N'عرض التقرير المالي', 54),
    (25, N'reports.export', N'تصدير التقارير', N'Export Reports', N'reports', 4, N'تصدير التقارير', 55),
    
    -- الإعدادات
    (26, N'settings.view', N'عرض الإعدادات', N'View Settings', N'settings', 0, N'عرض الإعدادات', 60),
    (27, N'settings.edit', N'تعديل الإعدادات', N'Edit Settings', N'settings', 2, N'تعديل الإعدادات', 61),
    (28, N'settings.company', N'إعدادات الشركة', N'Company Settings', N'settings', 2, N'تعديل إعدادات الشركة', 62),
    
    -- المستخدمين
    (29, N'users.view', N'عرض المستخدمين', N'View Users', N'users', 0, N'عرض قائمة المستخدمين', 70),
    (30, N'users.create', N'إضافة مستخدم', N'Create User', N'users', 1, N'إضافة مستخدمين جدد', 71),
    (31, N'users.edit', N'تعديل مستخدم', N'Edit User', N'users', 2, N'تعديل بيانات المستخدمين', 72),
    (32, N'users.delete', N'حذف مستخدم', N'Delete User', N'users', 3, N'حذف المستخدمين', 73),
    
    -- الأدوار
    (33, N'roles.view', N'عرض الأدوار', N'View Roles', N'roles', 0, N'عرض قائمة الأدوار', 80),
    (34, N'roles.create', N'إضافة دور', N'Create Role', N'roles', 1, N'إضافة أدوار جديدة', 81),
    (35, N'roles.edit', N'تعديل دور', N'Edit Role', N'roles', 2, N'تعديل الأدوار', 82),
    (36, N'roles.delete', N'حذف دور', N'Delete Role', N'roles', 3, N'حذف الأدوار', 83),
    
    -- المخزون
    (37, N'inventory.view', N'عرض المخزون', N'View Inventory', N'inventory', 0, N'عرض المخزون', 90),
    (38, N'inventory.adjust', N'تسوية المخزون', N'Adjust Inventory', N'inventory', 2, N'تسوية كميات المخزون', 91),
    (39, N'inventory.transfer', N'تحويل مخزون', N'Transfer Inventory', N'inventory', 2, N'تحويل المخزون بين المواقع', 92),
    
    -- الموردين
    (40, N'suppliers.view', N'عرض الموردين', N'View Suppliers', N'suppliers', 0, N'عرض قائمة الموردين', 100),
    (41, N'suppliers.create', N'إضافة مورد', N'Create Supplier', N'suppliers', 1, N'إضافة موردين جدد', 101),
    (42, N'suppliers.edit', N'تعديل مورد', N'Edit Supplier', N'suppliers', 2, N'تعديل بيانات الموردين', 102),
    (43, N'suppliers.delete', N'حذف مورد', N'Delete Supplier', N'suppliers', 3, N'حذف الموردين', 103),
    
    -- العملات
    (44, N'currencies.view', N'عرض العملات', N'View Currencies', N'currencies', 0, N'عرض قائمة العملات', 110),
    (45, N'currencies.edit', N'تعديل العملات', N'Edit Currencies', N'currencies', 2, N'تعديل أسعار الصرف', 111),
    
    -- سجل النشاطات
    (46, N'activitylogs.view', N'عرض سجل النشاطات', N'View Activity Logs', N'activitylogs', 0, N'عرض سجل النشاطات', 120),
    
    -- النسخ الاحتياطي
    (47, N'backup.create', N'إنشاء نسخة احتياطية', N'Create Backup', N'backup', 1, N'إنشاء نسخة احتياطية', 130),
    (48, N'backup.restore', N'استعادة نسخة احتياطية', N'Restore Backup', N'backup', 2, N'استعادة من نسخة احتياطية', 131),
    
    -- الإشعارات
    (49, N'notifications.view', N'عرض الإشعارات', N'View Notifications', N'notifications', 0, N'عرض الإشعارات', 140),
    (50, N'notifications.send', N'إرسال إشعارات', N'Send Notifications', N'notifications', 1, N'إرسال إشعارات للمستخدمين', 141),
    
    -- الرسائل
    (51, N'messages.view', N'عرض الرسائل', N'View Messages', N'messages', 0, N'عرض الرسائل', 150),
    (52, N'messages.send', N'إرسال رسائل', N'Send Messages', N'messages', 1, N'إرسال رسائل للمستخدمين', 151);
    
    SET IDENTITY_INSERT Permissions OFF;
    PRINT N'✓ تم إدخال الصلاحيات';
END
ELSE
    PRINT N'⚠ الصلاحيات موجودة مسبقاً';
GO

-- =============================================
-- 3. عناصر القائمة (MenuItems)
-- =============================================
PRINT N'إدخال عناصر القائمة...';

IF NOT EXISTS (SELECT 1 FROM MenuItems WHERE Code = 'dashboard')
BEGIN
    SET IDENTITY_INSERT MenuItems ON;
    
    INSERT INTO MenuItems (Id, Code, Title, TitleEn, Icon, [Path], ParentId, SortOrder, RequiredPermission, ShowInSidebar, ShowInHeader, IsActive)
    VALUES 
    (1, N'dashboard', N'لوحة التحكم', N'Dashboard', N'home', N'/dashboard', NULL, 1, N'dashboard.view', 1, 0, 1),
    (2, N'products', N'المنتجات', N'Products', N'package', N'/products', NULL, 2, N'products.view', 1, 0, 1),
    (3, N'customers', N'العملاء', N'Customers', N'users', N'/customers', NULL, 3, N'customers.view', 1, 0, 1),
    (4, N'invoices', N'الفواتير', N'Invoices', N'file-text', N'/invoices', NULL, 4, N'invoices.view', 1, 0, 1),
    (5, N'expenses', N'المصروفات', N'Expenses', N'credit-card', N'/expenses', NULL, 5, N'expenses.view', 1, 0, 1),
    (6, N'reports', N'التقارير', N'Reports', N'bar-chart-2', N'/reports', NULL, 6, N'reports.view', 1, 0, 1),
    (7, N'settings', N'الإعدادات', N'Settings', N'settings', N'/settings', NULL, 7, N'settings.view', 1, 0, 1),
    (8, N'users', N'المستخدمين', N'Users', N'user-cog', N'/users', NULL, 8, N'users.view', 1, 0, 1),
    (9, N'roles', N'الأدوار', N'Roles', N'shield', N'/roles', NULL, 9, N'roles.view', 1, 0, 1),
    (10, N'notifications', N'الإشعارات', N'Notifications', N'bell', N'/notifications', NULL, 10, N'notifications.view', 1, 0, 1),
    (11, N'messages', N'الرسائل', N'Messages', N'mail', N'/messages', NULL, 11, N'messages.view', 1, 0, 1);
    
    SET IDENTITY_INSERT MenuItems OFF;
    PRINT N'✓ تم إدخال عناصر القائمة';
END
ELSE
    PRINT N'⚠ عناصر القائمة موجودة مسبقاً';
GO

-- =============================================
-- 4. الأدوار الأساسية (Roles)
-- =============================================
-- ملاحظة: الأدوار مرتبطة بالحساب، سيتم إنشاؤها لكل حساب جديد
PRINT N'';
PRINT N'ملاحظة: الأدوار تُنشأ تلقائياً مع كل حساب جديد';
GO

-- =============================================
-- 5. أنواع المعاملات (TransactionTypes)
-- =============================================
-- ملاحظة: أنواع المعاملات مرتبطة بالحساب، سيتم إنشاؤها لكل حساب جديد
PRINT N'';
PRINT N'ملاحظة: أنواع المعاملات تُنشأ تلقائياً مع كل حساب جديد';
GO

-- =============================================
-- 6. إعدادات النظام العامة (SystemSettings)
-- =============================================
PRINT N'إدخال إعدادات النظام العامة...';

IF NOT EXISTS (SELECT 1 FROM SystemSettings WHERE AccountId IS NULL AND SettingKey = 'showDemoLogin')
BEGIN
    INSERT INTO SystemSettings (AccountId, SettingKey, SettingValue, SettingType, [Description], IsPublic)
    VALUES 
    -- إعدادات شاشة الدخول (عامة لكل النظام)
    (NULL, N'showDemoLogin', N'true', N'bool', N'إظهار زر الدخول التجريبي في شاشة تسجيل الدخول', 1),
    (NULL, N'showAdminLogin', N'true', N'bool', N'إظهار زر دخول الأدمن في شاشة تسجيل الدخول', 1),
    -- إعدادات عامة أخرى
    (NULL, N'showMockDataGenerator', N'false', N'bool', N'إظهار أداة توليد البيانات التجريبية', 0),
    (NULL, N'allowUserRegistration', N'true', N'bool', N'السماح بتسجيل مستخدمين جدد', 1),
    -- إعدادات التحديث التلقائي
    (NULL, N'autoRefreshEnabled', N'true', N'bool', N'تفعيل التحديث التلقائي للوحة التحكم', 1),
    (NULL, N'autoRefreshInterval', N'60', N'int', N'فترة التحديث التلقائي بالثواني', 1),
    -- إعدادات الإشعارات
    (NULL, N'maxNotificationLength', N'500', N'int', N'الحد الأقصى لطول الإشعار', 0),
    (NULL, N'maxMessageLength', N'1000', N'int', N'الحد الأقصى لطول الرسالة', 0);
    
    PRINT N'✓ تم إدخال إعدادات النظام العامة';
END
ELSE
    PRINT N'⚠ إعدادات النظام موجودة مسبقاً';
GO

-- =============================================
-- 7. الخطط (Plans) - اختياري
-- =============================================
PRINT N'إدخال الخطط...';

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Plans')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Plans WHERE Code = 'FREE')
    BEGIN
        SET IDENTITY_INSERT Plans ON;
        
        INSERT INTO Plans (Id, Code, Name, NameEn, [Description], DescriptionEn, MonthlyPrice, YearlyPrice, 
            MaxUsers, MaxProducts, MaxCustomers, MaxInvoicesPerMonth, MaxStorageMB,
            Features, IsActive, SortOrder, Color, Icon)
        VALUES 
        (1, N'FREE', N'مجاني', N'Free', N'خطة مجانية للتجربة', N'Free trial plan', 0, 0, 
            1, 50, 50, 100, 100,
            N'["لوحة تحكم أساسية","فواتير محدودة","تقارير بسيطة"]', 1, 1, N'#6B7280', N'gift'),
        (2, N'BASIC', N'أساسي', N'Basic', N'خطة أساسية للمشاريع الصغيرة', N'Basic plan for small businesses', 99, 999, 
            3, 500, 500, 500, 500,
            N'["كل مميزات المجاني","مستخدمين إضافيين","تقارير متقدمة","دعم بالبريد"]', 1, 2, N'#3B82F6', N'star'),
        (3, N'PRO', N'احترافي', N'Professional', N'خطة احترافية للشركات', N'Professional plan for companies', 299, 2999, 
            10, 5000, 5000, 5000, 2000,
            N'["كل مميزات الأساسي","مستخدمين غير محدودين","API كامل","دعم أولوية"]', 1, 3, N'#8B5CF6', N'crown'),
        (4, N'ENTERPRISE', N'مؤسسي', N'Enterprise', N'خطة مؤسسية مخصصة', N'Custom enterprise plan', 0, 0, 
            -1, -1, -1, -1, -1,
            N'["كل المميزات","تخصيص كامل","خادم مخصص","دعم 24/7"]', 1, 4, N'#DC2626', N'building');
        
        SET IDENTITY_INSERT Plans OFF;
        PRINT N'✓ تم إدخال الخطط';
    END
    ELSE
        PRINT N'⚠ الخطط موجودة مسبقاً';
END
ELSE
    PRINT N'⚠ جدول الخطط غير موجود';
GO

-- =============================================
-- ملخص البيانات الأساسية
-- =============================================
PRINT N'';
PRINT N'=============================================';
PRINT N'ملخص البيانات الأساسية:';
PRINT N'=============================================';
SELECT 'العملات' AS [الجدول], COUNT(*) AS [العدد] FROM Currencies
UNION ALL
SELECT 'الصلاحيات', COUNT(*) FROM Permissions
UNION ALL
SELECT 'عناصر القائمة', COUNT(*) FROM MenuItems
UNION ALL
SELECT 'إعدادات النظام', COUNT(*) FROM SystemSettings WHERE AccountId IS NULL;
GO

PRINT N'';
PRINT N'=============================================';
PRINT N'تم إدخال البيانات الأساسية بنجاح! ✓';
PRINT N'=============================================';
GO

-- =============================================
-- قالب إنشاء حساب جديد
-- =============================================
/*
لإنشاء حساب جديد مع البيانات الأساسية، استخدم السكربت التالي:

DECLARE @AccountName NVARCHAR(100) = N'اسم الشركة';
DECLARE @AccountEmail NVARCHAR(100) = N'email@company.com';
DECLARE @AdminUsername NVARCHAR(50) = N'admin';
DECLARE @AdminPassword NVARCHAR(100) = N'$2a$11$...'; -- كلمة مرور مشفرة

-- راجع ملف CreateNewAccount_Template.sql للتفاصيل الكاملة
*/
