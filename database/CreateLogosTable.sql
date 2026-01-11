-- إنشاء جدول الشعارات
-- Logos Table - يدعم تخزين الشعارات بطريقتين: URL أو قاعدة البيانات

USE SmartAccountant_v1005_DB;
GO

-- جدول الشعارات الرئيسي
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Logos' AND xtype='U')
BEGIN
    CREATE TABLE Logos (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AccountId INT NOT NULL,
        
        -- معلومات الشعار الأساسية
        Name NVARCHAR(100) NULL,                    -- اسم الشعار (رئيسي، ثانوي، إلخ)
        LogoType NVARCHAR(20) DEFAULT 'Primary',    -- نوع الشعار: Primary, Secondary, Favicon, Watermark
        
        -- نوع التخزين
        StorageType NVARCHAR(20) DEFAULT 'Url',     -- نوع التخزين: Url, Database, Both
        
        -- تخزين عبر الرابط
        ImageUrl NVARCHAR(500) NULL,                -- رابط الصورة على السيرفر
        
        -- تخزين في قاعدة البيانات
        ImageData NVARCHAR(MAX) NULL,               -- الصورة بصيغة Base64
        ImageBinary VARBINARY(MAX) NULL,            -- الصورة بصيغة Binary
        
        -- معلومات الملف
        MimeType NVARCHAR(50) NULL,                 -- نوع الملف: image/jpeg, image/png, etc
        FileSize BIGINT DEFAULT 0,                  -- حجم الملف بالبايت
        Width INT DEFAULT 0,                        -- عرض الصورة
        Height INT DEFAULT 0,                       -- ارتفاع الصورة
        
        -- الحالة والعرض
        IsActive BIT DEFAULT 1,                     -- هل الشعار نشط
        ShowLogo BIT DEFAULT 1,                     -- هل يظهر الشعار (للتحكم بالإظهار/الإخفاء)
        DisplayOrder INT DEFAULT 0,                 -- ترتيب العرض
        
        -- معلومات إضافية
        AltText NVARCHAR(200) NULL,                 -- نص بديل للصورة
        Notes NVARCHAR(500) NULL,                   -- ملاحظات
        
        -- التتبع
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CreatedByUserId INT NULL,
        UpdatedByUserId INT NULL,
        
        -- العلاقات
        CONSTRAINT FK_Logos_Account FOREIGN KEY (AccountId) 
            REFERENCES Accounts(Id) ON DELETE CASCADE,
        CONSTRAINT FK_Logos_CreatedBy FOREIGN KEY (CreatedByUserId) 
            REFERENCES Users(Id) ON DELETE NO ACTION,
        CONSTRAINT FK_Logos_UpdatedBy FOREIGN KEY (UpdatedByUserId) 
            REFERENCES Users(Id) ON DELETE NO ACTION
    );

    -- الفهارس
    CREATE INDEX IX_Logos_AccountId ON Logos(AccountId);
    CREATE INDEX IX_Logos_AccountId_LogoType ON Logos(AccountId, LogoType);
    
    PRINT 'تم إنشاء جدول Logos بنجاح';
END
ELSE
BEGIN
    PRINT 'جدول Logos موجود مسبقاً';
END
GO

-- جدول إعدادات الشعار للحساب
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AccountLogoSettings' AND xtype='U')
BEGIN
    CREATE TABLE AccountLogoSettings (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AccountId INT NOT NULL UNIQUE,
        
        -- إعدادات التخزين المفضلة
        PreferredStorageType NVARCHAR(20) DEFAULT 'Url',   -- نوع التخزين المفضل للحساب
        
        -- التحكم بالعرض
        EnableLogoDisplay BIT DEFAULT 1,                    -- تفعيل/تعطيل عرض الشعارات للحساب
        
        -- قيود الرفع
        MaxFileSizeKb INT DEFAULT 2048,                     -- الحد الأقصى لحجم الملف بالكيلوبايت
        AllowedMimeTypes NVARCHAR(500) DEFAULT 'image/jpeg,image/png,image/gif,image/webp',
        
        -- الشعارات النشطة
        ActivePrimaryLogoId INT NULL,                       -- الشعار الرئيسي النشط
        ActiveFaviconId INT NULL,                           -- أيقونة الموقع النشطة
        
        -- التتبع
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        
        -- العلاقات
        CONSTRAINT FK_AccountLogoSettings_Account FOREIGN KEY (AccountId) 
            REFERENCES Accounts(Id) ON DELETE CASCADE,
        CONSTRAINT FK_AccountLogoSettings_PrimaryLogo FOREIGN KEY (ActivePrimaryLogoId) 
            REFERENCES Logos(Id) ON DELETE NO ACTION,
        CONSTRAINT FK_AccountLogoSettings_Favicon FOREIGN KEY (ActiveFaviconId) 
            REFERENCES Logos(Id) ON DELETE NO ACTION
    );

    -- الفهرس
    CREATE UNIQUE INDEX IX_AccountLogoSettings_AccountId ON AccountLogoSettings(AccountId);
    
    PRINT 'تم إنشاء جدول AccountLogoSettings بنجاح';
END
ELSE
BEGIN
    PRINT 'جدول AccountLogoSettings موجود مسبقاً';
END
GO

-- ============= إدخال بيانات تجريبية =============

-- إنشاء إعدادات افتراضية للحسابات الموجودة
INSERT INTO AccountLogoSettings (AccountId, PreferredStorageType, EnableLogoDisplay, MaxFileSizeKb)
SELECT Id, 'Url', 1, 2048
FROM Accounts a
WHERE NOT EXISTS (SELECT 1 FROM AccountLogoSettings als WHERE als.AccountId = a.Id);

PRINT 'تم إنشاء إعدادات الشعار للحسابات الموجودة';
GO

-- ============= استعلامات مساعدة =============

-- عرض جميع الشعارات مع معلومات الحساب
-- SELECT l.*, a.Name AS AccountName
-- FROM Logos l
-- JOIN Accounts a ON l.AccountId = a.Id
-- ORDER BY l.AccountId, l.DisplayOrder;

-- عرض إعدادات الشعارات لجميع الحسابات
-- SELECT als.*, a.Name AS AccountName
-- FROM AccountLogoSettings als
-- JOIN Accounts a ON als.AccountId = a.Id;

-- الحصول على الشعار النشط لحساب معين
-- SELECT * FROM Logos 
-- WHERE AccountId = 1 AND LogoType = 'Primary' AND IsActive = 1 AND ShowLogo = 1
-- ORDER BY DisplayOrder;

PRINT 'تم تنفيذ سكريبت إنشاء جداول الشعارات بنجاح';
GO
