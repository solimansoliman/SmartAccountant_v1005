-- =====================================================
-- ملف: ROLES_LOOKUP_BACKFILL.sql
-- الوصف: Backfill لإضافة أدوار Lookup افتراضية للحسابات الحالية
-- الاستخدام:
--   1) افتح قاعدة SmartAccountant_v1005_DB
--   2) نفّذ السكربت كاملاً
-- =====================================================

SET NOCOUNT ON;

PRINT N'بدء Backfill الأدوار الافتراضية...';

-- إذا كان جدول Roles يدعم AccountId (النظام الحالي)
IF COL_LENGTH('Roles', 'AccountId') IS NOT NULL
BEGIN
    DECLARE @DefaultRoles TABLE
    (
        [Name] NVARCHAR(100),
        [NameEn] NVARCHAR(100),
        [Description] NVARCHAR(500),
        [Color] NVARCHAR(20),
        [Icon] NVARCHAR(50)
    );

    INSERT INTO @DefaultRoles ([Name], [NameEn], [Description], [Color], [Icon])
    VALUES
    (N'مسؤول', N'Administrator', N'إدارة كاملة للحساب', N'#dc2626', N'shield'),
    (N'مدير', N'Manager', N'إدارة العمليات اليومية', N'#2563eb', N'briefcase'),
    (N'محاسب', N'Accountant', N'إدارة القيود والفواتير والتقارير', N'#16a34a', N'calculator'),
    (N'أمين مخزون', N'Inventory Keeper', N'إدارة المخزون والمنتجات', N'#ca8a04', N'boxes'),
    (N'موظف مبيعات', N'Sales', N'إنشاء الفواتير وخدمة العملاء', N'#9333ea', N'shopping-cart'),
    (N'موظف', N'Staff', N'صلاحيات تشغيل عامة', N'#0f766e', N'user'),
    (N'عارض', N'Viewer', N'عرض فقط', N'#475569', N'eye');

    INSERT INTO [Roles] ([AccountId], [Name], [NameEn], [Description], [IsSystemRole], [Color], [Icon], [IsActive], [CreatedAt])
    SELECT
        a.[Id],
        r.[Name],
        r.[NameEn],
        r.[Description],
        1,
        r.[Color],
        r.[Icon],
        1,
        GETUTCDATE()
    FROM [Accounts] a
    CROSS JOIN @DefaultRoles r
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM [Roles] x
        WHERE x.[AccountId] = a.[Id] AND x.[Name] = r.[Name]
    );

    PRINT N'تمت إضافة الأدوار الافتراضية لكل الحسابات (إن لم تكن موجودة).';

    -- ربط المستخدمين الأدمن بدور مسؤول (UserRoles) إذا كان الجدول متاحاً
    IF OBJECT_ID('UserRoles', 'U') IS NOT NULL
    BEGIN
        INSERT INTO [UserRoles] ([UserId], [RoleId], [AssignedAt], [AssignedByUserId])
        SELECT
            u.[Id],
            ar.[Id],
            GETUTCDATE(),
            u.[Id]
        FROM [Users] u
        INNER JOIN [Roles] ar ON ar.[AccountId] = u.[AccountId] AND ar.[Name] = N'مسؤول'
        LEFT JOIN [UserRoles] ur ON ur.[UserId] = u.[Id] AND ur.[RoleId] = ar.[Id]
        WHERE ur.[UserId] IS NULL
          AND (u.[IsSuperAdmin] = 1 OR u.[RoleType] = 0);

        PRINT N'تمت مزامنة دور مسؤول مع الأدمن في UserRoles.';
    END

    -- تحديث RoleId المباشر في Users لو موجود
    IF COL_LENGTH('Users', 'RoleId') IS NOT NULL
    BEGIN
        UPDATE u
        SET u.[RoleId] = ar.[Id]
        FROM [Users] u
        INNER JOIN [Roles] ar ON ar.[AccountId] = u.[AccountId] AND ar.[Name] = N'مسؤول'
        WHERE (u.[IsSuperAdmin] = 1 OR u.[RoleType] = 0)
          AND (u.[RoleId] IS NULL OR u.[RoleId] <> ar.[Id]);

        PRINT N'تم تحديث Users.RoleId للأدمن إلى دور مسؤول.';
    END
END
ELSE
BEGIN
    -- مسار جداول قديمة (Roles بدون AccountId)
    IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [Name] = N'مسؤول')
        INSERT INTO [Roles] ([Name], [Description], [IsSystemRole], [IsActive], [RoleType]) VALUES (N'مسؤول', N'دور مسؤول بصلاحيات كاملة', 1, 1, N'Admin');

    IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [Name] = N'مدير')
        INSERT INTO [Roles] ([Name], [Description], [IsSystemRole], [IsActive], [RoleType]) VALUES (N'مدير', N'دور مدير العمليات', 1, 1, N'Manager');

    IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [Name] = N'محاسب')
        INSERT INTO [Roles] ([Name], [Description], [IsSystemRole], [IsActive], [RoleType]) VALUES (N'محاسب', N'إدارة العمليات المالية اليومية', 1, 1, N'Accountant');

    IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [Name] = N'أمين مخزون')
        INSERT INTO [Roles] ([Name], [Description], [IsSystemRole], [IsActive], [RoleType]) VALUES (N'أمين مخزون', N'إدارة المخزون وحركة المنتجات', 1, 1, N'Inventory');

    IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [Name] = N'موظف مبيعات')
        INSERT INTO [Roles] ([Name], [Description], [IsSystemRole], [IsActive], [RoleType]) VALUES (N'موظف مبيعات', N'إدخال الفواتير ومتابعة العملاء', 1, 1, N'Sales');

    IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [Name] = N'موظف')
        INSERT INTO [Roles] ([Name], [Description], [IsSystemRole], [IsActive], [RoleType]) VALUES (N'موظف', N'دور موظف', 1, 1, N'Staff');

    IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [Name] = N'عارض')
        INSERT INTO [Roles] ([Name], [Description], [IsSystemRole], [IsActive], [RoleType]) VALUES (N'عارض', N'عارض فقط', 1, 1, N'Viewer');

    PRINT N'تمت إضافة الأدوار الافتراضية (وضع الجداول القديمة).';
END

PRINT N'اكتمل Backfill الأدوار الافتراضية بنجاح.';
GO
