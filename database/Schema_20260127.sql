-- =============================================
-- SmartAccountant - سكريبت هيكل قاعدة البيانات الكامل
-- =============================================
-- تاريخ الإنشاء: 2026-01-27
-- الإصدار: 1.0.0
-- =============================================
-- 
-- هذا الملف يحتوي على:
-- 1. إنشاء قاعدة البيانات
-- 2. جميع الجداول الأساسية (26 جدول)
-- 3. العلاقات والمفاتيح الخارجية
-- 4. الفهارس (Indexes)
-- 
-- الاستخدام:
-- sqlcmd -S SERVER_NAME -i Schema_20260127.sql
-- =============================================

PRINT N'=============================================';
PRINT N'SmartAccountant - Database Schema';
PRINT N'Date: 2026-01-27';
PRINT N'=============================================';
GO

-- =============================================
-- الخطوة 1: إنشاء قاعدة البيانات
-- =============================================
USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SmartAccountant')
BEGIN
    CREATE DATABASE [SmartAccountant]
    COLLATE Arabic_CI_AS;
    PRINT N'✓ تم إنشاء قاعدة البيانات';
END
ELSE
BEGIN
    PRINT N'⚠ قاعدة البيانات موجودة مسبقاً';
END
GO

USE [SmartAccountant];
GO

-- =============================================
-- الخطوة 2: إنشاء الجداول
-- =============================================
PRINT N'جاري إنشاء الجداول...';
GO

-- =============================================
-- 1. جدول العملات (Currencies)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Currencies')
CREATE TABLE [Currencies] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Code] NVARCHAR(10) NOT NULL UNIQUE,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [Symbol] NVARCHAR(10) NOT NULL,
    [Country] NVARCHAR(100) NULL,
    [CountryCode] NVARCHAR(5) NULL,
    [Flag] NVARCHAR(20) NULL,
    [ExchangeRate] DECIMAL(18,6) NOT NULL DEFAULT 1,
    [DecimalPlaces] INT NOT NULL DEFAULT 2,
    [SubUnit] NVARCHAR(50) NULL,
    [IsDefault] BIT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- =============================================
-- 2. جدول الحسابات/الشركات (Accounts)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Accounts')
CREATE TABLE [Accounts] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(200) NOT NULL,
    [NameEn] NVARCHAR(200) NULL,
    [Email] NVARCHAR(200) NULL,
    [Phone] NVARCHAR(50) NULL,
    [Address] NVARCHAR(500) NULL,
    [City] NVARCHAR(100) NULL,
    [Country] NVARCHAR(100) NULL,
    [PostalCode] NVARCHAR(20) NULL,
    [Website] NVARCHAR(200) NULL,
    [TaxNumber] NVARCHAR(50) NULL,
    [CommercialRegister] NVARCHAR(50) NULL,
    [Logo] NVARCHAR(500) NULL,
    [LogoUrl] NVARCHAR(500) NULL,
    [CurrencyId] INT NULL,
    [CurrencySymbol] NVARCHAR(10) NOT NULL DEFAULT N'ج.م',
    [Plan] INT NOT NULL DEFAULT 0,
    [SubscriptionType] INT NOT NULL DEFAULT 0,
    [SubscriptionExpiry] DATETIME2 NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [Notes] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    CONSTRAINT [FK_Accounts_Currencies] FOREIGN KEY ([CurrencyId]) REFERENCES [Currencies]([Id])
);
GO

-- =============================================
-- 3. جدول المستخدمين (Users)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
CREATE TABLE [Users] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Username] NVARCHAR(100) NOT NULL,
    [Email] NVARCHAR(200) NULL,
    [PasswordHash] NVARCHAR(500) NOT NULL,
    [FullName] NVARCHAR(200) NOT NULL,
    [Phone] NVARCHAR(50) NULL,
    [Avatar] NVARCHAR(500) NULL,
    [AvatarUrl] NVARCHAR(500) NULL,
    [JobTitle] NVARCHAR(100) NULL,
    [Department] NVARCHAR(100) NULL,
    [RoleType] INT NOT NULL DEFAULT 0,
    [IsSuperAdmin] BIT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [EmailVerified] BIT NOT NULL DEFAULT 0,
    [PhoneVerified] BIT NOT NULL DEFAULT 0,
    [PreferredLanguage] NVARCHAR(10) DEFAULT 'ar',
    [Language] NVARCHAR(10) NOT NULL DEFAULT 'ar',
    [Timezone] NVARCHAR(100) NULL DEFAULT 'Africa/Cairo',
    [FailedLoginAttempts] INT NOT NULL DEFAULT 0,
    [LockoutEnd] DATETIME2 NULL,
    [LastLoginAt] DATETIME2 NULL,
    [LastLoginIp] NVARCHAR(50) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    -- صلاحيات مباشرة (للتوافق مع الإصدارات القديمة)
    [CanManageProducts] BIT NOT NULL DEFAULT 0,
    [CanManageCustomers] BIT NOT NULL DEFAULT 0,
    [CanCreateInvoices] BIT NOT NULL DEFAULT 0,
    [CanManageExpenses] BIT NOT NULL DEFAULT 0,
    [CanViewReports] BIT NOT NULL DEFAULT 0,
    [CanManageSettings] BIT NOT NULL DEFAULT 0,
    [CanManageUsers] BIT NOT NULL DEFAULT 0,
    CONSTRAINT [FK_Users_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [UQ_Users_AccountId_Username] UNIQUE ([AccountId], [Username])
);
GO

-- =============================================
-- 4. جدول الصلاحيات (Permissions)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Permissions')
CREATE TABLE [Permissions] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Code] NVARCHAR(100) NOT NULL UNIQUE,
    [Name] NVARCHAR(200) NOT NULL,
    [NameEn] NVARCHAR(200) NULL,
    [Description] NVARCHAR(500) NULL,
    [Module] NVARCHAR(100) NOT NULL,
    [Type] INT NOT NULL DEFAULT 0,
    [SortOrder] INT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 1
);
GO

-- =============================================
-- 5. جدول الأدوار (Roles)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
CREATE TABLE [Roles] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [Description] NVARCHAR(500) NULL,
    [Color] NVARCHAR(50) NULL DEFAULT '#3B82F6',
    [Icon] NVARCHAR(100) NULL DEFAULT 'shield',
    [IsSystemRole] BIT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_Roles_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [UQ_Roles_AccountId_Name] UNIQUE ([AccountId], [Name])
);
GO

-- =============================================
-- 6. جدول صلاحيات الأدوار (RolePermissions)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RolePermissions')
CREATE TABLE [RolePermissions] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [RoleId] INT NOT NULL,
    [PermissionId] INT NOT NULL,
    [AssignedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_RolePermissions_Roles] FOREIGN KEY ([RoleId]) REFERENCES [Roles]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RolePermissions_Permissions] FOREIGN KEY ([PermissionId]) REFERENCES [Permissions]([Id]) ON DELETE CASCADE,
    CONSTRAINT [UQ_RolePermissions] UNIQUE ([RoleId], [PermissionId])
);
GO

-- =============================================
-- 7. جدول أدوار المستخدمين (UserRoles)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserRoles')
CREATE TABLE [UserRoles] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [UserId] INT NOT NULL,
    [RoleId] INT NOT NULL,
    [AssignedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [AssignedByUserId] INT NULL,
    CONSTRAINT [FK_UserRoles_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserRoles_Roles] FOREIGN KEY ([RoleId]) REFERENCES [Roles]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserRoles_AssignedBy] FOREIGN KEY ([AssignedByUserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [UQ_UserRoles] UNIQUE ([UserId], [RoleId])
);
GO

-- =============================================
-- 8. جدول عناصر القائمة (MenuItems)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MenuItems')
CREATE TABLE [MenuItems] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Code] NVARCHAR(50) NOT NULL UNIQUE,
    [Title] NVARCHAR(100) NOT NULL,
    [TitleEn] NVARCHAR(100) NULL,
    [Icon] NVARCHAR(100) NULL,
    [Path] NVARCHAR(200) NULL,
    [ParentId] INT NULL,
    [SortOrder] INT NOT NULL DEFAULT 0,
    [RequiredPermission] NVARCHAR(100) NULL,
    [ShowInSidebar] BIT NOT NULL DEFAULT 1,
    [ShowInHeader] BIT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [FK_MenuItems_Parent] FOREIGN KEY ([ParentId]) REFERENCES [MenuItems]([Id])
);
GO

-- =============================================
-- 9. جدول إعدادات النظام (SystemSettings)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemSettings')
CREATE TABLE [SystemSettings] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NULL, -- NULL = إعدادات عامة للنظام
    [SettingKey] NVARCHAR(100) NOT NULL,
    [SettingValue] NVARCHAR(MAX) NOT NULL,
    [SettingType] NVARCHAR(50) NOT NULL DEFAULT 'string',
    [Description] NVARCHAR(500) NULL,
    [IsPublic] BIT NOT NULL DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_SystemSettings_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [UQ_SystemSettings_Key] UNIQUE ([AccountId], [SettingKey])
);
GO

-- =============================================
-- 10. جدول الوحدات (Units)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Units')
CREATE TABLE [Units] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Name] NVARCHAR(50) NOT NULL,
    [NameEn] NVARCHAR(50) NULL,
    [Symbol] NVARCHAR(20) NOT NULL,
    [IsBase] BIT NOT NULL DEFAULT 0,
    [BaseUnitId] INT NULL,
    [ConversionFactor] DECIMAL(18,6) NOT NULL DEFAULT 1,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [CreatedByUserId] INT NULL,
    CONSTRAINT [FK_Units_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Units_BaseUnit] FOREIGN KEY ([BaseUnitId]) REFERENCES [Units]([Id]),
    CONSTRAINT [FK_Units_CreatedBy] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users]([Id])
);
GO

-- =============================================
-- 11. جدول تصنيفات المنتجات (ProductCategories)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductCategories')
CREATE TABLE [ProductCategories] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [ParentCategoryId] INT NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [FK_ProductCategories_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_ProductCategories_Parent] FOREIGN KEY ([ParentCategoryId]) REFERENCES [ProductCategories]([Id])
);
GO

-- =============================================
-- 12. جدول المنتجات (Products)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
CREATE TABLE [Products] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [CategoryId] INT NULL,
    [UnitId] INT NULL,
    [Code] NVARCHAR(50) NOT NULL,
    [Barcode] NVARCHAR(100) NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [NameEn] NVARCHAR(200) NULL,
    [Description] NVARCHAR(MAX) NULL,
    [CostPrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [SellingPrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [TaxPercent] DECIMAL(5,2) NOT NULL DEFAULT 0,
    [StockQuantity] DECIMAL(18,3) NOT NULL DEFAULT 0,
    [MinStockLevel] DECIMAL(18,3) NOT NULL DEFAULT 0,
    [ImageUrl] NVARCHAR(500) NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    [UpdatedByUserId] INT NULL,
    CONSTRAINT [FK_Products_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Products_Categories] FOREIGN KEY ([CategoryId]) REFERENCES [ProductCategories]([Id]),
    CONSTRAINT [FK_Products_Units] FOREIGN KEY ([UnitId]) REFERENCES [Units]([Id]),
    CONSTRAINT [FK_Products_CreatedBy] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Products_UpdatedBy] FOREIGN KEY ([UpdatedByUserId]) REFERENCES [Users]([Id])
);
GO

-- =============================================
-- 13. جدول وحدات المنتجات (ProductUnits)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductUnits')
CREATE TABLE [ProductUnits] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [ProductId] INT NOT NULL,
    [UnitId] INT NOT NULL,
    [ConversionFactor] DECIMAL(18,6) NOT NULL DEFAULT 1,
    [Barcode] NVARCHAR(100) NULL,
    [CostPrice] DECIMAL(18,2) NULL,
    [SellingPrice] DECIMAL(18,2) NULL,
    [IsDefault] BIT NOT NULL DEFAULT 0,
    CONSTRAINT [FK_ProductUnits_Products] FOREIGN KEY ([ProductId]) REFERENCES [Products]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ProductUnits_Units] FOREIGN KEY ([UnitId]) REFERENCES [Units]([Id])
);
GO

-- =============================================
-- 14. جدول أرقام الهاتف (PhoneNumbers)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PhoneNumbers')
CREATE TABLE [PhoneNumbers] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [EntityType] NVARCHAR(50) NOT NULL,
    [EntityId] INT NOT NULL,
    [PhoneNumber] NVARCHAR(50) NOT NULL,
    [CountryCode] NVARCHAR(10) NULL,
    [PhoneType] INT NOT NULL DEFAULT 0,
    [Label] NVARCHAR(50) NULL,
    [IsPrimary] BIT NOT NULL DEFAULT 0,
    [IsVerified] BIT NOT NULL DEFAULT 0,
    [IsWhatsApp] BIT NOT NULL DEFAULT 0,
    [IsTelegram] BIT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [Notes] NVARCHAR(500) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    CONSTRAINT [FK_PhoneNumbers_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- =============================================
-- 15. جدول البريد الإلكتروني (Emails)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Emails')
CREATE TABLE [Emails] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [EntityType] NVARCHAR(50) NOT NULL,
    [EntityId] INT NOT NULL,
    [EmailAddress] NVARCHAR(200) NOT NULL,
    [EmailType] INT NOT NULL DEFAULT 0,
    [Label] NVARCHAR(50) NULL,
    [IsPrimary] BIT NOT NULL DEFAULT 0,
    [IsVerified] BIT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [Notes] NVARCHAR(500) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    CONSTRAINT [FK_Emails_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- =============================================
-- 16. جدول العملاء (Customers)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers')
CREATE TABLE [Customers] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [CurrencyId] INT NULL,
    [Code] NVARCHAR(50) NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [NameEn] NVARCHAR(200) NULL,
    [Type] NVARCHAR(20) NOT NULL DEFAULT 'customer',
    [Email] NVARCHAR(200) NULL,
    [Phone] NVARCHAR(50) NULL,
    [Phone2] NVARCHAR(50) NULL,
    [Address] NVARCHAR(500) NULL,
    [City] NVARCHAR(100) NULL,
    [Country] NVARCHAR(100) NULL,
    [TaxNumber] NVARCHAR(50) NULL,
    [Balance] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [CreditLimit] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [DiscountPercent] DECIMAL(5,2) NOT NULL DEFAULT 0,
    [PriceListId] INT NULL,
    [Notes] NVARCHAR(MAX) NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    [UpdatedByUserId] INT NULL,
    CONSTRAINT [FK_Customers_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Customers_Currencies] FOREIGN KEY ([CurrencyId]) REFERENCES [Currencies]([Id]),
    CONSTRAINT [FK_Customers_CreatedBy] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Customers_UpdatedBy] FOREIGN KEY ([UpdatedByUserId]) REFERENCES [Users]([Id])
);
GO

-- =============================================
-- 17. جدول أنواع المعاملات (TransactionTypes)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TransactionTypes')
CREATE TABLE [TransactionTypes] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Code] NVARCHAR(50) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [Category] NVARCHAR(50) NOT NULL,
    [Icon] NVARCHAR(50) NULL,
    [Color] NVARCHAR(20) NULL,
    [IsIncome] BIT NOT NULL DEFAULT 0,
    [IsExpense] BIT NOT NULL DEFAULT 0,
    [IsSystemType] BIT NOT NULL DEFAULT 0,
    [SortOrder] INT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [FK_TransactionTypes_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- =============================================
-- 18. جدول الفواتير (Invoices)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Invoices')
CREATE TABLE [Invoices] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [CustomerId] INT NULL,
    [UserId] INT NULL,
    [InvoiceNumber] NVARCHAR(50) NOT NULL,
    [Type] NVARCHAR(20) NOT NULL DEFAULT 'sale',
    [InvoiceType] INT NOT NULL DEFAULT 0,
    [InvoiceDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [DueDate] DATETIME2 NULL,
    [Subtotal] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [SubTotal] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [DiscountPercent] DECIMAL(5,2) NOT NULL DEFAULT 0,
    [DiscountAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [TotalAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [PaidAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [PaymentMethod] INT NOT NULL DEFAULT 0,
    [Status] NVARCHAR(20) NOT NULL DEFAULT 'draft',
    [Notes] NVARCHAR(MAX) NULL,
    [QrCode] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    [UpdatedByUserId] INT NULL,
    CONSTRAINT [FK_Invoices_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Invoices_Customers] FOREIGN KEY ([CustomerId]) REFERENCES [Customers]([Id]),
    CONSTRAINT [FK_Invoices_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Invoices_CreatedBy] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Invoices_UpdatedBy] FOREIGN KEY ([UpdatedByUserId]) REFERENCES [Users]([Id])
);
GO

-- =============================================
-- 19. جدول بنود الفواتير (InvoiceItems)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InvoiceItems')
CREATE TABLE [InvoiceItems] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [InvoiceId] INT NOT NULL,
    [ProductId] INT NULL,
    [UnitId] INT NULL,
    [ProductName] NVARCHAR(200) NULL,
    [Quantity] DECIMAL(18,3) NOT NULL DEFAULT 1,
    [UnitPrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [DiscountPercent] DECIMAL(5,2) NOT NULL DEFAULT 0,
    [DiscountAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [TaxPercent] DECIMAL(5,2) NOT NULL DEFAULT 0,
    [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [TotalAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [LineTotal] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [Notes] NVARCHAR(500) NULL,
    CONSTRAINT [FK_InvoiceItems_Invoices] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_InvoiceItems_Products] FOREIGN KEY ([ProductId]) REFERENCES [Products]([Id]),
    CONSTRAINT [FK_InvoiceItems_Units] FOREIGN KEY ([UnitId]) REFERENCES [Units]([Id])
);
GO

-- =============================================
-- 20. جدول تصنيفات المصروفات (ExpenseCategories)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ExpenseCategories')
CREATE TABLE [ExpenseCategories] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Code] NVARCHAR(50) NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [ParentCategoryId] INT NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [FK_ExpenseCategories_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_ExpenseCategories_Parent] FOREIGN KEY ([ParentCategoryId]) REFERENCES [ExpenseCategories]([Id])
);
GO

-- =============================================
-- 21. جدول المصروفات (Expenses)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Expenses')
CREATE TABLE [Expenses] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [CategoryId] INT NULL,
    [TransactionTypeId] INT NULL,
    [ExpenseNumber] NVARCHAR(50) NULL,
    [Description] NVARCHAR(500) NOT NULL,
    [Amount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [TotalAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [ExpenseDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [PaymentMethod] NVARCHAR(50) NULL,
    [ReferenceNumber] NVARCHAR(100) NULL,
    [Payee] NVARCHAR(200) NULL,
    [Vendor] NVARCHAR(200) NULL,
    [AttachmentUrl] NVARCHAR(500) NULL,
    [Notes] NVARCHAR(MAX) NULL,
    [Status] NVARCHAR(20) NOT NULL DEFAULT 'pending',
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    [ApprovedByUserId] INT NULL,
    [ApprovedAt] DATETIME2 NULL,
    CONSTRAINT [FK_Expenses_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Expenses_Categories] FOREIGN KEY ([CategoryId]) REFERENCES [ExpenseCategories]([Id]),
    CONSTRAINT [FK_Expenses_TransactionTypes] FOREIGN KEY ([TransactionTypeId]) REFERENCES [TransactionTypes]([Id]),
    CONSTRAINT [FK_Expenses_CreatedBy] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Expenses_ApprovedBy] FOREIGN KEY ([ApprovedByUserId]) REFERENCES [Users]([Id])
);
GO

-- =============================================
-- 22. جدول تصنيفات الإيرادات (RevenueCategories)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RevenueCategories')
CREATE TABLE [RevenueCategories] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Code] NVARCHAR(50) NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [ParentCategoryId] INT NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [FK_RevenueCategories_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_RevenueCategories_Parent] FOREIGN KEY ([ParentCategoryId]) REFERENCES [RevenueCategories]([Id])
);
GO

-- =============================================
-- 23. جدول الإيرادات (Revenues)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Revenues')
CREATE TABLE [Revenues] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [CategoryId] INT NULL,
    [RevenueNumber] NVARCHAR(50) NULL,
    [Description] NVARCHAR(500) NOT NULL,
    [Amount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [NetAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [RevenueDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [PaymentMethod] NVARCHAR(50) NULL,
    [ReferenceNumber] NVARCHAR(100) NULL,
    [Payer] NVARCHAR(200) NULL,
    [Source] NVARCHAR(200) NULL,
    [AttachmentUrl] NVARCHAR(500) NULL,
    [Notes] NVARCHAR(MAX) NULL,
    [Status] INT NOT NULL DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    CONSTRAINT [FK_Revenues_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Revenues_Categories] FOREIGN KEY ([CategoryId]) REFERENCES [RevenueCategories]([Id]),
    CONSTRAINT [FK_Revenues_CreatedBy] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users]([Id])
);
GO

-- =============================================
-- 24. جدول الإشعارات (Notifications)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
CREATE TABLE [Notifications] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [UserId] INT NOT NULL,
    [Title] NVARCHAR(200) NOT NULL,
    [TitleEn] NVARCHAR(200) NULL,
    [Message] NVARCHAR(MAX) NOT NULL,
    [Body] NVARCHAR(MAX) NULL,
    [BodyEn] NVARCHAR(MAX) NULL,
    [Type] NVARCHAR(50) NOT NULL DEFAULT 'info',
    [Icon] NVARCHAR(50) NULL,
    [EntityType] NVARCHAR(50) NULL,
    [EntityId] INT NULL,
    [ActionUrl] NVARCHAR(500) NULL,
    [IsRead] BIT NOT NULL DEFAULT 0,
    [ReadAt] DATETIME2 NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [ExpiresAt] DATETIME2 NULL,
    CONSTRAINT [FK_Notifications_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Notifications_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id])
);
GO

-- =============================================
-- 25. جدول الرسائل (Messages)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Messages')
CREATE TABLE [Messages] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [UserId] INT NOT NULL,
    [SenderId] INT NOT NULL,
    [ReceiverId] INT NOT NULL,
    [FromUserId] INT NULL,
    [Subject] NVARCHAR(200) NULL,
    [Content] NVARCHAR(MAX) NOT NULL,
    [Body] NVARCHAR(MAX) NULL,
    [Type] NVARCHAR(50) NOT NULL DEFAULT 'message',
    [Priority] NVARCHAR(20) NULL DEFAULT 'Normal',
    [IsRead] BIT NOT NULL DEFAULT 0,
    [ReadAt] DATETIME2 NULL,
    [ParentMessageId] INT NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_Messages_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Messages_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Messages_Sender] FOREIGN KEY ([SenderId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Messages_Receiver] FOREIGN KEY ([ReceiverId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Messages_FromUser] FOREIGN KEY ([FromUserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Messages_Parent] FOREIGN KEY ([ParentMessageId]) REFERENCES [Messages]([Id])
);
GO

-- =============================================
-- 26. جدول سجل النشاطات (ActivityLogs)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ActivityLogs')
CREATE TABLE [ActivityLogs] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [UserId] INT NOT NULL,
    [Action] NVARCHAR(100) NOT NULL,
    [EntityType] NVARCHAR(50) NULL,
    [EntityId] INT NULL,
    [EntityName] NVARCHAR(200) NULL,
    [Description] NVARCHAR(MAX) NULL,
    [DescriptionEn] NVARCHAR(MAX) NULL,
    [OldValues] NVARCHAR(MAX) NULL,
    [NewValues] NVARCHAR(MAX) NULL,
    [IpAddress] NVARCHAR(50) NULL,
    [UserAgent] NVARCHAR(500) NULL,
    [Browser] NVARCHAR(200) NULL,
    [Platform] NVARCHAR(100) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_ActivityLogs_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_ActivityLogs_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id])
);
GO

-- =============================================
-- جداول إضافية
-- =============================================

-- جدول الوسوم (Tags)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tags')
CREATE TABLE [Tags] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Color] NVARCHAR(50) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_Tags_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- جدول ربط الوسوم (EntityTags)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EntityTags')
CREATE TABLE [EntityTags] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [TagId] INT NOT NULL,
    [EntityType] NVARCHAR(50) NOT NULL,
    [EntityId] INT NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_EntityTags_Tags] FOREIGN KEY ([TagId]) REFERENCES [Tags]([Id]) ON DELETE CASCADE
);
GO

-- جدول التعليقات (Comments)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Comments')
CREATE TABLE [Comments] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [UserId] INT NOT NULL,
    [EntityType] NVARCHAR(50) NOT NULL,
    [EntityId] INT NOT NULL,
    [Content] NVARCHAR(MAX) NOT NULL,
    [ParentCommentId] INT NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    CONSTRAINT [FK_Comments_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Comments_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Comments_Parent] FOREIGN KEY ([ParentCommentId]) REFERENCES [Comments]([Id])
);
GO

-- جدول المرفقات (Attachments)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Attachments')
CREATE TABLE [Attachments] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [EntityType] NVARCHAR(50) NOT NULL,
    [EntityId] INT NOT NULL,
    [FileName] NVARCHAR(200) NOT NULL,
    [FileUrl] NVARCHAR(500) NOT NULL,
    [FileSize] BIGINT NOT NULL DEFAULT 0,
    [MimeType] NVARCHAR(100) NULL,
    [UploadedByUserId] INT NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_Attachments_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- جدول المدفوعات (Payments)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Payments')
CREATE TABLE [Payments] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [CustomerId] INT NULL,
    [InvoiceId] INT NULL,
    [PaymentNumber] NVARCHAR(50) NOT NULL,
    [PaymentType] INT NOT NULL DEFAULT 0,
    [PaymentMethod] INT NOT NULL DEFAULT 0,
    [Amount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [PaymentDate] DATETIME2 NOT NULL,
    [ReferenceNumber] NVARCHAR(100) NULL,
    [BankName] NVARCHAR(100) NULL,
    [CheckNumber] NVARCHAR(50) NULL,
    [CheckDate] DATETIME2 NULL,
    [Description] NVARCHAR(500) NULL,
    [Status] INT NOT NULL DEFAULT 0,
    [Notes] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    CONSTRAINT [FK_Payments_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Payments_Customers] FOREIGN KEY ([CustomerId]) REFERENCES [Customers]([Id]),
    CONSTRAINT [FK_Payments_Invoices] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices]([Id])
);
GO

-- جدول الخطط (Plans)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Plans')
CREATE TABLE [Plans] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Code] NVARCHAR(50) NOT NULL UNIQUE,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [Description] NVARCHAR(500) NULL,
    [DescriptionEn] NVARCHAR(500) NULL,
    [MonthlyPrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [YearlyPrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [MaxUsers] INT NOT NULL DEFAULT 1,
    [MaxProducts] INT NOT NULL DEFAULT 100,
    [MaxCustomers] INT NOT NULL DEFAULT 100,
    [MaxInvoicesPerMonth] INT NOT NULL DEFAULT 100,
    [MaxStorageMB] INT NOT NULL DEFAULT 100,
    [Features] NVARCHAR(MAX) NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [SortOrder] INT NOT NULL DEFAULT 0,
    [Color] NVARCHAR(50) NULL,
    [Icon] NVARCHAR(50) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

PRINT N'✓ تم إنشاء جميع الجداول';
GO

-- =============================================
-- الخطوة 3: إنشاء الفهارس
-- =============================================
PRINT N'جاري إنشاء الفهارس...';
GO

-- فهارس المستخدمين
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_AccountId')
    CREATE INDEX IX_Users_AccountId ON Users(AccountId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Username')
    CREATE INDEX IX_Users_Username ON Users(Username);
GO

-- فهارس المنتجات
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_AccountId')
    CREATE INDEX IX_Products_AccountId ON Products(AccountId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_Code')
    CREATE INDEX IX_Products_Code ON Products(Code);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_Barcode')
    CREATE INDEX IX_Products_Barcode ON Products(Barcode);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_AccountId_Name')
    CREATE INDEX IX_Products_AccountId_Name ON Products(AccountId, Name);
GO

-- فهارس العملاء
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Customers_AccountId')
    CREATE INDEX IX_Customers_AccountId ON Customers(AccountId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Customers_Code')
    CREATE INDEX IX_Customers_Code ON Customers(Code);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Customers_AccountId_Name')
    CREATE INDEX IX_Customers_AccountId_Name ON Customers(AccountId, Name);
GO

-- فهارس الفواتير
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Invoices_AccountId')
    CREATE INDEX IX_Invoices_AccountId ON Invoices(AccountId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Invoices_InvoiceNumber')
    CREATE INDEX IX_Invoices_InvoiceNumber ON Invoices(InvoiceNumber);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Invoices_CustomerId')
    CREATE INDEX IX_Invoices_CustomerId ON Invoices(CustomerId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Invoices_InvoiceDate')
    CREATE INDEX IX_Invoices_InvoiceDate ON Invoices(InvoiceDate);
GO

-- فهارس المصروفات
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Expenses_AccountId')
    CREATE INDEX IX_Expenses_AccountId ON Expenses(AccountId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Expenses_ExpenseDate')
    CREATE INDEX IX_Expenses_ExpenseDate ON Expenses(ExpenseDate);
GO

-- فهارس الإشعارات
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Notifications_UserId')
    CREATE INDEX IX_Notifications_UserId ON Notifications(UserId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Notifications_IsRead')
    CREATE INDEX IX_Notifications_IsRead ON Notifications(IsRead);
GO

-- فهارس سجل النشاطات
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ActivityLogs_AccountId')
    CREATE INDEX IX_ActivityLogs_AccountId ON ActivityLogs(AccountId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ActivityLogs_UserId')
    CREATE INDEX IX_ActivityLogs_UserId ON ActivityLogs(UserId);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ActivityLogs_CreatedAt')
    CREATE INDEX IX_ActivityLogs_CreatedAt ON ActivityLogs(CreatedAt DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ActivityLogs_AccountId_CreatedAt')
    CREATE INDEX IX_ActivityLogs_AccountId_CreatedAt ON ActivityLogs(AccountId, CreatedAt DESC);
GO

PRINT N'✓ تم إنشاء الفهارس';
GO

-- =============================================
-- ملخص الجداول
-- =============================================
PRINT N'';
PRINT N'=============================================';
PRINT N'ملخص هيكل قاعدة البيانات:';
PRINT N'=============================================';

SELECT 
    COUNT(*) AS [عدد الجداول]
FROM sys.tables;

SELECT 
    t.name AS [اسم الجدول],
    (SELECT COUNT(*) FROM sys.columns c WHERE c.object_id = t.object_id) AS [عدد الأعمدة]
FROM sys.tables t
ORDER BY t.name;
GO

PRINT N'';
PRINT N'=============================================';
PRINT N'تم إنشاء هيكل قاعدة البيانات بنجاح! ✓';
PRINT N'تاريخ: 2026-01-27';
PRINT N'=============================================';
PRINT N'';
PRINT N'الخطوة التالية:';
PRINT N'قم بتنفيذ ملف BaseData_ForServer.sql لإدخال البيانات الأساسية';
PRINT N'=============================================';
GO
