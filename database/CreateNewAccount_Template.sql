-- =====================================================
-- سكريبت إنشاء حساب جديد كامل
-- Smart Accountant - New Account Creation Script
-- =====================================================
-- تاريخ الإنشاء: 2026-01-02
-- الإصدار: 1.0
-- =====================================================

-- =====================================================
-- الخطوة 1: المتغيرات - قم بتعديل هذه القيم حسب الحاجة
-- =====================================================

DECLARE @CompanyNameAr NVARCHAR(200) = N'شركة هلثي فود للأغذية الصحية';
DECLARE @CompanyNameEn NVARCHAR(200) = N'Healthy Food Company';
DECLARE @CompanyEmail NVARCHAR(100) = N'info@healthyfood.sa';
DECLARE @CompanyPhone NVARCHAR(50) = N'+966501234567';
DECLARE @CompanyAddress NVARCHAR(500) = N'شارع الملك فهد - حي العليا';
DECLARE @CompanyCity NVARCHAR(100) = N'الرياض';
DECLARE @CompanyCountry NVARCHAR(100) = N'المملكة العربية السعودية';
DECLARE @CompanyPostalCode NVARCHAR(20) = N'12345';
DECLARE @CompanyWebsite NVARCHAR(200) = N'www.healthyfood.sa';
DECLARE @CompanyTaxNumber NVARCHAR(50) = N'300012345600003';
DECLARE @CompanyCommercialRegister NVARCHAR(50) = N'1010123456';
DECLARE @CurrencyId INT = 1; -- 1 = ريال يمني، يمكن تغييره
DECLARE @CurrencySymbol NVARCHAR(10) = N'ر.س';
DECLARE @CompanyNotes NVARCHAR(1000) = N'شركة متخصصة في الأغذية الصحية والعضوية';

-- بيانات المستخدم المدير
DECLARE @AdminUsername NVARCHAR(100) = N'healthyfood_admin';
DECLARE @AdminFullName NVARCHAR(200) = N'مدير شركة هلثي فود';
DECLARE @AdminEmail NVARCHAR(100) = N'admin@healthyfood.sa';
DECLARE @AdminPhone NVARCHAR(50) = N'+966501234567';
DECLARE @AdminPassword NVARCHAR(500) = N'$2a$11$L5Z8TGt6GvT7LSgbA2HupefpWOC/Oiax3.q2gyFJUnE8APln0t7xq'; -- كلمة المرور: admin123
DECLARE @AdminJobTitle NVARCHAR(100) = N'مدير عام';
DECLARE @AdminDepartment NVARCHAR(100) = N'الإدارة';
DECLARE @AdminTimeZone NVARCHAR(50) = N'Asia/Riyadh';

-- متغيرات داخلية
DECLARE @NewAccountId INT;
DECLARE @NewUserId INT;

-- =====================================================
-- الخطوة 2: إنشاء الحساب (الشركة)
-- =====================================================

PRINT N'جاري إنشاء الحساب...';

INSERT INTO Accounts (
    Name, 
    NameEn, 
    Email, 
    Phone, 
    Address, 
    City, 
    Country, 
    PostalCode,
    Website, 
    TaxNumber, 
    CommercialRegister, 
    CurrencyId, 
    CurrencySymbol,
    [Plan], 
    IsActive, 
    Notes, 
    CreatedAt
) VALUES (
    @CompanyNameAr,
    @CompanyNameEn,
    @CompanyEmail,
    @CompanyPhone,
    @CompanyAddress,
    @CompanyCity,
    @CompanyCountry,
    @CompanyPostalCode,
    @CompanyWebsite,
    @CompanyTaxNumber,
    @CompanyCommercialRegister,
    @CurrencyId,
    @CurrencySymbol,
    2, -- Premium Plan
    1, -- IsActive
    @CompanyNotes,
    GETDATE()
);

SET @NewAccountId = SCOPE_IDENTITY();
PRINT N'✅ تم إنشاء الحساب برقم: ' + CAST(@NewAccountId AS NVARCHAR);

-- =====================================================
-- الخطوة 3: إنشاء المستخدم المدير
-- =====================================================

PRINT N'جاري إنشاء المستخدم المدير...';

INSERT INTO Users (
    AccountId, 
    Username, 
    FullName, 
    Email, 
    PasswordHash, 
    Phone, 
    JobTitle, 
    Department, 
    RoleType, 
    IsSuperAdmin, 
    IsActive, 
    PreferredLanguage, 
    TimeZone,
    CanManageProducts, 
    CanManageCustomers, 
    CanCreateInvoices, 
    CanManageExpenses, 
    CanViewReports, 
    CanManageSettings, 
    CanManageUsers,
    CreatedAt
) VALUES (
    @NewAccountId,
    @AdminUsername,
    @AdminFullName,
    @AdminEmail,
    @AdminPassword,
    @AdminPhone,
    @AdminJobTitle,
    @AdminDepartment,
    2, -- RoleType: مدير عام
    1, -- IsSuperAdmin
    1, -- IsActive
    'ar', -- PreferredLanguage
    @AdminTimeZone,
    1, 1, 1, 1, 1, 1, 1, -- جميع الصلاحيات
    GETDATE()
);

SET @NewUserId = SCOPE_IDENTITY();
PRINT N'✅ تم إنشاء المستخدم برقم: ' + CAST(@NewUserId AS NVARCHAR);

-- =====================================================
-- الخطوة 4: إضافة العملاء
-- =====================================================

PRINT N'جاري إضافة العملاء...';

INSERT INTO Customers (
    AccountId, Code, Name, Email, Phone, Address, City, Country, 
    TaxNumber, Type, CreditLimit, Balance, Notes, IsActive, 
    JoinDate, CreatedAt, CreatedByUserId
) VALUES
-- العميل 1
(@NewAccountId, 'C001', N'سوبرماركت الخير', 'alkhair@email.com', '+966501111111', 
 N'شارع النسيم', N'الرياض', N'السعودية', '300111111100003', 0, 50000, 0, 
 N'عميل مميز', 1, GETDATE(), GETDATE(), @NewUserId),

-- العميل 2
(@NewAccountId, 'C002', N'مطاعم الشرق', 'sharq@email.com', '+966502222222', 
 N'شارع التحلية', N'جدة', N'السعودية', '300222222200003', 0, 100000, 0, 
 N'سلسلة مطاعم', 1, GETDATE(), GETDATE(), @NewUserId),

-- العميل 3
(@NewAccountId, 'C003', N'فندق الأمير', 'prince@hotel.sa', '+966503333333', 
 N'طريق الملك', N'الرياض', N'السعودية', '300333333300003', 0, 200000, 0, 
 N'فندق 5 نجوم', 1, GETDATE(), GETDATE(), @NewUserId),

-- العميل 4
(@NewAccountId, 'C004', N'كافيه الصباح', 'morning@cafe.sa', '+966504444444', 
 N'شارع الخليج', N'الدمام', N'السعودية', '300444444400003', 0, 25000, 0, 
 N'كافيه ومخبوزات', 1, GETDATE(), GETDATE(), @NewUserId),

-- العميل 5
(@NewAccountId, 'C005', N'مستشفى الشفاء', 'shifa@hospital.sa', '+966505555555', 
 N'حي الملز', N'الرياض', N'السعودية', '300555555500003', 0, 150000, 0, 
 N'مستشفى خاص', 1, GETDATE(), GETDATE(), @NewUserId);

PRINT N'✅ تم إضافة 5 عملاء';

-- =====================================================
-- الخطوة 5: إضافة المنتجات
-- =====================================================

PRINT N'جاري إضافة المنتجات...';

INSERT INTO Products (
    AccountId, Code, Name, NameEn, Description, 
    CostPrice, SellingPrice, TaxPercent, 
    StockQuantity, MinStockLevel, IsActive, 
    CreatedAt, CreatedByUserId
) VALUES
-- المنتج 1
(@NewAccountId, 'P001', N'زيت زيتون عضوي', 'Organic Olive Oil', 
 N'زيت زيتون بكر ممتاز عضوي 1 لتر', 35, 55, 15, 500, 50, 1, GETDATE(), @NewUserId),

-- المنتج 2
(@NewAccountId, 'P002', N'عسل طبيعي', 'Natural Honey', 
 N'عسل طبيعي من مناحل جبلية 500 جرام', 80, 120, 15, 300, 30, 1, GETDATE(), @NewUserId),

-- المنتج 3
(@NewAccountId, 'P003', N'أرز بسمتي عضوي', 'Organic Basmati Rice', 
 N'أرز بسمتي عضوي 5 كيلو', 25, 40, 15, 1000, 100, 1, GETDATE(), @NewUserId),

-- المنتج 4
(@NewAccountId, 'P004', N'لوز محمص', 'Roasted Almonds', 
 N'لوز محمص بدون ملح 500 جرام', 45, 70, 15, 200, 20, 1, GETDATE(), @NewUserId),

-- المنتج 5
(@NewAccountId, 'P005', N'شوفان عضوي', 'Organic Oats', 
 N'شوفان عضوي كامل 1 كيلو', 15, 25, 15, 800, 80, 1, GETDATE(), @NewUserId),

-- المنتج 6
(@NewAccountId, 'P006', N'زبدة فول سوداني', 'Peanut Butter', 
 N'زبدة فول سوداني طبيعية 350 جرام', 20, 35, 15, 400, 40, 1, GETDATE(), @NewUserId),

-- المنتج 7
(@NewAccountId, 'P007', N'كينوا', 'Quinoa', 
 N'كينوا عضوية 500 جرام', 30, 50, 15, 150, 15, 1, GETDATE(), @NewUserId),

-- المنتج 8
(@NewAccountId, 'P008', N'حليب لوز', 'Almond Milk', 
 N'حليب لوز طبيعي 1 لتر', 12, 22, 15, 600, 60, 1, GETDATE(), @NewUserId),

-- المنتج 9
(@NewAccountId, 'P009', N'تمر مجدول', 'Medjool Dates', 
 N'تمر مجدول فاخر 1 كيلو', 55, 85, 15, 250, 25, 1, GETDATE(), @NewUserId),

-- المنتج 10
(@NewAccountId, 'P010', N'زنجبيل مجفف', 'Dried Ginger', 
 N'زنجبيل مجفف مطحون 200 جرام', 10, 18, 15, 350, 35, 1, GETDATE(), @NewUserId);

PRINT N'✅ تم إضافة 10 منتجات';

-- =====================================================
-- الخطوة 6: عرض ملخص النتائج
-- =====================================================

PRINT N'';
PRINT N'=====================================================';
PRINT N'✅ تم إنشاء الحساب بنجاح!';
PRINT N'=====================================================';
PRINT N'';

SELECT 
    N'معلومات الحساب الجديد' AS [المعلومات],
    @NewAccountId AS [رقم الحساب],
    @CompanyNameAr AS [اسم الشركة],
    @CompanyEmail AS [البريد الإلكتروني];

SELECT 
    N'معلومات تسجيل الدخول' AS [المعلومات],
    @AdminUsername AS [اسم المستخدم],
    'admin123' AS [كلمة المرور],
    @AdminEmail AS [البريد];

SELECT 
    N'إحصائيات' AS [المعلومات],
    (SELECT COUNT(*) FROM Customers WHERE AccountId = @NewAccountId) AS [عدد العملاء],
    (SELECT COUNT(*) FROM Products WHERE AccountId = @NewAccountId) AS [عدد المنتجات];

-- =====================================================
-- نهاية السكريبت
-- =====================================================

GO

-- =====================================================
-- =====================================================
-- سكريبت مختصر لإنشاء حساب فارغ (بدون بيانات تجريبية)
-- =====================================================
-- =====================================================

/*
-- لإنشاء حساب فارغ فقط، استخدم الكود التالي:

DECLARE @AccountName NVARCHAR(200) = N'اسم الشركة';
DECLARE @AdminUser NVARCHAR(100) = N'username';
DECLARE @NewAccId INT;
DECLARE @NewUsrId INT;

-- إنشاء الحساب
INSERT INTO Accounts (Name, Email, Phone, CurrencyId, CurrencySymbol, [Plan], IsActive, CreatedAt)
VALUES (@AccountName, 'email@company.com', '123456789', 1, N'ر.س', 2, 1, GETDATE());
SET @NewAccId = SCOPE_IDENTITY();

-- إنشاء المستخدم
INSERT INTO Users (AccountId, Username, FullName, Email, PasswordHash, RoleType, IsSuperAdmin, IsActive, 
    CanManageProducts, CanManageCustomers, CanCreateInvoices, CanManageExpenses, 
    CanViewReports, CanManageSettings, CanManageUsers, CreatedAt)
VALUES (@NewAccId, @AdminUser, N'المدير', 'admin@company.com', 
    '$2a$11$L5Z8TGt6GvT7LSgbA2HupefpWOC/Oiax3.q2gyFJUnE8APln0t7xq', 
    2, 1, 1, 1, 1, 1, 1, 1, 1, 1, GETDATE());

SELECT @NewAccId AS AccountId, @AdminUser AS Username, 'admin123' AS Password;
*/

-- =====================================================
-- =====================================================
-- سكريبت حذف حساب (احذر! سيحذف جميع البيانات)
-- =====================================================
-- =====================================================

/*
-- لحذف حساب معين، استخدم الكود التالي:
-- تحذير: هذا سيحذف جميع بيانات الحساب نهائياً!

DECLARE @AccountIdToDelete INT = 13; -- رقم الحساب المراد حذفه

-- حذف بنود الفواتير
DELETE FROM InvoiceItems WHERE InvoiceId IN (SELECT Id FROM Invoices WHERE AccountId = @AccountIdToDelete);
-- حذف الفواتير
DELETE FROM Invoices WHERE AccountId = @AccountIdToDelete;
-- حذف المدفوعات
DELETE FROM Payments WHERE AccountId = @AccountIdToDelete;
-- حذف المصروفات
DELETE FROM Expenses WHERE AccountId = @AccountIdToDelete;
-- حذف العملاء
DELETE FROM Customers WHERE AccountId = @AccountIdToDelete;
-- حذف المنتجات
DELETE FROM Products WHERE AccountId = @AccountIdToDelete;
-- حذف المستخدمين
DELETE FROM Users WHERE AccountId = @AccountIdToDelete;
-- حذف الحساب
DELETE FROM Accounts WHERE Id = @AccountIdToDelete;

PRINT N'تم حذف الحساب رقم ' + CAST(@AccountIdToDelete AS NVARCHAR);
*/
