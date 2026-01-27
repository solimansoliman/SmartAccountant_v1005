-- =============================================
-- Smart Accountant - Base Setup Script
-- قاعدة بيانات فارغة مع البيانات الأساسية فقط
-- =============================================
-- 
-- هذا الملف يقوم بـ:
-- 1. إنشاء قاعدة البيانات والجداول
-- 2. إدخال البيانات الأساسية (عملات، صلاحيات، أدوار، قوائم)
-- 3. إنشاء حساب الأدمن فقط
--
-- بيانات الدخول:
--   Username: admin
--   Password: admin123
-- =============================================

PRINT N'=============================================';
PRINT N'Smart Accountant - Base Setup';
PRINT N'Version: 1.0 | Date: 2025-12-31';
PRINT N'=============================================';
GO

-- =============================================
-- الخطوة 1: إنشاء قاعدة البيانات
-- =============================================
USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = N'SmartAccountant_v1005_DB')
BEGIN
    PRINT N'حذف قاعدة البيانات القديمة...';
    ALTER DATABASE SmartAccountant_v1005_DB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE SmartAccountant_v1005_DB;
END
GO

CREATE DATABASE SmartAccountant_v1005_DB;
GO

USE SmartAccountant_v1005_DB;
GO

PRINT N'تم إنشاء قاعدة البيانات بنجاح!';
GO

-- =============================================
-- الخطوة 2: إنشاء الجداول
-- =============================================
PRINT N'جاري إنشاء الجداول...';
GO

-- جدول العملات
CREATE TABLE Currencies (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Code NVARCHAR(10) NOT NULL,
    Name NVARCHAR(50) NOT NULL,
    NameEn NVARCHAR(50),
    Symbol NVARCHAR(10) NOT NULL,
    Country NVARCHAR(100),
    CountryCode NVARCHAR(5),
    Flag NVARCHAR(20),
    ExchangeRate DECIMAL(18,6) NOT NULL DEFAULT 1,
    DecimalPlaces INT NOT NULL DEFAULT 2,
    SubUnit NVARCHAR(50),
    IsDefault BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1
);

-- جدول الحسابات (الشركات)
CREATE TABLE Accounts (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    NameEn NVARCHAR(200),
    Email NVARCHAR(100),
    Phone NVARCHAR(20),
    Address NVARCHAR(500),
    LogoUrl NVARCHAR(500),
    TaxNumber NVARCHAR(50),
    CurrencyId INT NOT NULL,
    CurrencySymbol NVARCHAR(10) NOT NULL DEFAULT N'ج.م',
    [Plan] INT NOT NULL DEFAULT 0,
    SubscriptionExpiry DATETIME2,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_Accounts_Currencies FOREIGN KEY (CurrencyId) REFERENCES Currencies(Id)
);

-- جدول المستخدمين
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    Username NVARCHAR(50) NOT NULL,
    PasswordHash NVARCHAR(500) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100),
    Phone NVARCHAR(20),
    AvatarUrl NVARCHAR(500),
    JobTitle NVARCHAR(100),
    Department NVARCHAR(100),
    RoleType INT NOT NULL DEFAULT 0,
    IsSuperAdmin BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    EmailVerified BIT NOT NULL DEFAULT 0,
    PhoneVerified BIT NOT NULL DEFAULT 0,
    PreferredLanguage NVARCHAR(10) DEFAULT 'ar',
    TimeZone NVARCHAR(50) DEFAULT 'Africa/Cairo',
    FailedLoginAttempts INT NOT NULL DEFAULT 0,
    LockoutEnd DATETIME2,
    LastLoginAt DATETIME2,
    LastLoginIp NVARCHAR(50),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CanManageProducts BIT NOT NULL DEFAULT 0,
    CanManageCustomers BIT NOT NULL DEFAULT 0,
    CanCreateInvoices BIT NOT NULL DEFAULT 0,
    CanManageExpenses BIT NOT NULL DEFAULT 0,
    CanViewReports BIT NOT NULL DEFAULT 0,
    CanManageSettings BIT NOT NULL DEFAULT 0,
    CanManageUsers BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_Users_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT UQ_Users_AccountId_Username UNIQUE (AccountId, Username)
);

-- جدول الصلاحيات
CREATE TABLE Permissions (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Code NVARCHAR(100) NOT NULL UNIQUE,
    Name NVARCHAR(100) NOT NULL,
    NameEn NVARCHAR(100),
    [Description] NVARCHAR(500),
    Module NVARCHAR(50) NOT NULL,
    [Type] INT NOT NULL DEFAULT 0,
    SortOrder INT NOT NULL DEFAULT 0
);

-- جدول الأدوار
CREATE TABLE Roles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    NameEn NVARCHAR(100),
    [Description] NVARCHAR(500),
    Color NVARCHAR(20) DEFAULT '#3B82F6',
    Icon NVARCHAR(50) DEFAULT 'shield',
    IsSystemRole BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_Roles_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT UQ_Roles_AccountId_Name UNIQUE (AccountId, Name)
);

-- جدول صلاحيات الأدوار
CREATE TABLE RolePermissions (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    RoleId INT NOT NULL,
    PermissionId INT NOT NULL,
    CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE,
    CONSTRAINT FK_RolePermissions_Permissions FOREIGN KEY (PermissionId) REFERENCES Permissions(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_RolePermissions_RoleId_PermissionId UNIQUE (RoleId, PermissionId)
);

-- جدول أدوار المستخدمين
CREATE TABLE UserRoles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    RoleId INT NOT NULL,
    AssignedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    AssignedByUserId INT,
    CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE,
    CONSTRAINT FK_UserRoles_AssignedBy FOREIGN KEY (AssignedByUserId) REFERENCES Users(Id),
    CONSTRAINT UQ_UserRoles_UserId_RoleId UNIQUE (UserId, RoleId)
);

-- جدول عناصر القائمة
CREATE TABLE MenuItems (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Code NVARCHAR(50) NOT NULL UNIQUE,
    Title NVARCHAR(100) NOT NULL,
    TitleEn NVARCHAR(100),
    Icon NVARCHAR(50),
    [Path] NVARCHAR(200),
    ParentId INT,
    SortOrder INT NOT NULL DEFAULT 0,
    RequiredPermission NVARCHAR(100),
    ShowInSidebar BIT NOT NULL DEFAULT 1,
    ShowInHeader BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT FK_MenuItems_Parent FOREIGN KEY (ParentId) REFERENCES MenuItems(Id)
);

-- جدول الوحدات
CREATE TABLE Units (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    Name NVARCHAR(50) NOT NULL,
    NameEn NVARCHAR(50),
    Symbol NVARCHAR(10) NOT NULL,
    IsBase BIT NOT NULL DEFAULT 0,
    BaseUnitId INT,
    ConversionFactor DECIMAL(18,6) NOT NULL DEFAULT 1,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedByUserId INT,
    CONSTRAINT FK_Units_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT FK_Units_BaseUnit FOREIGN KEY (BaseUnitId) REFERENCES Units(Id),
    CONSTRAINT FK_Units_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id)
);

-- جدول تصنيفات المنتجات
CREATE TABLE ProductCategories (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    NameEn NVARCHAR(100),
    ParentCategoryId INT,
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT FK_ProductCategories_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT FK_ProductCategories_Parent FOREIGN KEY (ParentCategoryId) REFERENCES ProductCategories(Id)
);

-- جدول المنتجات
CREATE TABLE Products (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    Code NVARCHAR(50) NOT NULL,
    Barcode NVARCHAR(50),
    Name NVARCHAR(200) NOT NULL,
    NameEn NVARCHAR(200),
    [Description] NVARCHAR(MAX),
    CategoryId INT,
    CostPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    SellingPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    TaxPercent DECIMAL(5,2) NOT NULL DEFAULT 0,
    StockQuantity DECIMAL(18,3) NOT NULL DEFAULT 0,
    MinStockLevel DECIMAL(18,3) NOT NULL DEFAULT 0,
    ImageUrl NVARCHAR(500),
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2,
    CreatedByUserId INT,
    UpdatedByUserId INT,
    CONSTRAINT FK_Products_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId) REFERENCES ProductCategories(Id),
    CONSTRAINT FK_Products_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id),
    CONSTRAINT FK_Products_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES Users(Id)
);

-- جدول وحدات المنتجات
CREATE TABLE ProductUnits (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ProductId INT NOT NULL,
    UnitId INT NOT NULL,
    ConversionFactor DECIMAL(18,6) NOT NULL DEFAULT 1,
    Barcode NVARCHAR(50),
    CostPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    SellingPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    IsDefault BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_ProductUnits_Products FOREIGN KEY (ProductId) REFERENCES Products(Id) ON DELETE CASCADE,
    CONSTRAINT FK_ProductUnits_Units FOREIGN KEY (UnitId) REFERENCES Units(Id)
);

-- جدول العملاء
CREATE TABLE Customers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    Code NVARCHAR(50) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    NameEn NVARCHAR(200),
    Email NVARCHAR(100),
    Phone NVARCHAR(20),
    Phone2 NVARCHAR(20),
    Address NVARCHAR(500),
    City NVARCHAR(100),
    TaxNumber NVARCHAR(50),
    [Type] NVARCHAR(20) NOT NULL DEFAULT 'customer',
    Balance DECIMAL(18,2) NOT NULL DEFAULT 0,
    CreditLimit DECIMAL(18,2) NOT NULL DEFAULT 0,
    PriceListId INT,
    Notes NVARCHAR(MAX),
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2,
    CreatedByUserId INT,
    UpdatedByUserId INT,
    CONSTRAINT FK_Customers_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT FK_Customers_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id),
    CONSTRAINT FK_Customers_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES Users(Id)
);

-- جدول تصنيفات المصروفات
CREATE TABLE ExpenseCategories (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    Code NVARCHAR(50),
    Name NVARCHAR(100) NOT NULL,
    NameEn NVARCHAR(100),
    ParentCategoryId INT,
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT FK_ExpenseCategories_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT FK_ExpenseCategories_Parent FOREIGN KEY (ParentCategoryId) REFERENCES ExpenseCategories(Id)
);

-- جدول تصنيفات الإيرادات
CREATE TABLE RevenueCategories (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    Code NVARCHAR(50),
    Name NVARCHAR(100) NOT NULL,
    NameEn NVARCHAR(100),
    ParentCategoryId INT,
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT FK_RevenueCategories_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT FK_RevenueCategories_Parent FOREIGN KEY (ParentCategoryId) REFERENCES RevenueCategories(Id)
);

-- جدول أنواع المعاملات
CREATE TABLE TransactionTypes (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    Code NVARCHAR(50) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    NameEn NVARCHAR(100),
    Category NVARCHAR(50) NOT NULL,
    Icon NVARCHAR(50),
    Color NVARCHAR(20),
    IsIncome BIT NOT NULL DEFAULT 0,
    IsExpense BIT NOT NULL DEFAULT 0,
    IsSystemType BIT NOT NULL DEFAULT 0,
    SortOrder INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT FK_TransactionTypes_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id)
);

-- جدول الفواتير
CREATE TABLE Invoices (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    InvoiceNumber NVARCHAR(50) NOT NULL,
    [Type] NVARCHAR(20) NOT NULL DEFAULT 'sale',
    CustomerId INT,
    InvoiceDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    DueDate DATETIME2,
    Subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
    TaxAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    PaidAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    [Status] NVARCHAR(20) NOT NULL DEFAULT 'draft',
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2,
    CreatedByUserId INT,
    UpdatedByUserId INT,
    CONSTRAINT FK_Invoices_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT FK_Invoices_Customers FOREIGN KEY (CustomerId) REFERENCES Customers(Id),
    CONSTRAINT FK_Invoices_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id),
    CONSTRAINT FK_Invoices_UpdatedBy FOREIGN KEY (UpdatedByUserId) REFERENCES Users(Id)
);

-- جدول بنود الفواتير
CREATE TABLE InvoiceItems (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    InvoiceId INT NOT NULL,
    ProductId INT NOT NULL,
    UnitId INT,
    Quantity DECIMAL(18,3) NOT NULL DEFAULT 1,
    UnitPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    DiscountPercent DECIMAL(5,2) NOT NULL DEFAULT 0,
    DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    TaxPercent DECIMAL(5,2) NOT NULL DEFAULT 0,
    TaxAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    Notes NVARCHAR(500),
    CONSTRAINT FK_InvoiceItems_Invoices FOREIGN KEY (InvoiceId) REFERENCES Invoices(Id) ON DELETE CASCADE,
    CONSTRAINT FK_InvoiceItems_Products FOREIGN KEY (ProductId) REFERENCES Products(Id),
    CONSTRAINT FK_InvoiceItems_Units FOREIGN KEY (UnitId) REFERENCES Units(Id)
);

-- جدول المصروفات
CREATE TABLE Expenses (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    ExpenseNumber NVARCHAR(50),
    CategoryId INT,
    TransactionTypeId INT,
    Amount DECIMAL(18,2) NOT NULL,
    TaxAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    ExpenseDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [Description] NVARCHAR(500),
    Payee NVARCHAR(200),
    PaymentMethod NVARCHAR(50),
    ReferenceNumber NVARCHAR(100),
    AttachmentUrl NVARCHAR(500),
    Notes NVARCHAR(MAX),
    [Status] NVARCHAR(20) NOT NULL DEFAULT 'pending',
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedByUserId INT,
    ApprovedByUserId INT,
    ApprovedAt DATETIME2,
    CONSTRAINT FK_Expenses_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT FK_Expenses_Categories FOREIGN KEY (CategoryId) REFERENCES ExpenseCategories(Id),
    CONSTRAINT FK_Expenses_TransactionTypes FOREIGN KEY (TransactionTypeId) REFERENCES TransactionTypes(Id),
    CONSTRAINT FK_Expenses_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id),
    CONSTRAINT FK_Expenses_ApprovedBy FOREIGN KEY (ApprovedByUserId) REFERENCES Users(Id)
);

-- جدول الإيرادات
CREATE TABLE Revenues (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    RevenueNumber NVARCHAR(50),
    CategoryId INT,
    Amount DECIMAL(18,2) NOT NULL,
    RevenueDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [Description] NVARCHAR(500),
    Payer NVARCHAR(200),
    PaymentMethod NVARCHAR(50),
    ReferenceNumber NVARCHAR(100),
    AttachmentUrl NVARCHAR(500),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedByUserId INT,
    CONSTRAINT FK_Revenues_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT FK_Revenues_Categories FOREIGN KEY (CategoryId) REFERENCES RevenueCategories(Id),
    CONSTRAINT FK_Revenues_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id)
);

-- جدول الإشعارات
CREATE TABLE Notifications (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    UserId INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    TitleEn NVARCHAR(200),
    Body NVARCHAR(MAX),
    BodyEn NVARCHAR(MAX),
    [Type] NVARCHAR(50) NOT NULL DEFAULT 'info',
    Icon NVARCHAR(50),
    ActionUrl NVARCHAR(500),
    IsRead BIT NOT NULL DEFAULT 0,
    ReadAt DATETIME2,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt DATETIME2,
    CONSTRAINT FK_Notifications_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
);

-- جدول الرسائل
CREATE TABLE Messages (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    UserId INT NOT NULL,
    FromUserId INT,
    Subject NVARCHAR(200),
    Body NVARCHAR(MAX) NOT NULL,
    [Type] NVARCHAR(50) NOT NULL DEFAULT 'message',
    IsRead BIT NOT NULL DEFAULT 0,
    ReadAt DATETIME2,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_Messages_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT FK_Messages_Users FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_Messages_FromUser FOREIGN KEY (FromUserId) REFERENCES Users(Id)
);

-- جدول سجل النشاطات
CREATE TABLE ActivityLogs (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NOT NULL,
    UserId INT NOT NULL,
    Action NVARCHAR(100) NOT NULL,
    EntityType NVARCHAR(100),
    EntityId INT,
    [Description] NVARCHAR(500),
    DescriptionEn NVARCHAR(500),
    OldValues NVARCHAR(MAX),
    NewValues NVARCHAR(MAX),
    IpAddress NVARCHAR(50),
    UserAgent NVARCHAR(500),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_ActivityLogs_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT FK_ActivityLogs_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
);
GO

-- جدول إعدادات النظام
CREATE TABLE SystemSettings (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AccountId INT NULL, -- NULL = إعدادات عامة للنظام كله
    SettingKey NVARCHAR(100) NOT NULL,
    SettingValue NVARCHAR(MAX) NOT NULL,
    SettingType NVARCHAR(50) NOT NULL DEFAULT 'string', -- string, bool, int, json
    [Description] NVARCHAR(500),
    IsPublic BIT NOT NULL DEFAULT 0, -- هل يمكن للمستخدم العادي رؤيتها
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_SystemSettings_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id),
    CONSTRAINT UQ_SystemSettings_Key UNIQUE (AccountId, SettingKey)
);
GO

-- إنشاء الفهارس
CREATE INDEX IX_Users_AccountId ON Users(AccountId);
CREATE INDEX IX_Users_Username ON Users(Username);
CREATE INDEX IX_Products_AccountId ON Products(AccountId);
CREATE INDEX IX_Products_Code ON Products(Code);
CREATE INDEX IX_Products_Barcode ON Products(Barcode);
CREATE INDEX IX_Customers_AccountId ON Customers(AccountId);
CREATE INDEX IX_Customers_Code ON Customers(Code);
CREATE INDEX IX_Invoices_AccountId ON Invoices(AccountId);
CREATE INDEX IX_Invoices_InvoiceNumber ON Invoices(InvoiceNumber);
CREATE INDEX IX_Invoices_CustomerId ON Invoices(CustomerId);
CREATE INDEX IX_Invoices_InvoiceDate ON Invoices(InvoiceDate);
CREATE INDEX IX_Expenses_AccountId ON Expenses(AccountId);
CREATE INDEX IX_Expenses_ExpenseDate ON Expenses(ExpenseDate);
CREATE INDEX IX_Notifications_UserId ON Notifications(UserId);
CREATE INDEX IX_Notifications_IsRead ON Notifications(IsRead);
CREATE INDEX IX_ActivityLogs_AccountId ON ActivityLogs(AccountId);
CREATE INDEX IX_ActivityLogs_UserId ON ActivityLogs(UserId);
CREATE INDEX IX_ActivityLogs_CreatedAt ON ActivityLogs(CreatedAt);
GO

PRINT N'تم إنشاء جميع الجداول بنجاح!';
GO

-- =============================================
-- الخطوة 3: إدخال البيانات الأساسية
-- =============================================
PRINT N'جاري إدخال البيانات الأساسية...';
GO

-- =============================================
-- العملات
-- =============================================
SET IDENTITY_INSERT Currencies ON;

INSERT INTO Currencies (Id, Code, Name, NameEn, Symbol, Country, CountryCode, Flag, ExchangeRate, DecimalPlaces, SubUnit, IsDefault, IsActive)
VALUES 
(1, N'EGP', N'جنيه مصري', N'Egyptian Pound', N'ج.م', N'مصر', N'EG', N'🇪🇬', 1.000000, 2, N'قرش', 1, 1),
(2, N'SAR', N'ريال سعودي', N'Saudi Riyal', N'ر.س', N'السعودية', N'SA', N'🇸🇦', 8.250000, 2, N'هللة', 0, 1),
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
GO

-- =============================================
-- الصلاحيات
-- =============================================
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
(48, N'backup.restore', N'استعادة نسخة احتياطية', N'Restore Backup', N'backup', 2, N'استعادة من نسخة احتياطية', 131);

SET IDENTITY_INSERT Permissions OFF;
GO

-- =============================================
-- الحساب الافتراضي
-- =============================================
SET IDENTITY_INSERT Accounts ON;

INSERT INTO Accounts (Id, Name, NameEn, Email, Phone, CurrencyId, CurrencySymbol, [Plan], IsActive, CreatedAt, UpdatedAt)
VALUES (1, N'شركتي', N'My Company', N'info@mycompany.com', N'+201000000000', 1, N'ج.م', 0, 1, GETUTCDATE(), GETUTCDATE());

SET IDENTITY_INSERT Accounts OFF;
GO

-- =============================================
-- المستخدم الأدمن (كلمة المرور: admin123)
-- =============================================
SET IDENTITY_INSERT Users ON;

INSERT INTO Users (Id, AccountId, Username, PasswordHash, FullName, Email, RoleType, IsSuperAdmin, IsActive, 
    CanManageProducts, CanManageCustomers, CanCreateInvoices, CanManageExpenses, CanViewReports, CanManageSettings, CanManageUsers, CreatedAt)
VALUES 
(1, 1, N'admin', N'$2a$11$rBNM5H.OJ8FqSKA1qKu7XO8R0Y6Q8Z5Y1J4R5Y6Z7Q8R9S0T1U2V3', N'مدير النظام', N'admin@mycompany.com', 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, GETUTCDATE());

SET IDENTITY_INSERT Users OFF;
GO

-- =============================================
-- الأدوار الأساسية
-- =============================================
SET IDENTITY_INSERT Roles ON;

INSERT INTO Roles (Id, AccountId, Name, NameEn, [Description], Color, Icon, IsSystemRole, IsActive, CreatedAt)
VALUES 
(1, 1, N'مدير عام', N'General Manager', N'صلاحيات كاملة على النظام', N'#DC2626', N'crown', 1, 1, GETUTCDATE()),
(2, 1, N'مدير', N'Manager', N'صلاحيات إدارية', N'#EA580C', N'briefcase', 1, 1, GETUTCDATE()),
(3, 1, N'محاسب', N'Accountant', N'صلاحيات المحاسبة والمالية', N'#16A34A', N'calculator', 1, 1, GETUTCDATE()),
(4, 1, N'مبيعات', N'Sales', N'صلاحيات المبيعات', N'#2563EB', N'shopping-cart', 1, 1, GETUTCDATE()),
(5, 1, N'مستخدم', N'User', N'صلاحيات محدودة', N'#6B7280', N'user', 1, 1, GETUTCDATE());

SET IDENTITY_INSERT Roles OFF;
GO

-- =============================================
-- صلاحيات الأدوار
-- =============================================

-- مدير عام - جميع الصلاحيات
INSERT INTO RolePermissions (RoleId, PermissionId)
SELECT 1, Id FROM Permissions;

-- مدير - صلاحيات إدارية (بدون النسخ الاحتياطي والأدوار)
INSERT INTO RolePermissions (RoleId, PermissionId)
SELECT 2, Id FROM Permissions WHERE Code NOT IN ('backup.create', 'backup.restore', 'roles.create', 'roles.edit', 'roles.delete');

-- محاسب - صلاحيات مالية
INSERT INTO RolePermissions (RoleId, PermissionId)
SELECT 3, Id FROM Permissions WHERE Module IN ('dashboard', 'invoices', 'expenses', 'reports', 'customers');

-- مبيعات - صلاحيات المبيعات
INSERT INTO RolePermissions (RoleId, PermissionId)
SELECT 4, Id FROM Permissions WHERE Module IN ('dashboard', 'products', 'customers', 'invoices') 
    AND Code NOT IN ('invoices.delete', 'products.delete', 'customers.delete');

-- مستخدم - صلاحيات العرض فقط
INSERT INTO RolePermissions (RoleId, PermissionId)
SELECT 5, Id FROM Permissions WHERE [Type] = 0;

GO

-- =============================================
-- أدوار المستخدمين
-- =============================================
INSERT INTO UserRoles (UserId, RoleId, AssignedAt, AssignedByUserId)
VALUES (1, 1, GETUTCDATE(), 1);
GO

-- =============================================
-- عناصر القائمة
-- =============================================
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
(9, N'roles', N'الأدوار', N'Roles', N'shield', N'/roles', NULL, 9, N'roles.view', 1, 0, 1);

SET IDENTITY_INSERT MenuItems OFF;
GO

-- =============================================
-- الوحدات الأساسية
-- =============================================
SET IDENTITY_INSERT Units ON;

INSERT INTO Units (Id, AccountId, Name, NameEn, Symbol, IsBase, ConversionFactor, IsActive, CreatedAt, CreatedByUserId)
VALUES 
(1, 1, N'قطعة', N'Piece', N'قطعة', 1, 1, 1, GETUTCDATE(), 1),
(2, 1, N'علبة', N'Box', N'علبة', 0, 1, 1, GETUTCDATE(), 1),
(3, 1, N'كرتون', N'Carton', N'كرتون', 0, 1, 1, GETUTCDATE(), 1),
(4, 1, N'كيلو', N'Kilogram', N'كجم', 1, 1, 1, GETUTCDATE(), 1),
(5, 1, N'جرام', N'Gram', N'جم', 0, 0.001, 1, GETUTCDATE(), 1),
(6, 1, N'لتر', N'Liter', N'لتر', 1, 1, 1, GETUTCDATE(), 1),
(7, 1, N'متر', N'Meter', N'متر', 1, 1, 1, GETUTCDATE(), 1),
(8, 1, N'دستة', N'Dozen', N'دستة', 0, 12, 1, GETUTCDATE(), 1);

SET IDENTITY_INSERT Units OFF;
GO

-- =============================================
-- تصنيفات المنتجات الأساسية
-- =============================================
SET IDENTITY_INSERT ProductCategories ON;

INSERT INTO ProductCategories (Id, AccountId, Name, NameEn, ParentCategoryId, IsActive)
VALUES 
(1, 1, N'عام', N'General', NULL, 1);

SET IDENTITY_INSERT ProductCategories OFF;
GO

-- =============================================
-- تصنيفات المصروفات الأساسية
-- =============================================
SET IDENTITY_INSERT ExpenseCategories ON;

INSERT INTO ExpenseCategories (Id, AccountId, Code, Name, NameEn, IsActive)
VALUES 
(1, 1, N'EXP01', N'رواتب', N'Salaries', 1),
(2, 1, N'EXP02', N'إيجارات', N'Rent', 1),
(3, 1, N'EXP03', N'مرافق', N'Utilities', 1),
(4, 1, N'EXP04', N'صيانة', N'Maintenance', 1),
(5, 1, N'EXP05', N'أخرى', N'Other', 1);

SET IDENTITY_INSERT ExpenseCategories OFF;
GO

-- =============================================
-- تصنيفات الإيرادات الأساسية
-- =============================================
SET IDENTITY_INSERT RevenueCategories ON;

INSERT INTO RevenueCategories (Id, AccountId, Code, Name, NameEn, IsActive)
VALUES 
(1, 1, N'REV01', N'مبيعات', N'Sales', 1),
(2, 1, N'REV02', N'خدمات', N'Services', 1),
(3, 1, N'REV03', N'أخرى', N'Other', 1);

SET IDENTITY_INSERT RevenueCategories OFF;
GO

-- =============================================
-- أنواع المعاملات الأساسية
-- =============================================
SET IDENTITY_INSERT TransactionTypes ON;

INSERT INTO TransactionTypes (Id, AccountId, Code, Name, NameEn, Category, Icon, Color, IsIncome, IsExpense, IsSystemType, SortOrder, IsActive)
VALUES 
-- أنواع الإيرادات
(1, 1, N'CASH_SALE', N'مبيعات نقدية', N'Cash Sale', N'INCOME', N'dollar-sign', N'#10B981', 1, 0, 1, 1, 1),
(2, 1, N'CREDIT_SALE', N'مبيعات آجلة', N'Credit Sale', N'INCOME', N'credit-card', N'#3B82F6', 1, 0, 1, 2, 1),
(3, 1, N'OTHER_REV', N'إيرادات أخرى', N'Other Revenue', N'INCOME', N'trending-up', N'#8B5CF6', 1, 0, 1, 3, 1),
-- أنواع المصروفات
(4, 1, N'OP_EXPENSE', N'مصروفات تشغيل', N'Operating Expense', N'EXPENSE', N'receipt', N'#EF4444', 0, 1, 1, 10, 1),
(5, 1, N'SALARY', N'رواتب', N'Salary', N'EXPENSE', N'users', N'#F59E0B', 0, 1, 1, 11, 1),
(6, 1, N'RENT', N'إيجار', N'Rent', N'EXPENSE', N'home', N'#6366F1', 0, 1, 1, 12, 1),
-- أنواع المشتريات
(7, 1, N'CASH_PURCHASE', N'مشتريات نقدية', N'Cash Purchase', N'PURCHASE', N'shopping-cart', N'#0EA5E9', 0, 1, 1, 20, 1),
(8, 1, N'CREDIT_PURCHASE', N'مشتريات آجلة', N'Credit Purchase', N'PURCHASE', N'truck', N'#14B8A6', 0, 1, 1, 21, 1);

SET IDENTITY_INSERT TransactionTypes OFF;
GO

-- =============================================
-- إعدادات النظام الافتراضية
-- =============================================
INSERT INTO SystemSettings (AccountId, SettingKey, SettingValue, SettingType, [Description], IsPublic)
VALUES 
-- إعدادات شاشة الدخول (عامة لكل النظام)
(NULL, N'showDemoLogin', N'true', N'bool', N'إظهار زر الدخول التجريبي في شاشة تسجيل الدخول', 1),
(NULL, N'showAdminLogin', N'true', N'bool', N'إظهار زر دخول الأدمن في شاشة تسجيل الدخول', 1),
-- إعدادات عامة أخرى
(NULL, N'showMockDataGenerator', N'true', N'bool', N'إظهار أداة توليد البيانات التجريبية', 0),
(NULL, N'allowUserRegistration', N'true', N'bool', N'السماح بتسجيل مستخدمين جدد', 1);
GO

PRINT N'';
PRINT N'=============================================';
PRINT N'تم إنشاء قاعدة البيانات الأساسية بنجاح!';
PRINT N'=============================================';
PRINT N'';
PRINT N'بيانات الدخول:';
PRINT N'  Username: admin';
PRINT N'  Password: admin123';
PRINT N'=============================================';
GO
