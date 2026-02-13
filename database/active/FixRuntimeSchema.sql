-- Runtime schema sync for SmartAccountant v1005
-- Fixes 500 errors for /api/plans, /api/notifications, /api/messages/*

SET NOCOUNT ON;

/* =====================================================
   1) Plans table: add missing columns expected by Plan.cs
   ===================================================== */
IF OBJECT_ID('dbo.Plans', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Plans', 'NameEn') IS NULL ALTER TABLE dbo.Plans ADD NameEn NVARCHAR(100) NULL;
    IF COL_LENGTH('dbo.Plans', 'YearlyPrice') IS NULL ALTER TABLE dbo.Plans ADD YearlyPrice DECIMAL(18,2) NULL;
    IF COL_LENGTH('dbo.Plans', 'Currency') IS NULL ALTER TABLE dbo.Plans ADD Currency NVARCHAR(10) NOT NULL CONSTRAINT DF_Plans_Currency DEFAULT N'ج.م';
    IF COL_LENGTH('dbo.Plans', 'Color') IS NULL ALTER TABLE dbo.Plans ADD Color NVARCHAR(50) NOT NULL CONSTRAINT DF_Plans_Color DEFAULT N'blue';
    IF COL_LENGTH('dbo.Plans', 'Icon') IS NULL ALTER TABLE dbo.Plans ADD Icon NVARCHAR(50) NOT NULL CONSTRAINT DF_Plans_Icon DEFAULT N'Zap';
    IF COL_LENGTH('dbo.Plans', 'IsPopular') IS NULL ALTER TABLE dbo.Plans ADD IsPopular BIT NOT NULL CONSTRAINT DF_Plans_IsPopular DEFAULT 0;
    IF COL_LENGTH('dbo.Plans', 'SortOrder') IS NULL ALTER TABLE dbo.Plans ADD SortOrder INT NOT NULL CONSTRAINT DF_Plans_SortOrder DEFAULT 0;
    IF COL_LENGTH('dbo.Plans', 'MaxProducts') IS NULL ALTER TABLE dbo.Plans ADD MaxProducts INT NOT NULL CONSTRAINT DF_Plans_MaxProducts DEFAULT 50;
    IF COL_LENGTH('dbo.Plans', 'HasBasicReports') IS NULL ALTER TABLE dbo.Plans ADD HasBasicReports BIT NOT NULL CONSTRAINT DF_Plans_HasBasicReports DEFAULT 1;
    IF COL_LENGTH('dbo.Plans', 'HasAdvancedReports') IS NULL ALTER TABLE dbo.Plans ADD HasAdvancedReports BIT NOT NULL CONSTRAINT DF_Plans_HasAdvancedReports DEFAULT 0;
    IF COL_LENGTH('dbo.Plans', 'HasEmailSupport') IS NULL ALTER TABLE dbo.Plans ADD HasEmailSupport BIT NOT NULL CONSTRAINT DF_Plans_HasEmailSupport DEFAULT 1;
    IF COL_LENGTH('dbo.Plans', 'HasPrioritySupport') IS NULL ALTER TABLE dbo.Plans ADD HasPrioritySupport BIT NOT NULL CONSTRAINT DF_Plans_HasPrioritySupport DEFAULT 0;
    IF COL_LENGTH('dbo.Plans', 'HasDedicatedManager') IS NULL ALTER TABLE dbo.Plans ADD HasDedicatedManager BIT NOT NULL CONSTRAINT DF_Plans_HasDedicatedManager DEFAULT 0;
    IF COL_LENGTH('dbo.Plans', 'HasBackup') IS NULL ALTER TABLE dbo.Plans ADD HasBackup BIT NOT NULL CONSTRAINT DF_Plans_HasBackup DEFAULT 0;
    IF COL_LENGTH('dbo.Plans', 'BackupFrequency') IS NULL ALTER TABLE dbo.Plans ADD BackupFrequency NVARCHAR(50) NULL;
    IF COL_LENGTH('dbo.Plans', 'HasCustomInvoices') IS NULL ALTER TABLE dbo.Plans ADD HasCustomInvoices BIT NOT NULL CONSTRAINT DF_Plans_HasCustomInvoices DEFAULT 0;
    IF COL_LENGTH('dbo.Plans', 'HasMultiCurrency') IS NULL ALTER TABLE dbo.Plans ADD HasMultiCurrency BIT NOT NULL CONSTRAINT DF_Plans_HasMultiCurrency DEFAULT 0;
    IF COL_LENGTH('dbo.Plans', 'HasApiAccess') IS NULL ALTER TABLE dbo.Plans ADD HasApiAccess BIT NOT NULL CONSTRAINT DF_Plans_HasApiAccess DEFAULT 0;
    IF COL_LENGTH('dbo.Plans', 'HasOfflineMode') IS NULL ALTER TABLE dbo.Plans ADD HasOfflineMode BIT NOT NULL CONSTRAINT DF_Plans_HasOfflineMode DEFAULT 0;
    IF COL_LENGTH('dbo.Plans', 'HasWhiteLabel') IS NULL ALTER TABLE dbo.Plans ADD HasWhiteLabel BIT NOT NULL CONSTRAINT DF_Plans_HasWhiteLabel DEFAULT 0;
END

/* =====================================================
   2) Notifications table
   ===================================================== */
IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        AccountId INT NOT NULL,
        UserId INT NOT NULL,
        Title NVARCHAR(200) NOT NULL,
        Body NVARCHAR(1000) NOT NULL,
        BodyEn NVARCHAR(1000) NULL,
        TitleEn NVARCHAR(200) NULL,
        Type INT NOT NULL CONSTRAINT DF_Notifications_Type DEFAULT 1,
        Priority INT NOT NULL CONSTRAINT DF_Notifications_Priority DEFAULT 1,
        ActionUrl NVARCHAR(500) NULL,
        ActionText NVARCHAR(200) NULL,
        EntityType NVARCHAR(100) NULL,
        EntityId INT NULL,
        Icon NVARCHAR(100) NULL,
        IsRead BIT NOT NULL CONSTRAINT DF_Notifications_IsRead DEFAULT 0,
        ReadAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT GETUTCDATE(),
        ExpiresAt DATETIME2 NULL,
        IsDismissed BIT NOT NULL CONSTRAINT DF_Notifications_IsDismissed DEFAULT 0,
        DismissedAt DATETIME2 NULL,
        Notes NVARCHAR(500) NULL
    );

    CREATE INDEX IX_Notifications_AccountId_UserId_IsRead ON dbo.Notifications(AccountId, UserId, IsRead);
    CREATE INDEX IX_Notifications_CreatedAt ON dbo.Notifications(CreatedAt);

    ALTER TABLE dbo.Notifications WITH CHECK ADD CONSTRAINT FK_Notifications_Accounts
        FOREIGN KEY (AccountId) REFERENCES dbo.Accounts(Id);
    ALTER TABLE dbo.Notifications WITH CHECK ADD CONSTRAINT FK_Notifications_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(Id);
END

/* =====================================================
   3) Messages table
   ===================================================== */
IF OBJECT_ID('dbo.Messages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Messages
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        AccountId INT NOT NULL,
        SenderId INT NOT NULL,
        ReceiverId INT NULL,
        Subject NVARCHAR(200) NULL,
        Content NVARCHAR(4000) NOT NULL,
        Type INT NOT NULL CONSTRAINT DF_Messages_Type DEFAULT 1,
        Priority INT NOT NULL CONSTRAINT DF_Messages_Priority DEFAULT 2,
        IsRead BIT NOT NULL CONSTRAINT DF_Messages_IsRead DEFAULT 0,
        ReadAt DATETIME2 NULL,
        ParentMessageId INT NULL,
        AttachmentUrl NVARCHAR(500) NULL,
        IsDeletedBySender BIT NOT NULL CONSTRAINT DF_Messages_IsDeletedBySender DEFAULT 0,
        IsDeletedByReceiver BIT NOT NULL CONSTRAINT DF_Messages_IsDeletedByReceiver DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Messages_CreatedAt DEFAULT GETUTCDATE()
    );

    CREATE INDEX IX_Messages_AccountId_ReceiverId_IsRead ON dbo.Messages(AccountId, ReceiverId, IsRead);
    CREATE INDEX IX_Messages_CreatedAt ON dbo.Messages(CreatedAt);

    ALTER TABLE dbo.Messages WITH CHECK ADD CONSTRAINT FK_Messages_Accounts
        FOREIGN KEY (AccountId) REFERENCES dbo.Accounts(Id);
    ALTER TABLE dbo.Messages WITH CHECK ADD CONSTRAINT FK_Messages_Sender
        FOREIGN KEY (SenderId) REFERENCES dbo.Users(Id);
    ALTER TABLE dbo.Messages WITH CHECK ADD CONSTRAINT FK_Messages_Receiver
        FOREIGN KEY (ReceiverId) REFERENCES dbo.Users(Id);
    ALTER TABLE dbo.Messages WITH CHECK ADD CONSTRAINT FK_Messages_Parent
        FOREIGN KEY (ParentMessageId) REFERENCES dbo.Messages(Id);
END

/* =====================================================
   4) Units table
   ===================================================== */
IF OBJECT_ID('dbo.Units', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Units
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        AccountId INT NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        NameEn NVARCHAR(100) NULL,
        Symbol NVARCHAR(100) NOT NULL,
        IsBase BIT NOT NULL CONSTRAINT DF_Units_IsBase DEFAULT 1,
        BaseUnitId INT NULL,
        ConversionFactor DECIMAL(18,6) NOT NULL CONSTRAINT DF_Units_ConversionFactor DEFAULT 1,
        IsActive BIT NOT NULL CONSTRAINT DF_Units_IsActive DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Units_CreatedAt DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CreatedByUserId INT NULL
    );

    CREATE INDEX IX_Units_AccountId_Name ON dbo.Units(AccountId, Name);

    ALTER TABLE dbo.Units WITH CHECK ADD CONSTRAINT FK_Units_Accounts
        FOREIGN KEY (AccountId) REFERENCES dbo.Accounts(Id);

    ALTER TABLE dbo.Units WITH CHECK ADD CONSTRAINT FK_Units_Users
        FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id);

    ALTER TABLE dbo.Units WITH CHECK ADD CONSTRAINT FK_Units_BaseUnit
        FOREIGN KEY (BaseUnitId) REFERENCES dbo.Units(Id);
END

/* =====================================================
   5) ProductCategories table
   ===================================================== */
IF OBJECT_ID('dbo.ProductCategories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductCategories
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        AccountId INT NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        NameEn NVARCHAR(100) NULL,
        ParentCategoryId INT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_ProductCategories_IsActive DEFAULT 1
    );

    CREATE INDEX IX_ProductCategories_AccountId_Name ON dbo.ProductCategories(AccountId, Name);

    ALTER TABLE dbo.ProductCategories WITH CHECK ADD CONSTRAINT FK_ProductCategories_Accounts
        FOREIGN KEY (AccountId) REFERENCES dbo.Accounts(Id);

    ALTER TABLE dbo.ProductCategories WITH CHECK ADD CONSTRAINT FK_ProductCategories_Parent
        FOREIGN KEY (ParentCategoryId) REFERENCES dbo.ProductCategories(Id);
END

/* =====================================================
   6) Products table
   ===================================================== */
IF OBJECT_ID('dbo.Products', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Products
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        AccountId INT NOT NULL,
        Code NVARCHAR(50) NOT NULL,
        Barcode NVARCHAR(50) NULL,
        Name NVARCHAR(200) NOT NULL,
        NameEn NVARCHAR(200) NULL,
        Description NVARCHAR(MAX) NULL,
        ImageUrl NVARCHAR(500) NULL,
        UnitId INT NULL,
        CategoryId INT NULL,
        CostPrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_Products_CostPrice DEFAULT 0,
        SellingPrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_Products_SellingPrice DEFAULT 0,
        StockQuantity DECIMAL(18,3) NOT NULL CONSTRAINT DF_Products_StockQuantity DEFAULT 0,
        MinStockLevel DECIMAL(18,3) NOT NULL CONSTRAINT DF_Products_MinStockLevel DEFAULT 0,
        TaxPercent DECIMAL(5,2) NOT NULL CONSTRAINT DF_Products_TaxPercent DEFAULT 0,
        IsActive BIT NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Products_CreatedAt DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CreatedByUserId INT NULL,
        UpdatedByUserId INT NULL
    );

    CREATE UNIQUE INDEX IX_Products_AccountId_Code ON dbo.Products(AccountId, Code);
    CREATE INDEX IX_Products_AccountId_Barcode ON dbo.Products(AccountId, Barcode);

    ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT FK_Products_Accounts
        FOREIGN KEY (AccountId) REFERENCES dbo.Accounts(Id);

    ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT FK_Products_Units
        FOREIGN KEY (UnitId) REFERENCES dbo.Units(Id);

    ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT FK_Products_ProductCategories
        FOREIGN KEY (CategoryId) REFERENCES dbo.ProductCategories(Id);

    ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT FK_Products_CreatedBy
        FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id);

    ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT FK_Products_UpdatedBy
        FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.Users(Id);
END

/* =====================================================
   7) ProductUnits table
   ===================================================== */
IF OBJECT_ID('dbo.ProductUnits', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductUnits
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ProductId INT NOT NULL,
        UnitId INT NOT NULL,
        ConversionFactor DECIMAL(18,6) NOT NULL CONSTRAINT DF_ProductUnits_ConversionFactor DEFAULT 1,
        Barcode NVARCHAR(50) NULL,
        SellingPrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_ProductUnits_SellingPrice DEFAULT 0,
        CostPrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_ProductUnits_CostPrice DEFAULT 0,
        IsDefault BIT NOT NULL CONSTRAINT DF_ProductUnits_IsDefault DEFAULT 0
    );

    CREATE INDEX IX_ProductUnits_ProductId ON dbo.ProductUnits(ProductId);
    CREATE INDEX IX_ProductUnits_UnitId ON dbo.ProductUnits(UnitId);

    ALTER TABLE dbo.ProductUnits WITH CHECK ADD CONSTRAINT FK_ProductUnits_Products
        FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id) ON DELETE CASCADE;

    ALTER TABLE dbo.ProductUnits WITH CHECK ADD CONSTRAINT FK_ProductUnits_Units
        FOREIGN KEY (UnitId) REFERENCES dbo.Units(Id);
END

/* =====================================================
   8) Permissions table: missing columns used by model
   ===================================================== */
IF OBJECT_ID('dbo.Permissions', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Permissions', 'NameEn') IS NULL ALTER TABLE dbo.Permissions ADD NameEn NVARCHAR(100) NULL;
    IF COL_LENGTH('dbo.Permissions', 'Module') IS NULL ALTER TABLE dbo.Permissions ADD Module NVARCHAR(50) NULL;
    IF COL_LENGTH('dbo.Permissions', 'Type') IS NULL ALTER TABLE dbo.Permissions ADD Type INT NOT NULL CONSTRAINT DF_Permissions_Type DEFAULT 1;
    IF COL_LENGTH('dbo.Permissions', 'SortOrder') IS NULL ALTER TABLE dbo.Permissions ADD SortOrder INT NOT NULL CONSTRAINT DF_Permissions_SortOrder DEFAULT 0;

    -- Backfill Module if empty/null from old Category column when available
    IF COL_LENGTH('dbo.Permissions', 'Category') IS NOT NULL
    BEGIN
        EXEC('UPDATE dbo.Permissions
              SET Module = COALESCE(NULLIF(Module, ''''), Category, N''General'')
              WHERE Module IS NULL OR Module = ''''');
    END
    ELSE
    BEGIN
        EXEC('UPDATE dbo.Permissions
              SET Module = COALESCE(NULLIF(Module, ''''), N''General'')
              WHERE Module IS NULL OR Module = ''''');
    END

    -- Make Module required after backfill
    IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Permissions' AND COLUMN_NAME = 'Module' AND IS_NULLABLE = 'YES'
    )
    BEGIN
        ALTER TABLE dbo.Permissions ALTER COLUMN Module NVARCHAR(50) NOT NULL;
    END
END

/* =====================================================
    9) Plans data repair: fix Arabic mojibake (Ø/Ù text)
      caused by non-Unicode inserts or wrong script encoding
   ===================================================== */
IF OBJECT_ID('dbo.Plans', 'U') IS NOT NULL
BEGIN
    ;WITH CanonicalPlans AS
    (
        SELECT CAST(99.00 AS DECIMAL(18,2)) AS Price,
               N'الخطة الأساسية' AS NameAr,
               N'Basic Plan' AS NameEn,
               N'خطة أساسية مناسبة للشركات الصغيرة والمتوسطة الناشئة' AS DescriptionAr,
               CAST(990.00 AS DECIMAL(18,2)) AS YearlyPrice,
               1 AS SortOrder,
               CAST(0 AS BIT) AS IsPopular
        UNION ALL
        SELECT CAST(299.00 AS DECIMAL(18,2)),
               N'الخطة الاحترافية',
               N'Professional Plan',
               N'خطة احترافية مناسبة للشركات المتوسطة والنامية',
               CAST(2990.00 AS DECIMAL(18,2)),
               2,
               CAST(1 AS BIT)
        UNION ALL
        SELECT CAST(999.00 AS DECIMAL(18,2)),
               N'خطة المؤسسات',
               N'Enterprise Plan',
               N'خطة متقدمة للمؤسسات الكبرى مع كامل المزايا',
               CAST(9990.00 AS DECIMAL(18,2)),
               3,
               CAST(0 AS BIT)
    )
    UPDATE p
    SET p.Name = c.NameAr,
        p.NameEn = CASE
            WHEN p.NameEn IS NULL OR LTRIM(RTRIM(p.NameEn)) = N'' OR p.NameEn LIKE N'%Ø%' OR p.NameEn LIKE N'%Ù%'
                THEN c.NameEn
            ELSE p.NameEn
        END,
        p.Description = c.DescriptionAr,
        p.Currency = N'ج.م',
        p.YearlyPrice = COALESCE(p.YearlyPrice, c.YearlyPrice),
        p.SortOrder = CASE WHEN ISNULL(p.SortOrder, 0) = 0 THEN c.SortOrder ELSE p.SortOrder END,
        p.IsPopular = CASE WHEN p.Price = CAST(299.00 AS DECIMAL(18,2)) THEN 1 ELSE p.IsPopular END
    FROM dbo.Plans p
    INNER JOIN CanonicalPlans c ON p.Price = c.Price
    WHERE (
        p.Name LIKE N'%Ø%' OR p.Name LIKE N'%Ù%'
        OR p.Description LIKE N'%Ø%' OR p.Description LIKE N'%Ù%'
        OR p.Currency LIKE N'%Ø%' OR p.Currency LIKE N'%Ù%'
        OR UNICODE(LEFT(ISNULL(p.Name, N''), 1)) = 216
        OR UNICODE(LEFT(ISNULL(p.Description, N''), 1)) = 216
        OR UNICODE(LEFT(ISNULL(p.Currency, N''), 1)) = 216
    );
END

/* =====================================================
   10) Countries/Provinces/Cities data repair and seed
   ===================================================== */
IF OBJECT_ID('dbo.Countries', 'U') IS NOT NULL
BEGIN
    ;WITH CanonicalCountries AS
    (
        SELECT N'SA' AS Code, N'المملكة العربية السعودية' AS NameAr, N'Saudi Arabia' AS NameEn, N'الخليج' AS RegionAr, N'+966' AS PhoneCode UNION ALL
        SELECT N'AE', N'الإمارات العربية المتحدة', N'United Arab Emirates', N'الخليج', N'+971' UNION ALL
        SELECT N'KW', N'دولة الكويت', N'Kuwait', N'الخليج', N'+965' UNION ALL
        SELECT N'QA', N'دولة قطر', N'Qatar', N'الخليج', N'+974' UNION ALL
        SELECT N'OM', N'سلطنة عمان', N'Oman', N'الخليج', N'+968' UNION ALL
        SELECT N'BH', N'مملكة البحرين', N'Bahrain', N'الخليج', N'+973' UNION ALL
        SELECT N'EG', N'جمهورية مصر العربية', N'Egypt', N'شمال أفريقيا', N'+20' UNION ALL
        SELECT N'JO', N'المملكة الأردنية الهاشمية', N'Jordan', N'بلاد الشام', N'+962' UNION ALL
        SELECT N'LB', N'جمهورية لبنان', N'Lebanon', N'بلاد الشام', N'+961' UNION ALL
        SELECT N'SY', N'الجمهورية العربية السورية', N'Syria', N'بلاد الشام', N'+963' UNION ALL
        SELECT N'IQ', N'جمهورية العراق', N'Iraq', N'بلاد الشام', N'+964' UNION ALL
        SELECT N'PS', N'دولة فلسطين', N'Palestine', N'بلاد الشام', N'+970' UNION ALL
        SELECT N'SD', N'جمهورية السودان', N'Sudan', N'شرق أفريقيا', N'+249' UNION ALL
        SELECT N'LY', N'دولة ليبيا', N'Libya', N'شمال أفريقيا', N'+218' UNION ALL
        SELECT N'TN', N'الجمهورية التونسية', N'Tunisia', N'شمال أفريقيا', N'+216' UNION ALL
        SELECT N'DZ', N'الجمهورية الجزائرية', N'Algeria', N'شمال أفريقيا', N'+213' UNION ALL
        SELECT N'MA', N'المملكة المغربية', N'Morocco', N'شمال أفريقيا', N'+212' UNION ALL
        SELECT N'MR', N'الجمهورية الإسلامية الموريتانية', N'Mauritania', N'شمال أفريقيا', N'+222' UNION ALL
        SELECT N'DJ', N'جمهورية جيبوتي', N'Djibouti', N'شرق أفريقيا', N'+253' UNION ALL
        SELECT N'SO', N'جمهورية الصومال', N'Somalia', N'شرق أفريقيا', N'+252'
    )
    UPDATE c
    SET c.Name = cc.NameAr,
        c.NameEn = cc.NameEn,
        c.Region = cc.RegionAr,
        c.PhoneCode = cc.PhoneCode
    FROM dbo.Countries c
    INNER JOIN CanonicalCountries cc ON c.Code = cc.Code
    WHERE (
        c.Name LIKE N'%Ø%' OR c.Name LIKE N'%Ù%'
        OR c.Region LIKE N'%Ø%' OR c.Region LIKE N'%Ù%'
        OR UNICODE(LEFT(ISNULL(c.Name, N''), 1)) = 216
        OR UNICODE(LEFT(ISNULL(c.Region, N''), 1)) = 216
        OR c.NameEn IS NULL OR LTRIM(RTRIM(c.NameEn)) = N''
    );
END

IF OBJECT_ID('dbo.Provinces', 'U') IS NOT NULL AND OBJECT_ID('dbo.Countries', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.Provinces)
    BEGIN
        INSERT INTO dbo.Provinces (CountryId, Code, Name, NameEn, IsActive)
        SELECT c.Id, v.Code, v.NameAr, v.NameEn, 1
        FROM (VALUES
            (N'SA', N'RIY', N'منطقة الرياض', N'Riyadh Region'),
            (N'SA', N'MKK', N'منطقة مكة المكرمة', N'Makkah Region'),
            (N'SA', N'EST', N'المنطقة الشرقية', N'Eastern Region'),
            (N'AE', N'DXB', N'إمارة دبي', N'Dubai'),
            (N'AE', N'AUH', N'إمارة أبوظبي', N'Abu Dhabi'),
            (N'AE', N'SHJ', N'إمارة الشارقة', N'Sharjah'),
            (N'EG', N'C', N'محافظة القاهرة', N'Cairo Governorate'),
            (N'EG', N'GZ', N'محافظة الجيزة', N'Giza Governorate'),
            (N'EG', N'ALX', N'محافظة الإسكندرية', N'Alexandria Governorate')
        ) v(CountryCode, Code, NameAr, NameEn)
        INNER JOIN dbo.Countries c ON c.Code = v.CountryCode;
    END
END

IF OBJECT_ID('dbo.Cities', 'U') IS NOT NULL AND OBJECT_ID('dbo.Provinces', 'U') IS NOT NULL AND OBJECT_ID('dbo.Countries', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.Cities)
    BEGIN
        INSERT INTO dbo.Cities (ProvinceId, Name, NameEn, IsActive)
        SELECT p.Id, v.NameAr, v.NameEn, 1
        FROM (VALUES
            (N'SA', N'RIY', N'الرياض', N'Riyadh'),
            (N'SA', N'RIY', N'الخرج', N'Al Kharj'),
            (N'SA', N'MKK', N'جدة', N'Jeddah'),
            (N'SA', N'MKK', N'مكة المكرمة', N'Makkah'),
            (N'SA', N'EST', N'الدمام', N'Dammam'),
            (N'SA', N'EST', N'الخبر', N'Al Khobar'),
            (N'AE', N'DXB', N'دبي', N'Dubai'),
            (N'AE', N'AUH', N'أبوظبي', N'Abu Dhabi'),
            (N'AE', N'SHJ', N'الشارقة', N'Sharjah'),
            (N'EG', N'C', N'القاهرة', N'Cairo'),
            (N'EG', N'GZ', N'الجيزة', N'Giza'),
            (N'EG', N'ALX', N'الإسكندرية', N'Alexandria')
        ) v(CountryCode, ProvinceCode, NameAr, NameEn)
        INNER JOIN dbo.Countries c ON c.Code = v.CountryCode
        INNER JOIN dbo.Provinces p ON p.CountryId = c.Id AND p.Code = v.ProvinceCode;
    END
END

PRINT 'Schema sync completed successfully.';
