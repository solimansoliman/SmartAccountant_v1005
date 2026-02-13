-- =====================================================
-- ملف: السكيمة الكاملة لقاعدة البيانات
-- الوصف: ملف شامل يحتوي على إنشاء قاعدة البيانات والجداول والأعمدة
-- الإصدار: 1.0.5
-- آخر تحديث: مارس 2026
-- الاستخدام: sqlcmd -S "(localdb)\mssqllocaldb" -i "SCHEMA_COMPLETE.sql"
-- =====================================================

USE [master];

-- Drop existing database if it exists
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'SmartAccountant_v1005_DB')
BEGIN
    ALTER DATABASE [SmartAccountant_v1005_DB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [SmartAccountant_v1005_DB];
END

-- Create database with Arabic collation
CREATE DATABASE [SmartAccountant_v1005_DB] 
COLLATE Arabic_100_CI_AS;

GO

USE [SmartAccountant_v1005_DB];

-- =====================================================
-- CORE TABLES
-- =====================================================

-- 1. Currencies Table
CREATE TABLE [Currencies] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Code] NVARCHAR(10) NOT NULL UNIQUE,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [Symbol] NVARCHAR(10) NOT NULL,
    [SubUnit] NVARCHAR(50) NULL,
    [Country] NVARCHAR(100) NULL,
    [CountryCode] NVARCHAR(5) NULL,
    [Flag] NVARCHAR(20) NULL,
    [ExchangeRate] DECIMAL(18,6) DEFAULT 1,
    [DecimalPlaces] INT DEFAULT 2,
    [IsActive] BIT DEFAULT 1,
    [IsDefault] BIT DEFAULT 0,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE()
);

-- 2. Plans Table
CREATE TABLE [Plans] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(200) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [Price] DECIMAL(18,2) DEFAULT 0,
    [BillingCycle] INT DEFAULT 30,
    [MaxAccounts] INT DEFAULT 1,
    [MaxUsers] INT DEFAULT 5,
    [MaxInvoices] INT DEFAULT 1000,
    [MaxCustomers] INT DEFAULT 500,
    [Features] NVARCHAR(MAX) NULL,
    [IsActive] BIT DEFAULT 1,
    [DisplayOrder] INT DEFAULT 0,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL
);

-- 3. Roles Table
CREATE TABLE [Roles] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(100) NOT NULL UNIQUE,
    [Description] NVARCHAR(500) NULL,
    [IsSystemRole] BIT DEFAULT 0,
    [IsActive] BIT DEFAULT 1,
    [RoleType] NVARCHAR(50) DEFAULT N'Standard',
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE()
);

-- 4. Permissions Table
CREATE TABLE [Permissions] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(100) NOT NULL UNIQUE,
    [Description] NVARCHAR(500) NULL,
    [Category] NVARCHAR(100) NULL,
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE()
);

-- 5. RolePermissions Table
CREATE TABLE [RolePermissions] (
    [RoleId] INT NOT NULL,
    [PermissionId] INT NOT NULL,
    PRIMARY KEY ([RoleId], [PermissionId]),
    FOREIGN KEY ([RoleId]) REFERENCES [Roles]([Id]) ON DELETE CASCADE,
    FOREIGN KEY ([PermissionId]) REFERENCES [Permissions]([Id]) ON DELETE CASCADE
);

-- 6. Accounts Table
CREATE TABLE [Accounts] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(200) NOT NULL,
    [NameEn] NVARCHAR(200) NULL,
    [Email] NVARCHAR(200) NULL,
    [Phone] NVARCHAR(50) NULL,
    [Address] NVARCHAR(500) NULL,
    [City] NVARCHAR(100) NULL,
    [State] NVARCHAR(100) NULL,
    [ZipCode] NVARCHAR(20) NULL,
    [LogoUrl] NVARCHAR(500) NULL,
    [CurrencySymbol] NVARCHAR(10) NULL,
    [CurrencyId] INT NULL,
    [TaxNumber] NVARCHAR(50) NULL,
    [TaxId] NVARCHAR(50) NULL,
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [SubscriptionExpiry] DATETIME2 NULL,
    [Plan] INT DEFAULT 0,
    [PlanId] INT NULL,
    [MaxMessageLength] INT DEFAULT 1000,
    [MaxNotificationLength] INT DEFAULT 500,
    [LastDataExportDate] DATETIME2 NULL,
    [ScheduledDeletionDate] DATETIME2 NULL,
    [ConsentGiven] BIT DEFAULT 0,
    CONSTRAINT [FK_Accounts_Currencies] FOREIGN KEY ([CurrencyId]) REFERENCES [Currencies]([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_Accounts_Plans] FOREIGN KEY ([PlanId]) REFERENCES [Plans]([Id]) ON DELETE SET NULL
);

-- 7. Users Table (Updated with all permission columns)
CREATE TABLE [Users] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Username] NVARCHAR(50) NOT NULL,
    [PasswordHash] NVARCHAR(500) NOT NULL,
    [FullName] NVARCHAR(100) NOT NULL,
    [Email] NVARCHAR(100) NULL,
    [Phone] NVARCHAR(20) NULL,
    [AvatarUrl] NVARCHAR(500) NULL,
    [RoleId] INT NULL,
    [RoleType] INT DEFAULT 4,
    [IsSuperAdmin] BIT DEFAULT 0,
    [IsActive] BIT DEFAULT 1,
    [CanCreateInvoices] BIT DEFAULT 1,
    [CanManageCustomers] BIT DEFAULT 1,
    [CanManageExpenses] BIT DEFAULT 1,
    [CanManageProducts] BIT DEFAULT 1,
    [CanManageSettings] BIT DEFAULT 0,
    [CanManageUsers] BIT DEFAULT 0,
    [CanViewReports] BIT DEFAULT 1,
    [EmailVerified] BIT DEFAULT 0,
    [PhoneVerified] BIT DEFAULT 0,
    [MaxMessageLength] INT DEFAULT 1000,
    [MaxNotificationLength] INT DEFAULT 500,
    [FailedLoginAttempts] INT DEFAULT 0,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [LastLoginAt] DATETIME2 NULL,
    [LastLoginIp] NVARCHAR(50) NULL,
    [LockoutEnd] DATETIME2 NULL,
    [Department] NVARCHAR(100) NULL,
    [JobTitle] NVARCHAR(100) NULL,
    [PreferredLanguage] NVARCHAR(10) DEFAULT N'ar',
    [TimeZone] NVARCHAR(100) DEFAULT N'UTC',
    CONSTRAINT [FK_Users_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Users_Roles] FOREIGN KEY ([RoleId]) REFERENCES [Roles]([Id]) ON DELETE SET NULL,
    CONSTRAINT [UQ_Users_Username_Account] UNIQUE ([AccountId], [Username])
);

-- 8. Countries Table
CREATE TABLE [Countries] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Code] NVARCHAR(10) NOT NULL UNIQUE,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [Region] NVARCHAR(100) NULL,
    [Flag] NVARCHAR(50) NULL,
    [PhoneCode] NVARCHAR(10) NULL,
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE()
);

-- 9. Provinces Table
CREATE TABLE [Provinces] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [CountryId] INT NOT NULL,
    [Code] NVARCHAR(10) NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_Provinces_Countries] FOREIGN KEY ([CountryId]) REFERENCES [Countries]([Id]) ON DELETE CASCADE,
    CONSTRAINT [UQ_Provinces_Code] UNIQUE ([CountryId], [Code])
);

-- 10. Cities Table
CREATE TABLE [Cities] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [ProvinceId] INT NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_Cities_Provinces] FOREIGN KEY ([ProvinceId]) REFERENCES [Provinces]([Id]) ON DELETE CASCADE
);

-- 11. Customers Table
CREATE TABLE [Customers] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [NameEn] NVARCHAR(200) NULL,
    [Email] NVARCHAR(100) NULL,
    [Phone] NVARCHAR(50) NULL,
    [Address] NVARCHAR(500) NULL,
    [City] NVARCHAR(100) NULL,
    [State] NVARCHAR(100) NULL,
    [ZipCode] NVARCHAR(20) NULL,
    [CountryId] INT NULL,
    [ProvinceId] INT NULL,
    [CityId] INT NULL,
    [TaxNumber] NVARCHAR(50) NULL,
    [WebsiteUrl] NVARCHAR(500) NULL,
    [Notes] NVARCHAR(MAX) NULL,
    [TotalPurchases] DECIMAL(18,2) DEFAULT 0,
    [TotalPayments] DECIMAL(18,2) DEFAULT 0,
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    CONSTRAINT [FK_Customers_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Customers_Countries] FOREIGN KEY ([CountryId]) REFERENCES [Countries]([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Customers_Provinces] FOREIGN KEY ([ProvinceId]) REFERENCES [Provinces]([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Customers_Cities] FOREIGN KEY ([CityId]) REFERENCES [Cities]([Id]) ON DELETE NO ACTION
);

-- 12. PhoneNumbers Table
CREATE TABLE [PhoneNumbers] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [EntityType] NVARCHAR(50) NOT NULL,
    [EntityId] INT NOT NULL,
    [Phone] NVARCHAR(50) NOT NULL,
    [PhoneType] NVARCHAR(20) DEFAULT N'mobile',
    [IsPrimary] BIT DEFAULT 0,
    [AccountId] INT NULL,
    [CreatedByUserId] INT NULL,
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_PhoneNumbers_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]) ON DELETE SET NULL
);

-- 13. Invoices Table
CREATE TABLE [Invoices] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [CustomerId] INT NOT NULL,
    [InvoiceNumber] NVARCHAR(50) NOT NULL,
    [InvoiceDate] DATETIME2 DEFAULT GETUTCDATE(),
    [DueDate] DATETIME2 NULL,
    [TotalAmount] DECIMAL(18,2) DEFAULT 0,
    [TaxAmount] DECIMAL(18,2) DEFAULT 0,
    [DiscountAmount] DECIMAL(18,2) DEFAULT 0,
    [NetAmount] DECIMAL(18,2) DEFAULT 0,
    [Status] NVARCHAR(50) DEFAULT N'draft',
    [Notes] NVARCHAR(MAX) NULL,
    [CreatedByUserId] INT NULL,
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    CONSTRAINT [FK_Invoices_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Invoices_Customers] FOREIGN KEY ([CustomerId]) REFERENCES [Customers]([Id]) ON DELETE CASCADE,
    CONSTRAINT [UQ_Invoices_Number] UNIQUE ([AccountId], [InvoiceNumber])
);

-- 14. SystemSettings Table
CREATE TABLE [SystemSettings] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NULL,
    [SettingKey] NVARCHAR(200) NOT NULL,
    [SettingValue] NVARCHAR(MAX) NULL,
    [SettingType] NVARCHAR(50) NULL,
    [Description] NVARCHAR(500) NULL,
    [IsPublic] BIT DEFAULT 0,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    CONSTRAINT [FK_SystemSettings_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]) ON DELETE CASCADE,
    CONSTRAINT [UQ_SystemSettings] UNIQUE ([AccountId], [SettingKey])
);

-- 15. ActivityLogs Table
CREATE TABLE [ActivityLogs] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NULL,
    [UserId] INT NULL,
    [Action] NVARCHAR(200) NOT NULL,
    [EntityType] NVARCHAR(100) NULL,
    [EntityId] INT NULL,
    [OldValues] NVARCHAR(MAX) NULL,
    [NewValues] NVARCHAR(MAX) NULL,
    [IpAddress] NVARCHAR(50) NULL,
    [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_ActivityLogs_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_ActivityLogs_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]) ON DELETE SET NULL
);

PRINT N'═══════════════════════════════════════════════════════════';
PRINT N'✓ تم إنشاء مخطط قاعدة البيانات بنجاح!';
PRINT N'═══════════════════════════════════════════════════════════';
