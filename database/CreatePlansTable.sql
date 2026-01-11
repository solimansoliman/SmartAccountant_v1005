-- إنشاء جدول الخطط Plans
-- Smart Accountant - Plans Table

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Plans')
BEGIN
    CREATE TABLE Plans (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,           -- اسم الخطة بالعربي
        NameEn NVARCHAR(100),                  -- اسم الخطة بالإنجليزي
        Description NVARCHAR(500),              -- وصف الخطة
        Price DECIMAL(18,2) NOT NULL DEFAULT 0, -- السعر الشهري
        YearlyPrice DECIMAL(18,2),              -- السعر السنوي (اختياري)
        Currency NVARCHAR(10) DEFAULT N'ج.م',   -- العملة
        Color NVARCHAR(50) DEFAULT 'blue',      -- لون الخطة للعرض
        Icon NVARCHAR(50) DEFAULT 'Zap',        -- اسم الأيقونة
        IsPopular BIT DEFAULT 0,                -- هل هي الأكثر شعبية
        SortOrder INT DEFAULT 0,                -- ترتيب العرض
        IsActive BIT DEFAULT 1,                 -- هل الخطة نشطة
        
        -- الحدود
        MaxUsers INT DEFAULT 1,                 -- الحد الأقصى للمستخدمين (-1 = غير محدود)
        MaxInvoices INT DEFAULT 50,             -- الحد الأقصى للفواتير شهرياً (-1 = غير محدود)
        MaxCustomers INT DEFAULT 25,            -- الحد الأقصى للعملاء (-1 = غير محدود)
        MaxProducts INT DEFAULT 50,             -- الحد الأقصى للمنتجات (-1 = غير محدود)
        
        -- الميزات (1 = متاح، 0 = غير متاح)
        HasBasicReports BIT DEFAULT 1,          -- التقارير الأساسية
        HasAdvancedReports BIT DEFAULT 0,       -- التقارير المتقدمة
        HasEmailSupport BIT DEFAULT 1,          -- الدعم عبر البريد
        HasPrioritySupport BIT DEFAULT 0,       -- الدعم ذو الأولوية
        HasDedicatedManager BIT DEFAULT 0,      -- مدير حساب مخصص
        HasBackup BIT DEFAULT 0,                -- النسخ الاحتياطي
        BackupFrequency NVARCHAR(50),           -- تردد النسخ الاحتياطي (daily, weekly, instant)
        HasCustomInvoices BIT DEFAULT 0,        -- تخصيص الفواتير
        HasMultiCurrency BIT DEFAULT 0,         -- العملات المتعددة
        HasApiAccess BIT DEFAULT 0,             -- الوصول لـ API
        HasWhiteLabel BIT DEFAULT 0,            -- إزالة العلامة التجارية
        
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
    );
    
    PRINT 'Table Plans created successfully';
END
GO

-- إدخال الخطط الافتراضية
IF NOT EXISTS (SELECT * FROM Plans WHERE Id = 1)
BEGIN
    SET IDENTITY_INSERT Plans ON;
    
    -- الخطة المجانية
    INSERT INTO Plans (Id, Name, NameEn, Description, Price, YearlyPrice, Currency, Color, Icon, IsPopular, SortOrder,
        MaxUsers, MaxInvoices, MaxCustomers, MaxProducts,
        HasBasicReports, HasAdvancedReports, HasEmailSupport, HasPrioritySupport, HasDedicatedManager,
        HasBackup, BackupFrequency, HasCustomInvoices, HasMultiCurrency, HasApiAccess, HasWhiteLabel)
    VALUES (1, N'مجاني', 'Free', N'للتجربة والمشاريع الصغيرة', 0, 0, N'ج.م', 'slate', 'Star', 0, 1,
        1, 50, 25, 50,
        1, 0, 1, 0, 0,
        0, NULL, 0, 0, 0, 0);
    
    -- الخطة الأساسية
    INSERT INTO Plans (Id, Name, NameEn, Description, Price, YearlyPrice, Currency, Color, Icon, IsPopular, SortOrder,
        MaxUsers, MaxInvoices, MaxCustomers, MaxProducts,
        HasBasicReports, HasAdvancedReports, HasEmailSupport, HasPrioritySupport, HasDedicatedManager,
        HasBackup, BackupFrequency, HasCustomInvoices, HasMultiCurrency, HasApiAccess, HasWhiteLabel)
    VALUES (2, N'أساسي', 'Basic', N'للأعمال الصغيرة والمتوسطة', 99, 990, N'ج.م', 'blue', 'Zap', 0, 2,
        3, 500, 200, 500,
        1, 0, 1, 0, 0,
        1, N'weekly', 1, 0, 0, 0);
    
    -- الخطة المتقدمة (الأكثر شعبية)
    INSERT INTO Plans (Id, Name, NameEn, Description, Price, YearlyPrice, Currency, Color, Icon, IsPopular, SortOrder,
        MaxUsers, MaxInvoices, MaxCustomers, MaxProducts,
        HasBasicReports, HasAdvancedReports, HasEmailSupport, HasPrioritySupport, HasDedicatedManager,
        HasBackup, BackupFrequency, HasCustomInvoices, HasMultiCurrency, HasApiAccess, HasWhiteLabel)
    VALUES (3, N'متقدم', 'Pro', N'للشركات النامية', 249, 2490, N'ج.م', 'violet', 'Rocket', 1, 3,
        10, -1, -1, -1,
        1, 1, 1, 1, 0,
        1, N'daily', 1, 1, 0, 0);
    
    -- خطة المؤسسات
    INSERT INTO Plans (Id, Name, NameEn, Description, Price, YearlyPrice, Currency, Color, Icon, IsPopular, SortOrder,
        MaxUsers, MaxInvoices, MaxCustomers, MaxProducts,
        HasBasicReports, HasAdvancedReports, HasEmailSupport, HasPrioritySupport, HasDedicatedManager,
        HasBackup, BackupFrequency, HasCustomInvoices, HasMultiCurrency, HasApiAccess, HasWhiteLabel)
    VALUES (4, N'مؤسسات', 'Enterprise', N'للمؤسسات الكبيرة', 599, 5990, N'ج.م', 'amber', 'Crown', 0, 4,
        -1, -1, -1, -1,
        1, 1, 1, 1, 1,
        1, N'instant', 1, 1, 1, 1);
    
    SET IDENTITY_INSERT Plans OFF;
    
    PRINT 'Default plans inserted successfully';
END
GO

-- إضافة صلاحيات الخطط إلى جدول الصلاحيات
IF NOT EXISTS (SELECT * FROM Permissions WHERE Module = 'plans')
BEGIN
    INSERT INTO Permissions (Code, Name, NameEn, Module, [Type], [Description], SortOrder)
    VALUES 
    (N'plans.view', N'عرض الخطط', N'View Plans', N'plans', 0, N'عرض قائمة الخطط', 140),
    (N'plans.create', N'إضافة خطة', N'Create Plan', N'plans', 1, N'إضافة خطط جديدة', 141),
    (N'plans.edit', N'تعديل خطة', N'Edit Plan', N'plans', 2, N'تعديل الخطط', 142),
    (N'plans.delete', N'حذف خطة', N'Delete Plan', N'plans', 3, N'حذف الخطط', 143);
    
    PRINT 'Plans permissions added successfully';
END
GO
