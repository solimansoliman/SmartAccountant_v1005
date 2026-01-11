-- إنشاء جدول إعدادات النظام
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemSettings')
BEGIN
    CREATE TABLE SystemSettings (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AccountId INT NULL,
        SettingKey NVARCHAR(100) NOT NULL,
        SettingValue NVARCHAR(MAX) NOT NULL,
        SettingType NVARCHAR(50) NOT NULL DEFAULT 'string',
        [Description] NVARCHAR(500),
        IsPublic BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_SystemSettings_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
        CONSTRAINT UQ_SystemSettings_Key UNIQUE (AccountId, SettingKey)
    );
    PRINT N'Table SystemSettings created successfully';
END
ELSE
    PRINT N'Table already exists';
GO

-- إضافة البيانات الافتراضية
IF NOT EXISTS (SELECT 1 FROM SystemSettings WHERE SettingKey = 'showDemoLogin')
BEGIN
    INSERT INTO SystemSettings (AccountId, SettingKey, SettingValue, SettingType, [Description], IsPublic)
    VALUES 
    (NULL, N'showDemoLogin', N'true', N'bool', N'إظهار زر الدخول التجريبي في شاشة تسجيل الدخول', 1),
    (NULL, N'showAdminLogin', N'true', N'bool', N'إظهار زر دخول الأدمن في شاشة تسجيل الدخول', 1),
    (NULL, N'showMockDataGenerator', N'true', N'bool', N'إظهار أداة توليد البيانات التجريبية', 0),
    (NULL, N'allowUserRegistration', N'true', N'bool', N'السماح بتسجيل مستخدمين جدد', 1);
    PRINT N'Default settings inserted successfully';
END
ELSE
    PRINT N'Default settings already exist';
GO
