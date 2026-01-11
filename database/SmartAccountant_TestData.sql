-- =============================================
-- Smart Accountant - Test Data Script
-- بيانات اختبارية شاملة
-- =============================================
-- 
-- يجب تنفيذ ملف SmartAccountant_BaseSetup.sql أولاً
-- ثم تنفيذ هذا الملف لإضافة البيانات الاختبارية
-- =============================================

USE SmartAccountant_v1005_DB;
GO

PRINT N'=============================================';
PRINT N'Smart Accountant - Test Data';
PRINT N'Version: 1.0 | Date: 2025-12-31';
PRINT N'=============================================';
GO

-- =============================================
-- مستخدمين اختباريين
-- =============================================
PRINT N'إضافة المستخدمين الاختباريين...';

SET IDENTITY_INSERT Users ON;

INSERT INTO Users (Id, AccountId, Username, PasswordHash, FullName, Email, Phone, JobTitle, Department, RoleType, IsSuperAdmin, IsActive, 
    CanManageProducts, CanManageCustomers, CanCreateInvoices, CanManageExpenses, CanViewReports, CanManageSettings, CanManageUsers, CreatedAt)
VALUES 
(2, 1, N'manager', N'$2a$11$rBNM5H.OJ8FqSKA1qKu7XO8R0Y6Q8Z5Y1J4R5Y6Z7Q8R9S0T1U2V3', N'محمد المدير', N'manager@mycompany.com', N'+201111111111', N'مدير المبيعات', N'المبيعات', 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, GETUTCDATE()),
(3, 1, N'accountant', N'$2a$11$rBNM5H.OJ8FqSKA1qKu7XO8R0Y6Q8Z5Y1J4R5Y6Z7Q8R9S0T1U2V3', N'أحمد المحاسب', N'accountant@mycompany.com', N'+201222222222', N'محاسب', N'المالية', 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, GETUTCDATE()),
(4, 1, N'sales', N'$2a$11$rBNM5H.OJ8FqSKA1qKu7XO8R0Y6Q8Z5Y1J4R5Y6Z7Q8R9S0T1U2V3', N'خالد المبيعات', N'sales@mycompany.com', N'+201333333333', N'موظف مبيعات', N'المبيعات', 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, GETUTCDATE()),
(5, 1, N'user', N'$2a$11$rBNM5H.OJ8FqSKA1qKu7XO8R0Y6Q8Z5Y1J4R5Y6Z7Q8R9S0T1U2V3', N'مستخدم عادي', N'user@mycompany.com', N'+201444444444', N'موظف', N'عام', 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, GETUTCDATE());

SET IDENTITY_INSERT Users OFF;

-- تعيين أدوار المستخدمين
INSERT INTO UserRoles (UserId, RoleId, AssignedAt, AssignedByUserId) VALUES (2, 2, GETUTCDATE(), 1);
INSERT INTO UserRoles (UserId, RoleId, AssignedAt, AssignedByUserId) VALUES (3, 3, GETUTCDATE(), 1);
INSERT INTO UserRoles (UserId, RoleId, AssignedAt, AssignedByUserId) VALUES (4, 4, GETUTCDATE(), 1);
INSERT INTO UserRoles (UserId, RoleId, AssignedAt, AssignedByUserId) VALUES (5, 5, GETUTCDATE(), 1);
GO

-- =============================================
-- تصنيفات المنتجات
-- =============================================
PRINT N'إضافة تصنيفات المنتجات...';

SET IDENTITY_INSERT ProductCategories ON;

INSERT INTO ProductCategories (Id, AccountId, Name, NameEn, ParentCategoryId, IsActive) VALUES 
(2, 1, N'إلكترونيات', N'Electronics', NULL, 1),
(3, 1, N'مواد غذائية', N'Food & Beverages', NULL, 1),
(4, 1, N'ملابس', N'Clothing', NULL, 1),
(5, 1, N'أدوات منزلية', N'Home Appliances', NULL, 1),
(6, 1, N'قرطاسية', N'Stationery', NULL, 1),
(7, 1, N'هواتف', N'Phones', 2, 1),
(8, 1, N'أجهزة كمبيوتر', N'Computers', 2, 1),
(9, 1, N'مشروبات', N'Beverages', 3, 1),
(10, 1, N'حلويات', N'Sweets', 3, 1);

SET IDENTITY_INSERT ProductCategories OFF;
GO

-- =============================================
-- المنتجات
-- =============================================
PRINT N'إضافة المنتجات الاختبارية...';

SET IDENTITY_INSERT Products ON;

INSERT INTO Products (Id, AccountId, Code, Barcode, Name, NameEn, [Description], CategoryId, CostPrice, SellingPrice, TaxPercent, StockQuantity, MinStockLevel, IsActive, CreatedAt, CreatedByUserId) VALUES 
-- إلكترونيات
(1, 1, N'PRD001', N'6221234567001', N'آيفون 15 برو', N'iPhone 15 Pro', N'هاتف آيفون 15 برو 256 جيجا', 7, 45000.00, 55000.00, 14, 25, 5, 1, GETUTCDATE(), 1),
(2, 1, N'PRD002', N'6221234567002', N'سامسونج S24', N'Samsung S24', N'هاتف سامسونج جالاكسي S24', 7, 35000.00, 42000.00, 14, 30, 5, 1, GETUTCDATE(), 1),
(3, 1, N'PRD003', N'6221234567003', N'لابتوب ديل', N'Dell Laptop', N'لابتوب ديل انسبيرون 15', 8, 18000.00, 24000.00, 14, 15, 3, 1, GETUTCDATE(), 1),
(4, 1, N'PRD004', N'6221234567004', N'لابتوب HP', N'HP Laptop', N'لابتوب HP Pavilion', 8, 16000.00, 21000.00, 14, 20, 3, 1, GETUTCDATE(), 1),
(5, 1, N'PRD005', N'6221234567005', N'ماك بوك إير', N'MacBook Air', N'ماك بوك إير M2', 8, 40000.00, 50000.00, 14, 10, 2, 1, GETUTCDATE(), 1),
-- مواد غذائية
(6, 1, N'PRD006', N'6221234567006', N'عصير برتقال', N'Orange Juice', N'عصير برتقال طبيعي 1 لتر', 9, 15.00, 25.00, 0, 200, 50, 1, GETUTCDATE(), 1),
(7, 1, N'PRD007', N'6221234567007', N'مياه معدنية', N'Mineral Water', N'مياه معدنية 1.5 لتر', 9, 5.00, 8.00, 0, 500, 100, 1, GETUTCDATE(), 1),
(8, 1, N'PRD008', N'6221234567008', N'بيبسي', N'Pepsi', N'بيبسي 330 مل', 9, 6.00, 10.00, 0, 300, 100, 1, GETUTCDATE(), 1),
(9, 1, N'PRD009', N'6221234567009', N'شوكولاتة جالاكسي', N'Galaxy Chocolate', N'شوكولاتة جالاكسي 100 جرام', 10, 20.00, 30.00, 0, 150, 30, 1, GETUTCDATE(), 1),
(10, 1, N'PRD010', N'6221234567010', N'بسكويت أوريو', N'Oreo Biscuits', N'بسكويت أوريو 150 جرام', 10, 15.00, 22.00, 0, 180, 40, 1, GETUTCDATE(), 1),
-- ملابس
(11, 1, N'PRD011', N'6221234567011', N'تيشيرت قطن', N'Cotton T-Shirt', N'تيشيرت قطن رجالي', 4, 80.00, 150.00, 14, 100, 20, 1, GETUTCDATE(), 1),
(12, 1, N'PRD012', N'6221234567012', N'بنطلون جينز', N'Jeans Pants', N'بنطلون جينز رجالي', 4, 200.00, 350.00, 14, 60, 15, 1, GETUTCDATE(), 1),
(13, 1, N'PRD013', N'6221234567013', N'قميص رسمي', N'Formal Shirt', N'قميص رسمي أبيض', 4, 150.00, 280.00, 14, 50, 10, 1, GETUTCDATE(), 1),
-- أدوات منزلية
(14, 1, N'PRD014', N'6221234567014', N'خلاط كهربائي', N'Electric Blender', N'خلاط كهربائي 500 وات', 5, 500.00, 750.00, 14, 25, 5, 1, GETUTCDATE(), 1),
(15, 1, N'PRD015', N'6221234567015', N'مكواة بخار', N'Steam Iron', N'مكواة بخار 2000 وات', 5, 400.00, 600.00, 14, 30, 5, 1, GETUTCDATE(), 1),
-- قرطاسية
(16, 1, N'PRD016', N'6221234567016', N'دفتر A4', N'A4 Notebook', N'دفتر A4 100 ورقة', 6, 10.00, 18.00, 0, 200, 50, 1, GETUTCDATE(), 1),
(17, 1, N'PRD017', N'6221234567017', N'قلم حبر جاف', N'Ball Pen', N'قلم حبر جاف أزرق', 6, 2.00, 5.00, 0, 500, 100, 1, GETUTCDATE(), 1),
(18, 1, N'PRD018', N'6221234567018', N'ممحاة', N'Eraser', N'ممحاة بيضاء', 6, 1.00, 3.00, 0, 300, 100, 1, GETUTCDATE(), 1),
(19, 1, N'PRD019', N'6221234567019', N'مسطرة 30سم', N'Ruler 30cm', N'مسطرة بلاستيك 30 سم', 6, 3.00, 7.00, 0, 200, 50, 1, GETUTCDATE(), 1),
(20, 1, N'PRD020', N'6221234567020', N'شنطة لابتوب', N'Laptop Bag', N'شنطة لابتوب 15 بوصة', 8, 150.00, 280.00, 14, 40, 10, 1, GETUTCDATE(), 1);

SET IDENTITY_INSERT Products OFF;
GO

-- =============================================
-- العملاء
-- =============================================
PRINT N'إضافة العملاء الاختباريين...';

SET IDENTITY_INSERT Customers ON;

INSERT INTO Customers (Id, AccountId, Code, Name, NameEn, Phone, Phone2, Email, Address, City, TaxNumber, [Type], Balance, CreditLimit, Notes, IsActive, CreatedAt, CreatedByUserId) VALUES 
(1, 1, N'CUS001', N'أحمد محمد علي', N'Ahmed Mohamed Ali', N'+201001234567', N'+201001234568', N'ahmed.ali@email.com', N'15 شارع التحرير، وسط البلد', N'القاهرة', N'123-456-789', N'customer', 0, 10000, N'عميل منتظم', 1, GETUTCDATE(), 1),
(2, 1, N'CUS002', N'شركة الأمل للتجارة', N'Al-Amal Trading Co.', N'+201112345678', N'+201112345679', N'info@alamal.com', N'25 شارع الجمهورية', N'الإسكندرية', N'234-567-890', N'customer', 5000, 50000, N'شركة تجارة جملة', 1, GETUTCDATE(), 1),
(3, 1, N'CUS003', N'محمود السيد', N'Mahmoud El-Sayed', N'+201223456789', NULL, N'mahmoud@email.com', N'10 شارع فيصل', N'الجيزة', NULL, N'customer', 0, 5000, NULL, 1, GETUTCDATE(), 1),
(4, 1, N'CUS004', N'مؤسسة النور', N'Al-Nour Foundation', N'+201334567890', N'+201334567891', N'nour@foundation.org', N'شارع الملك فيصل', N'الرياض', N'345-678-901', N'customer', -2500, 30000, N'مؤسسة خيرية', 1, GETUTCDATE(), 1),
(5, 1, N'CUS005', N'خالد عبدالله', N'Khaled Abdullah', N'+201445678901', NULL, N'khaled@email.com', N'حي النزهة', N'القاهرة', NULL, N'customer', 1500, 8000, N'عميل VIP', 1, GETUTCDATE(), 1),
(6, 1, N'CUS006', N'سوبر ماركت الفتح', N'Al-Fath Supermarket', N'+201556789012', N'+201556789013', N'fath@supermarket.com', N'شارع الهرم', N'الجيزة', N'456-789-012', N'customer', 0, 100000, N'سوبر ماركت كبير', 1, GETUTCDATE(), 1),
(7, 1, N'CUS007', N'فاطمة حسن', N'Fatma Hassan', N'+201667890123', NULL, N'fatma@email.com', N'مدينة نصر', N'القاهرة', NULL, N'customer', 0, 3000, NULL, 1, GETUTCDATE(), 1),
(8, 1, N'CUS008', N'مطعم الشرق', N'Al-Sharq Restaurant', N'+201778901234', N'+201778901235', N'sharq@restaurant.com', N'شارع طلعت حرب', N'القاهرة', N'567-890-123', N'customer', 3500, 25000, N'مطعم شرقي', 1, GETUTCDATE(), 1),
(9, 1, N'CUS009', N'عمر صالح', N'Omar Saleh', N'+201889012345', NULL, N'omar@email.com', N'المعادي', N'القاهرة', NULL, N'customer', 0, 5000, NULL, 1, GETUTCDATE(), 1),
(10, 1, N'CUS010', N'شركة التقنية الحديثة', N'Modern Tech Co.', N'+201990123456', N'+201990123457', N'info@moderntech.com', N'مدينة 6 أكتوبر', N'الجيزة', N'678-901-234', N'customer', -8000, 80000, N'شركة تكنولوجيا معلومات', 1, GETUTCDATE(), 1),
-- موردين
(11, 1, N'SUP001', N'مورد الإلكترونيات', N'Electronics Supplier', N'+201012345670', N'+201012345671', N'supply@electronics.com', N'المنطقة الصناعية', N'العاشر من رمضان', N'789-012-345', N'supplier', 0, 200000, N'المورد الرئيسي للإلكترونيات', 1, GETUTCDATE(), 1),
(12, 1, N'SUP002', N'مصنع الملابس الجاهزة', N'Ready-made Clothes Factory', N'+201123456701', NULL, N'factory@clothes.com', N'المنطقة الحرة', N'بورسعيد', N'890-123-456', N'supplier', 0, 150000, N'مصنع ملابس', 1, GETUTCDATE(), 1),
-- عميل ومورد
(13, 1, N'CUS011', N'شركة السلام', N'Al-Salam Company', N'+201234567012', N'+201234567013', N'info@alsalam.com', N'شارع رمسيس', N'القاهرة', N'901-234-567', N'both', 2000, 40000, N'عميل ومورد', 1, GETUTCDATE(), 1);

SET IDENTITY_INSERT Customers OFF;
GO

-- =============================================
-- الفواتير
-- =============================================
PRINT N'إضافة الفواتير الاختبارية...';

SET IDENTITY_INSERT Invoices ON;

-- فواتير الشهر الحالي
INSERT INTO Invoices (Id, AccountId, InvoiceNumber, [Type], CustomerId, InvoiceDate, DueDate, Subtotal, TaxAmount, DiscountAmount, TotalAmount, PaidAmount, [Status], Notes, CreatedAt, CreatedByUserId) VALUES 
(1, 1, N'INV-2025-001', N'sale', 1, DATEADD(DAY, -30, GETUTCDATE()), DATEADD(DAY, 0, GETUTCDATE()), 1000.00, 140.00, 0, 1140.00, 1140.00, N'paid', N'فاتورة مبيعات نقدية', DATEADD(DAY, -30, GETUTCDATE()), 1),
(2, 1, N'INV-2025-002', N'sale', 2, DATEADD(DAY, -28, GETUTCDATE()), DATEADD(DAY, 2, GETUTCDATE()), 5500.00, 770.00, 100, 6170.00, 6170.00, N'paid', N'فاتورة شركة الأمل', DATEADD(DAY, -28, GETUTCDATE()), 1),
(3, 1, N'INV-2025-003', N'sale', 3, DATEADD(DAY, -25, GETUTCDATE()), DATEADD(DAY, 5, GETUTCDATE()), 800.00, 112.00, 0, 912.00, 500.00, N'partial', N'دفعة جزئية', DATEADD(DAY, -25, GETUTCDATE()), 1),
(4, 1, N'INV-2025-004', N'sale', 4, DATEADD(DAY, -22, GETUTCDATE()), DATEADD(DAY, 8, GETUTCDATE()), 2500.00, 350.00, 50, 2800.00, 2800.00, N'paid', N'مؤسسة النور', DATEADD(DAY, -22, GETUTCDATE()), 1),
(5, 1, N'INV-2025-005', N'sale', 5, DATEADD(DAY, -20, GETUTCDATE()), DATEADD(DAY, 10, GETUTCDATE()), 45000.00, 6300.00, 500, 50800.00, 50800.00, N'paid', N'عميل VIP - هاتف آيفون', DATEADD(DAY, -20, GETUTCDATE()), 1),
(6, 1, N'INV-2025-006', N'sale', 6, DATEADD(DAY, -18, GETUTCDATE()), DATEADD(DAY, 12, GETUTCDATE()), 3500.00, 0, 0, 3500.00, 3500.00, N'paid', N'سوبر ماركت - مواد غذائية', DATEADD(DAY, -18, GETUTCDATE()), 1),
(7, 1, N'INV-2025-007', N'sale', 7, DATEADD(DAY, -15, GETUTCDATE()), DATEADD(DAY, 15, GETUTCDATE()), 650.00, 91.00, 0, 741.00, 0, N'pending', N'فاتورة معلقة', DATEADD(DAY, -15, GETUTCDATE()), 1),
(8, 1, N'INV-2025-008', N'sale', 8, DATEADD(DAY, -12, GETUTCDATE()), DATEADD(DAY, 18, GETUTCDATE()), 1800.00, 252.00, 100, 1952.00, 1952.00, N'paid', N'مطعم الشرق', DATEADD(DAY, -12, GETUTCDATE()), 1),
(9, 1, N'INV-2025-009', N'sale', 9, DATEADD(DAY, -10, GETUTCDATE()), DATEADD(DAY, 20, GETUTCDATE()), 420.00, 58.80, 0, 478.80, 478.80, N'paid', NULL, DATEADD(DAY, -10, GETUTCDATE()), 1),
(10, 1, N'INV-2025-010', N'sale', 10, DATEADD(DAY, -8, GETUTCDATE()), DATEADD(DAY, 22, GETUTCDATE()), 75000.00, 10500.00, 1000, 84500.00, 40000.00, N'partial', N'دفعة أولى - شركة التقنية', DATEADD(DAY, -8, GETUTCDATE()), 1),
(11, 1, N'INV-2025-011', N'sale', 1, DATEADD(DAY, -5, GETUTCDATE()), DATEADD(DAY, 25, GETUTCDATE()), 350.00, 49.00, 0, 399.00, 399.00, N'paid', NULL, DATEADD(DAY, -5, GETUTCDATE()), 1),
(12, 1, N'INV-2025-012', N'sale', 2, DATEADD(DAY, -3, GETUTCDATE()), DATEADD(DAY, 27, GETUTCDATE()), 8500.00, 1190.00, 200, 9490.00, 9490.00, N'paid', N'طلب كبير', DATEADD(DAY, -3, GETUTCDATE()), 1),
(13, 1, N'INV-2025-013', N'sale', 5, DATEADD(DAY, -1, GETUTCDATE()), DATEADD(DAY, 29, GETUTCDATE()), 1200.00, 168.00, 0, 1368.00, 1368.00, N'paid', NULL, DATEADD(DAY, -1, GETUTCDATE()), 1),
(14, 1, N'INV-2025-014', N'sale', 6, GETUTCDATE(), DATEADD(DAY, 30, GETUTCDATE()), 4200.00, 0, 0, 4200.00, 0, N'pending', N'فاتورة اليوم', GETUTCDATE(), 1),
(15, 1, N'INV-2025-015', N'sale', 8, GETUTCDATE(), DATEADD(DAY, 30, GETUTCDATE()), 2800.00, 392.00, 0, 3192.00, 3192.00, N'paid', N'فاتورة اليوم - مدفوعة', GETUTCDATE(), 1);

SET IDENTITY_INSERT Invoices OFF;
GO

-- =============================================
-- بنود الفواتير
-- =============================================
PRINT N'إضافة بنود الفواتير...';

INSERT INTO InvoiceItems (InvoiceId, ProductId, UnitId, Quantity, UnitPrice, DiscountPercent, DiscountAmount, TaxPercent, TaxAmount, TotalAmount, Notes) VALUES 
-- فاتورة 1
(1, 11, 1, 5, 150.00, 0, 0, 14, 105.00, 855.00, NULL),
(1, 17, 1, 10, 5.00, 0, 0, 0, 0, 50.00, NULL),
-- فاتورة 2
(2, 3, 1, 1, 24000.00, 0, 0, 14, 3360.00, 27360.00, N'لابتوب'),
(2, 20, 1, 2, 280.00, 0, 0, 14, 78.40, 638.40, N'شنطة لابتوب'),
-- فاتورة 5
(5, 1, 1, 1, 55000.00, 0, 0, 14, 7700.00, 62700.00, N'آيفون 15 برو'),
-- فاتورة 6
(6, 6, 1, 50, 25.00, 0, 0, 0, 0, 1250.00, NULL),
(6, 7, 1, 100, 8.00, 0, 0, 0, 0, 800.00, NULL),
(6, 8, 1, 80, 10.00, 0, 0, 0, 0, 800.00, NULL),
(6, 9, 1, 30, 30.00, 0, 0, 0, 0, 900.00, NULL),
-- فاتورة 10
(10, 1, 1, 2, 55000.00, 0, 0, 14, 15400.00, 125400.00, N'2 آيفون'),
(10, 3, 1, 3, 24000.00, 0, 0, 14, 10080.00, 82080.00, N'3 لابتوب ديل'),
-- فاتورة 14
(14, 6, 1, 80, 25.00, 0, 0, 0, 0, 2000.00, NULL),
(14, 7, 1, 150, 8.00, 0, 0, 0, 0, 1200.00, NULL),
(14, 10, 1, 50, 22.00, 0, 0, 0, 0, 1100.00, NULL),
-- فاتورة 15
(15, 14, 1, 2, 750.00, 0, 0, 14, 210.00, 1710.00, NULL),
(15, 15, 1, 2, 600.00, 0, 0, 14, 168.00, 1368.00, NULL);
GO

-- =============================================
-- المصروفات
-- =============================================
PRINT N'إضافة المصروفات الاختبارية...';

SET IDENTITY_INSERT Expenses ON;

INSERT INTO Expenses (Id, AccountId, ExpenseNumber, CategoryId, TransactionTypeId, Amount, TaxAmount, TotalAmount, ExpenseDate, [Description], Payee, PaymentMethod, Notes, [Status], CreatedAt, CreatedByUserId) VALUES 
-- مصروفات تشغيل
(1, 1, N'EXP-2025-001', 3, 4, 2500.00, 0, 2500.00, DATEADD(DAY, -28, GETUTCDATE()), N'فاتورة كهرباء', N'شركة الكهرباء', N'Cash', N'فاتورة شهر ديسمبر', N'Paid', DATEADD(DAY, -28, GETUTCDATE()), 1),
(2, 1, N'EXP-2025-002', 3, 4, 800.00, 0, 800.00, DATEADD(DAY, -25, GETUTCDATE()), N'فاتورة مياه', N'شركة المياه', N'Cash', NULL, N'Paid', DATEADD(DAY, -25, GETUTCDATE()), 1),
(3, 1, N'EXP-2025-003', 3, 4, 500.00, 0, 500.00, DATEADD(DAY, -22, GETUTCDATE()), N'فاتورة إنترنت', N'شركة الاتصالات', N'BankTransfer', NULL, N'Paid', DATEADD(DAY, -22, GETUTCDATE()), 1),
(4, 1, N'EXP-2025-004', 4, 4, 1200.00, 0, 1200.00, DATEADD(DAY, -20, GETUTCDATE()), N'صيانة مكيف', N'شركة الصيانة', N'Cash', N'صيانة دورية', N'Paid', DATEADD(DAY, -20, GETUTCDATE()), 1),
(5, 1, N'EXP-2025-005', 5, 4, 350.00, 0, 350.00, DATEADD(DAY, -18, GETUTCDATE()), N'مستلزمات مكتبية', N'مكتبة الأمل', N'Cash', NULL, N'Paid', DATEADD(DAY, -18, GETUTCDATE()), 1),
-- رواتب
(6, 1, N'EXP-2025-006', 1, 5, 15000.00, 0, 15000.00, DATEADD(DAY, -15, GETUTCDATE()), N'رواتب الموظفين', N'موظفين', N'BankTransfer', N'رواتب شهر ديسمبر', N'Paid', DATEADD(DAY, -15, GETUTCDATE()), 1),
-- إيجار
(7, 1, N'EXP-2025-007', 2, 6, 8000.00, 0, 8000.00, DATEADD(DAY, -10, GETUTCDATE()), N'إيجار المحل', N'المالك', N'Cash', N'إيجار شهر يناير', N'Paid', DATEADD(DAY, -10, GETUTCDATE()), 1),
-- مصروفات إضافية
(8, 1, N'EXP-2025-008', 5, 4, 200.00, 0, 200.00, DATEADD(DAY, -8, GETUTCDATE()), N'نقل بضاعة', N'شركة النقل', N'Cash', NULL, N'Paid', DATEADD(DAY, -8, GETUTCDATE()), 1),
(9, 1, N'EXP-2025-009', 4, 4, 450.00, 0, 450.00, DATEADD(DAY, -5, GETUTCDATE()), N'إصلاح باب', N'نجار', N'Cash', NULL, N'Paid', DATEADD(DAY, -5, GETUTCDATE()), 1),
(10, 1, N'EXP-2025-010', 5, 4, 150.00, 0, 150.00, DATEADD(DAY, -3, GETUTCDATE()), N'شاي وقهوة', N'سوبر ماركت', N'Cash', N'مستلزمات ضيافة', N'Paid', DATEADD(DAY, -3, GETUTCDATE()), 1),
-- مشتريات
(11, 1, N'EXP-2025-011', NULL, 7, 50000.00, 7000.00, 57000.00, DATEADD(DAY, -20, GETUTCDATE()), N'شراء بضاعة إلكترونيات', N'مورد الإلكترونيات', N'BankTransfer', N'دفعة نقدية', N'Paid', DATEADD(DAY, -20, GETUTCDATE()), 1),
(12, 1, N'EXP-2025-012', NULL, 7, 15000.00, 2100.00, 17100.00, DATEADD(DAY, -12, GETUTCDATE()), N'شراء ملابس', N'مصنع الملابس', N'Cash', NULL, N'Paid', DATEADD(DAY, -12, GETUTCDATE()), 1),
(13, 1, N'EXP-2025-013', NULL, 8, 25000.00, 0, 25000.00, DATEADD(DAY, -5, GETUTCDATE()), N'شراء مواد غذائية', N'مورد أغذية', N'Cheque', N'على الحساب', N'Pending', DATEADD(DAY, -5, GETUTCDATE()), 1),
-- إيرادات أخرى
(14, 1, N'EXP-2025-014', NULL, 3, 500.00, 0, 500.00, DATEADD(DAY, -15, GETUTCDATE()), N'بيع كراتين فارغة', N'تاجر خردة', N'Cash', N'إيرادات متنوعة', N'Paid', DATEADD(DAY, -15, GETUTCDATE()), 1),
(15, 1, N'EXP-2025-015', NULL, 3, 1200.00, 0, 1200.00, DATEADD(DAY, -8, GETUTCDATE()), N'استرداد تأمين', N'شركة التأمين', N'BankTransfer', NULL, N'Paid', DATEADD(DAY, -8, GETUTCDATE()), 1);

SET IDENTITY_INSERT Expenses OFF;
GO

-- =============================================
-- الإشعارات
-- =============================================
PRINT N'إضافة الإشعارات الاختبارية...';

INSERT INTO Notifications (AccountId, UserId, Title, TitleEn, Body, BodyEn, [Type], Icon, IsRead, CreatedAt) VALUES 
(1, 1, N'مرحباً بك في النظام', N'Welcome to the system', N'تم إنشاء حسابك بنجاح. استمتع باستخدام النظام!', N'Your account has been created successfully.', N'success', N'check-circle', 1, DATEADD(DAY, -30, GETUTCDATE())),
(1, 1, N'فاتورة جديدة', N'New Invoice', N'تم إنشاء فاتورة جديدة رقم INV-2025-015', N'New invoice INV-2025-015 has been created', N'info', N'file-text', 0, GETUTCDATE()),
(1, 1, N'تحذير: مخزون منخفض', N'Warning: Low Stock', N'المنتج "ماك بوك إير" وصل للحد الأدنى من المخزون', N'Product "MacBook Air" has reached minimum stock level', N'warning', N'alert-triangle', 0, DATEADD(DAY, -2, GETUTCDATE())),
(1, 1, N'فاتورة متأخرة', N'Overdue Invoice', N'الفاتورة INV-2025-007 تجاوزت تاريخ الاستحقاق', N'Invoice INV-2025-007 is overdue', N'error', N'alert-circle', 0, DATEADD(DAY, -1, GETUTCDATE())),
(1, 2, N'تم تعيينك كمدير', N'Assigned as Manager', N'تم تعيينك بدور مدير في النظام', N'You have been assigned as Manager', N'info', N'user-check', 1, DATEADD(DAY, -25, GETUTCDATE())),
(1, 3, N'مهمة جديدة', N'New Task', N'يرجى مراجعة تقرير المصروفات الشهري', N'Please review the monthly expense report', N'info', N'clipboard', 0, DATEADD(DAY, -3, GETUTCDATE()));
GO

-- =============================================
-- سجل النشاطات
-- =============================================
PRINT N'إضافة سجل النشاطات...';

INSERT INTO ActivityLogs (AccountId, UserId, Action, EntityType, EntityId, [Description], DescriptionEn, IpAddress, CreatedAt) VALUES 
(1, 1, N'LOGIN', N'User', 1, N'تسجيل دخول ناجح', N'Successful login', N'192.168.1.100', DATEADD(DAY, -30, GETUTCDATE())),
(1, 1, N'CREATE', N'Product', 1, N'إنشاء منتج جديد: آيفون 15 برو', N'Created new product: iPhone 15 Pro', N'192.168.1.100', DATEADD(DAY, -28, GETUTCDATE())),
(1, 1, N'CREATE', N'Customer', 1, N'إنشاء عميل جديد: أحمد محمد علي', N'Created new customer: Ahmed Mohamed Ali', N'192.168.1.100', DATEADD(DAY, -27, GETUTCDATE())),
(1, 1, N'CREATE', N'Invoice', 1, N'إنشاء فاتورة جديدة: INV-2025-001', N'Created new invoice: INV-2025-001', N'192.168.1.100', DATEADD(DAY, -30, GETUTCDATE())),
(1, 1, N'UPDATE', N'Invoice', 1, N'تحديث حالة الفاتورة إلى مدفوعة', N'Updated invoice status to paid', N'192.168.1.100', DATEADD(DAY, -30, GETUTCDATE())),
(1, 1, N'CREATE', N'Expense', 1, N'إنشاء مصروف جديد: فاتورة كهرباء', N'Created new expense: Electricity bill', N'192.168.1.100', DATEADD(DAY, -28, GETUTCDATE())),
(1, 2, N'LOGIN', N'User', 2, N'تسجيل دخول ناجح', N'Successful login', N'192.168.1.101', DATEADD(DAY, -20, GETUTCDATE())),
(1, 2, N'CREATE', N'Invoice', 5, N'إنشاء فاتورة جديدة: INV-2025-005', N'Created new invoice: INV-2025-005', N'192.168.1.101', DATEADD(DAY, -20, GETUTCDATE())),
(1, 3, N'LOGIN', N'User', 3, N'تسجيل دخول ناجح', N'Successful login', N'192.168.1.102', DATEADD(DAY, -15, GETUTCDATE())),
(1, 3, N'CREATE', N'Expense', 6, N'تسجيل رواتب الموظفين', N'Recorded employee salaries', N'192.168.1.102', DATEADD(DAY, -15, GETUTCDATE())),
(1, 1, N'LOGIN', N'User', 1, N'تسجيل دخول ناجح', N'Successful login', N'192.168.1.100', GETUTCDATE());
GO

-- =============================================
-- تحديث أرصدة العملاء
-- =============================================
PRINT N'تحديث أرصدة العملاء...';

UPDATE Customers SET Balance = (
    SELECT ISNULL(SUM(TotalAmount - PaidAmount), 0)
    FROM Invoices 
    WHERE Invoices.CustomerId = Customers.Id AND Invoices.[Status] NOT IN ('cancelled', 'draft')
)
WHERE AccountId = 1;
GO

-- =============================================
-- تحديث مخزون المنتجات (خصم المبيعات)
-- =============================================
PRINT N'تحديث مخزون المنتجات...';

UPDATE Products SET StockQuantity = StockQuantity - ISNULL((
    SELECT SUM(ii.Quantity)
    FROM InvoiceItems ii
    INNER JOIN Invoices i ON ii.InvoiceId = i.Id
    WHERE ii.ProductId = Products.Id AND i.[Status] IN ('paid', 'partial', 'pending')
), 0)
WHERE AccountId = 1;
GO

PRINT N'';
PRINT N'=============================================';
PRINT N'تم إدخال جميع البيانات الاختبارية بنجاح!';
PRINT N'=============================================';
PRINT N'';
PRINT N'ملخص البيانات:';
PRINT N'  - المستخدمين: 5 (admin, manager, accountant, sales, user)';
PRINT N'  - المنتجات: 20 منتج';
PRINT N'  - العملاء: 13 (10 عملاء + 2 موردين + 1 مشترك)';
PRINT N'  - الفواتير: 15 فاتورة';
PRINT N'  - المصروفات: 15 (مصروفات + مشتريات + إيرادات أخرى)';
PRINT N'';
PRINT N'جميع كلمات المرور: admin123';
PRINT N'=============================================';
GO
