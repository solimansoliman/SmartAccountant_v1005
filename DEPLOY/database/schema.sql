-- =====================================
-- سكريبت إنشاء قاعدة البيانات SmartAccountant_v1005_DB
-- الهيكل (Schema) - الجداول والعلاقات
-- تاريخ التصدير: 2026-01-03
-- =====================================

-- إنشاء قاعدة البيانات إذا لم تكن موجودة
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'SmartAccountant_v1005_DB')
BEGIN
    CREATE DATABASE [SmartAccountant_v1005_DB]
    COLLATE Arabic_CI_AS;
END
GO

USE [SmartAccountant_v1005_DB];
GO

-- =====================================
-- 1. الجداول الأساسية (بدون علاقات خارجية)
-- =====================================

-- جدول العملات
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Currencies')
CREATE TABLE [Currencies] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Code] NVARCHAR(10) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [Symbol] NVARCHAR(10) NOT NULL,
    [ExchangeRate] DECIMAL(18,6) NOT NULL DEFAULT 1,
    [IsDefault] BIT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- جدول الحسابات (الشركات)
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
    [CurrencyId] INT NULL,
    [SubscriptionType] INT NOT NULL DEFAULT 0,
    [SubscriptionExpiry] DATETIME2 NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [Notes] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    CONSTRAINT [FK_Accounts_Currencies] FOREIGN KEY ([CurrencyId]) REFERENCES [Currencies]([Id])
);
GO

-- جدول المستخدمين
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
CREATE TABLE [Users] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NULL,
    [Username] NVARCHAR(100) NOT NULL,
    [Email] NVARCHAR(200) NOT NULL,
    [PasswordHash] NVARCHAR(500) NOT NULL,
    [FullName] NVARCHAR(200) NOT NULL,
    [Phone] NVARCHAR(50) NULL,
    [Avatar] NVARCHAR(500) NULL,
    [RoleType] INT NOT NULL DEFAULT 0,
    [JobTitle] NVARCHAR(100) NULL,
    [Department] NVARCHAR(100) NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [IsSuperAdmin] BIT NOT NULL DEFAULT 0,
    [Language] NVARCHAR(10) NOT NULL DEFAULT 'ar',
    [Timezone] NVARCHAR(100) NULL DEFAULT 'Asia/Riyadh',
    [LastLoginAt] DATETIME2 NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    CONSTRAINT [FK_Users_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- جدول الأدوار
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
CREATE TABLE [Roles] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [Description] NVARCHAR(500) NULL,
    [IsSystemRole] BIT NOT NULL DEFAULT 0,
    [Color] NVARCHAR(50) NULL,
    [Icon] NVARCHAR(100) NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_Roles_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- جدول صلاحيات المستخدمين
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserRoles')
CREATE TABLE [UserRoles] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [UserId] INT NOT NULL,
    [RoleId] INT NOT NULL,
    [AssignedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [AssignedByUserId] INT NULL,
    CONSTRAINT [FK_UserRoles_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserRoles_Roles] FOREIGN KEY ([RoleId]) REFERENCES [Roles]([Id]) ON DELETE CASCADE
);
GO

-- جدول الصلاحيات
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Permissions')
CREATE TABLE [Permissions] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Code] NVARCHAR(100) NOT NULL UNIQUE,
    [Name] NVARCHAR(200) NOT NULL,
    [NameEn] NVARCHAR(200) NULL,
    [Description] NVARCHAR(500) NULL,
    [Module] NVARCHAR(100) NULL,
    [IsActive] BIT NOT NULL DEFAULT 1
);
GO

-- جدول صلاحيات الأدوار
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RolePermissions')
CREATE TABLE [RolePermissions] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [RoleId] INT NOT NULL,
    [PermissionId] INT NOT NULL,
    [AssignedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_RolePermissions_Roles] FOREIGN KEY ([RoleId]) REFERENCES [Roles]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RolePermissions_Permissions] FOREIGN KEY ([PermissionId]) REFERENCES [Permissions]([Id]) ON DELETE CASCADE
);
GO

-- جدول إعدادات النظام
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemSettings')
CREATE TABLE [SystemSettings] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Key] NVARCHAR(100) NOT NULL,
    [Value] NVARCHAR(MAX) NULL,
    [Description] NVARCHAR(500) NULL,
    [UpdatedAt] DATETIME2 NULL,
    CONSTRAINT [FK_SystemSettings_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- جدول القائمة
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MenuItems')
CREATE TABLE [MenuItems] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [ParentId] INT NULL,
    [Title] NVARCHAR(100) NOT NULL,
    [TitleEn] NVARCHAR(100) NULL,
    [Icon] NVARCHAR(100) NULL,
    [Path] NVARCHAR(200) NULL,
    [PermissionCode] NVARCHAR(100) NULL,
    [SortOrder] INT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [FK_MenuItems_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_MenuItems_Parent] FOREIGN KEY ([ParentId]) REFERENCES [MenuItems]([Id])
);
GO

-- جدول الوسوم
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

-- جدول أنواع المعاملات
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TransactionTypes')
CREATE TABLE [TransactionTypes] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Code] NVARCHAR(50) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [Description] NVARCHAR(500) NULL,
    [IsSystem] BIT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [FK_TransactionTypes_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- جدول تصنيفات المنتجات
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductCategories')
CREATE TABLE [ProductCategories] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [ParentCategoryId] INT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [FK_ProductCategories_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_ProductCategories_Parent] FOREIGN KEY ([ParentCategoryId]) REFERENCES [ProductCategories]([Id])
);
GO

-- جدول الوحدات
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Units')
CREATE TABLE [Units] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Name] NVARCHAR(50) NOT NULL,
    [NameEn] NVARCHAR(50) NULL,
    [Symbol] NVARCHAR(20) NULL,
    [IsBase] BIT NOT NULL DEFAULT 0,
    [BaseUnitId] INT NULL,
    [ConversionFactor] DECIMAL(18,6) NOT NULL DEFAULT 1,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [CreatedByUserId] INT NULL,
    CONSTRAINT [FK_Units_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Units_BaseUnit] FOREIGN KEY ([BaseUnitId]) REFERENCES [Units]([Id])
);
GO

-- جدول المنتجات
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
CREATE TABLE [Products] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [CategoryId] INT NULL,
    [UnitId] INT NULL,
    [Code] NVARCHAR(50) NULL,
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
    CONSTRAINT [FK_Products_Units] FOREIGN KEY ([UnitId]) REFERENCES [Units]([Id])
);
GO

-- جدول وحدات المنتج
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

-- جدول أرقام الهاتف
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
    [VerifiedAt] DATETIME2 NULL,
    [IsWhatsApp] BIT NOT NULL DEFAULT 0,
    [IsTelegram] BIT NOT NULL DEFAULT 0,
    [CanReceiveSMS] BIT NOT NULL DEFAULT 1,
    [CanReceiveCalls] BIT NOT NULL DEFAULT 1,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [Notes] NVARCHAR(500) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    CONSTRAINT [FK_PhoneNumbers_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- جدول البريد الإلكتروني
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
    [VerifiedAt] DATETIME2 NULL,
    [VerificationToken] NVARCHAR(200) NULL,
    [VerificationExpiry] DATETIME2 NULL,
    [CanReceiveInvoices] BIT NOT NULL DEFAULT 1,
    [CanReceiveNotifications] BIT NOT NULL DEFAULT 1,
    [CanReceiveMarketing] BIT NOT NULL DEFAULT 0,
    [UnsubscribedAt] DATETIME2 NULL,
    [BounceCount] INT NOT NULL DEFAULT 0,
    [LastBounceAt] DATETIME2 NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [Notes] NVARCHAR(500) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    CONSTRAINT [FK_Emails_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- جدول العملاء
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers')
CREATE TABLE [Customers] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [CurrencyId] INT NULL,
    [PrimaryPhoneId] INT NULL,
    [SecondaryPhoneId] INT NULL,
    [PrimaryEmailId] INT NULL,
    [PriceListId] INT NULL,
    [Code] NVARCHAR(50) NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [NameEn] NVARCHAR(200) NULL,
    [Type] INT NOT NULL DEFAULT 0,
    [CustomerGroup] NVARCHAR(100) NULL,
    [TaxNumber] NVARCHAR(50) NULL,
    [CommercialRegister] NVARCHAR(50) NULL,
    [ContactPerson] NVARCHAR(200) NULL,
    [Address] NVARCHAR(500) NULL,
    [Address2] NVARCHAR(500) NULL,
    [City] NVARCHAR(100) NULL,
    [State] NVARCHAR(100) NULL,
    [Country] NVARCHAR(100) NULL,
    [PostalCode] NVARCHAR(20) NULL,
    [Website] NVARCHAR(200) NULL,
    [CreditLimit] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [Balance] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [DiscountPercent] DECIMAL(5,2) NOT NULL DEFAULT 0,
    [PaymentTerms] INT NOT NULL DEFAULT 0,
    [Rating] INT NOT NULL DEFAULT 0,
    [IsVIP] BIT NOT NULL DEFAULT 0,
    [TotalPurchases] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [TotalPayments] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [InvoiceCount] INT NOT NULL DEFAULT 0,
    [LastPurchaseDate] DATETIME2 NULL,
    [LastPaymentDate] DATETIME2 NULL,
    [JoinDate] DATETIME2 NULL,
    [BirthDate] DATETIME2 NULL,
    [Notes] NVARCHAR(MAX) NULL,
    [InternalNotes] NVARCHAR(MAX) NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [DeletedAt] DATETIME2 NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    [UpdatedByUserId] INT NULL,
    CONSTRAINT [FK_Customers_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Customers_Currencies] FOREIGN KEY ([CurrencyId]) REFERENCES [Currencies]([Id]),
    CONSTRAINT [FK_Customers_PrimaryPhone] FOREIGN KEY ([PrimaryPhoneId]) REFERENCES [PhoneNumbers]([Id]),
    CONSTRAINT [FK_Customers_SecondaryPhone] FOREIGN KEY ([SecondaryPhoneId]) REFERENCES [PhoneNumbers]([Id]),
    CONSTRAINT [FK_Customers_PrimaryEmail] FOREIGN KEY ([PrimaryEmailId]) REFERENCES [Emails]([Id])
);
GO

-- جدول الفواتير
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Invoices')
CREATE TABLE [Invoices] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [CustomerId] INT NULL,
    [UserId] INT NULL,
    [InvoiceNumber] NVARCHAR(50) NOT NULL,
    [InvoiceType] INT NOT NULL DEFAULT 0,
    [InvoiceDate] DATETIME2 NOT NULL,
    [DueDate] DATETIME2 NULL,
    [SubTotal] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [DiscountPercent] DECIMAL(5,2) NOT NULL DEFAULT 0,
    [DiscountAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [TotalAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [PaidAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [PaymentMethod] INT NOT NULL DEFAULT 0,
    [Status] INT NOT NULL DEFAULT 0,
    [Notes] NVARCHAR(MAX) NULL,
    [QrCode] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    [UpdatedByUserId] INT NULL,
    CONSTRAINT [FK_Invoices_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Invoices_Customers] FOREIGN KEY ([CustomerId]) REFERENCES [Customers]([Id]),
    CONSTRAINT [FK_Invoices_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id])
);
GO

-- جدول أصناف الفاتورة
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InvoiceItems')
CREATE TABLE [InvoiceItems] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [InvoiceId] INT NOT NULL,
    [ProductId] INT NULL,
    [UnitId] INT NULL,
    [ProductName] NVARCHAR(200) NOT NULL,
    [Quantity] DECIMAL(18,3) NOT NULL DEFAULT 1,
    [UnitPrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [DiscountPercent] DECIMAL(5,2) NOT NULL DEFAULT 0,
    [DiscountAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [TaxPercent] DECIMAL(5,2) NOT NULL DEFAULT 0,
    [TaxAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [LineTotal] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [Notes] NVARCHAR(500) NULL,
    CONSTRAINT [FK_InvoiceItems_Invoices] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_InvoiceItems_Products] FOREIGN KEY ([ProductId]) REFERENCES [Products]([Id]),
    CONSTRAINT [FK_InvoiceItems_Units] FOREIGN KEY ([UnitId]) REFERENCES [Units]([Id])
);
GO

-- جدول المدفوعات
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

-- جدول تصنيفات المصروفات
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ExpenseCategories')
CREATE TABLE [ExpenseCategories] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [FK_ExpenseCategories_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- جدول المصروفات
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Expenses')
CREATE TABLE [Expenses] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [CategoryId] INT NULL,
    [ExpenseNumber] NVARCHAR(50) NULL,
    [Description] NVARCHAR(500) NOT NULL,
    [Amount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [ExpenseDate] DATETIME2 NOT NULL,
    [PaymentMethod] INT NOT NULL DEFAULT 0,
    [ReferenceNumber] NVARCHAR(100) NULL,
    [Vendor] NVARCHAR(200) NULL,
    [Notes] NVARCHAR(MAX) NULL,
    [AttachmentUrl] NVARCHAR(500) NULL,
    [Status] INT NOT NULL DEFAULT 0,
    [ExchangeRate] DECIMAL(18,6) NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    CONSTRAINT [FK_Expenses_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Expenses_Categories] FOREIGN KEY ([CategoryId]) REFERENCES [ExpenseCategories]([Id])
);
GO

-- جدول تصنيفات الإيرادات
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RevenueCategories')
CREATE TABLE [RevenueCategories] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [NameEn] NVARCHAR(100) NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [FK_RevenueCategories_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id])
);
GO

-- جدول الإيرادات
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Revenues')
CREATE TABLE [Revenues] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [CategoryId] INT NULL,
    [RevenueNumber] NVARCHAR(50) NULL,
    [Description] NVARCHAR(500) NOT NULL,
    [Amount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [RevenueDate] DATETIME2 NOT NULL,
    [PaymentMethod] INT NOT NULL DEFAULT 0,
    [ReferenceNumber] NVARCHAR(100) NULL,
    [Source] NVARCHAR(200) NULL,
    [Notes] NVARCHAR(MAX) NULL,
    [Status] INT NOT NULL DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [CreatedByUserId] INT NULL,
    CONSTRAINT [FK_Revenues_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Revenues_Categories] FOREIGN KEY ([CategoryId]) REFERENCES [RevenueCategories]([Id])
);
GO

-- جدول الرسائل
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Messages')
CREATE TABLE [Messages] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [UserId] INT NOT NULL,
    [SenderId] INT NOT NULL,
    [ReceiverId] INT NOT NULL,
    [Subject] NVARCHAR(200) NULL,
    [Content] NVARCHAR(MAX) NOT NULL,
    [IsRead] BIT NOT NULL DEFAULT 0,
    [ReadAt] DATETIME2 NULL,
    [ParentMessageId] INT NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_Messages_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Messages_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Messages_Sender] FOREIGN KEY ([SenderId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Messages_Receiver] FOREIGN KEY ([ReceiverId]) REFERENCES [Users]([Id]),
    CONSTRAINT [FK_Messages_Parent] FOREIGN KEY ([ParentMessageId]) REFERENCES [Messages]([Id])
);
GO

-- جدول الإشعارات
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
CREATE TABLE [Notifications] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [AccountId] INT NOT NULL,
    [UserId] INT NOT NULL,
    [Title] NVARCHAR(200) NOT NULL,
    [Message] NVARCHAR(MAX) NOT NULL,
    [Type] INT NOT NULL DEFAULT 0,
    [EntityType] NVARCHAR(50) NULL,
    [EntityId] INT NULL,
    [ActionUrl] NVARCHAR(500) NULL,
    [IsRead] BIT NOT NULL DEFAULT 0,
    [ReadAt] DATETIME2 NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_Notifications_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_Notifications_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id])
);
GO

-- جدول التعليقات
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

-- جدول المرفقات
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

-- جدول ربط الوسوم بالكيانات
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

-- جدول سجل النشاط
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
    [IpAddress] NVARCHAR(50) NULL,
    [Browser] NVARCHAR(200) NULL,
    [Platform] NVARCHAR(100) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_ActivityLogs_Accounts] FOREIGN KEY ([AccountId]) REFERENCES [Accounts]([Id]),
    CONSTRAINT [FK_ActivityLogs_Users] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id])
);
GO

-- =====================================
-- إنشاء الفهارس
-- =====================================

-- فهارس الفواتير
CREATE UNIQUE INDEX [IX_Invoices_AccountId_InvoiceNumber] ON [Invoices]([AccountId], [InvoiceNumber]);
GO

-- فهارس العملاء
CREATE INDEX [IX_Customers_AccountId_Name] ON [Customers]([AccountId], [Name]);
CREATE INDEX [IX_Customers_AccountId_Code] ON [Customers]([AccountId], [Code]);
GO

-- فهارس المنتجات
CREATE INDEX [IX_Products_AccountId_Name] ON [Products]([AccountId], [Name]);
CREATE INDEX [IX_Products_AccountId_Code] ON [Products]([AccountId], [Code]);
GO

-- فهارس سجل النشاط
CREATE INDEX [IX_ActivityLogs_AccountId_CreatedAt] ON [ActivityLogs]([AccountId], [CreatedAt] DESC);
GO

PRINT N'تم إنشاء هيكل قاعدة البيانات بنجاح!';
GO
