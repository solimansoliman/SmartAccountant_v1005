using SmartAccountant.API.Models;

namespace SmartAccountant.API.Data
{
    /// <summary>
    /// بيانات البذر الأولية للتطبيق
    /// ==============================
    /// ملاحظة: عند استخدام Entity Framework، النصوص العربية تُعالج تلقائياً
    /// ولا حاجة لاستخدام N'' prefix - هذا مطلوب فقط مع SQL الخام المباشر
    /// 
    /// Entity Framework يحول string properties إلى NVARCHAR تلقائياً في SQL Server
    /// </summary>
    public static class SeedData
    {
        public static void Initialize(ApplicationDbContext context)
        {
            // التأكد من إنشاء قاعدة البيانات
            context.Database.EnsureCreated();

            // إذا كانت البيانات موجودة، لا تضف بيانات جديدة
            if (context.Accounts.Any())
            {
                return;
            }

            // إنشاء العملات أولاً
            var currencies = new List<Currency>
            {
                new Currency { Code = "SAR", Name = "ريال سعودي", NameEn = "Saudi Riyal", Symbol = "ر.س", SubUnit = "هللة", Country = "السعودية", CountryCode = "SA", Flag = "🇸🇦", IsDefault = true, ExchangeRate = 1 },
                new Currency { Code = "EGP", Name = "جنيه مصري", NameEn = "Egyptian Pound", Symbol = "ج.م", SubUnit = "قرش", Country = "مصر", CountryCode = "EG", Flag = "🇪🇬", ExchangeRate = 0.12m },
                new Currency { Code = "AED", Name = "درهم إماراتي", NameEn = "UAE Dirham", Symbol = "د.إ", SubUnit = "فلس", Country = "الإمارات", CountryCode = "AE", Flag = "🇦🇪", ExchangeRate = 1.02m },
                new Currency { Code = "KWD", Name = "دينار كويتي", NameEn = "Kuwaiti Dinar", Symbol = "د.ك", SubUnit = "فلس", DecimalPlaces = 3, Country = "الكويت", CountryCode = "KW", Flag = "🇰🇼", ExchangeRate = 12.2m },
                new Currency { Code = "QAR", Name = "ريال قطري", NameEn = "Qatari Riyal", Symbol = "ر.ق", SubUnit = "درهم", Country = "قطر", CountryCode = "QA", Flag = "🇶🇦", ExchangeRate = 1.03m },
                new Currency { Code = "BHD", Name = "دينار بحريني", NameEn = "Bahraini Dinar", Symbol = "د.ب", SubUnit = "فلس", DecimalPlaces = 3, Country = "البحرين", CountryCode = "BH", Flag = "🇧🇭", ExchangeRate = 9.95m },
                new Currency { Code = "OMR", Name = "ريال عماني", NameEn = "Omani Rial", Symbol = "ر.ع", SubUnit = "بيسة", DecimalPlaces = 3, Country = "عمان", CountryCode = "OM", Flag = "🇴🇲", ExchangeRate = 9.75m },
                new Currency { Code = "JOD", Name = "دينار أردني", NameEn = "Jordanian Dinar", Symbol = "د.أ", SubUnit = "قرش", DecimalPlaces = 3, Country = "الأردن", CountryCode = "JO", Flag = "🇯🇴", ExchangeRate = 5.29m },
                new Currency { Code = "USD", Name = "دولار أمريكي", NameEn = "US Dollar", Symbol = "$", SubUnit = "سنت", Country = "أمريكا", CountryCode = "US", Flag = "🇺🇸", ExchangeRate = 3.75m },
                new Currency { Code = "EUR", Name = "يورو", NameEn = "Euro", Symbol = "€", SubUnit = "سنت", Country = "أوروبا", CountryCode = "EU", Flag = "🇪🇺", ExchangeRate = 4.05m },
                new Currency { Code = "GBP", Name = "جنيه استرليني", NameEn = "British Pound", Symbol = "£", SubUnit = "بنس", Country = "بريطانيا", CountryCode = "GB", Flag = "🇬🇧", ExchangeRate = 4.75m },
                new Currency { Code = "TRY", Name = "ليرة تركية", NameEn = "Turkish Lira", Symbol = "₺", SubUnit = "كروش", Country = "تركيا", CountryCode = "TR", Flag = "🇹🇷", ExchangeRate = 0.11m },
                new Currency { Code = "IQD", Name = "دينار عراقي", NameEn = "Iraqi Dinar", Symbol = "د.ع", SubUnit = "فلس", Country = "العراق", CountryCode = "IQ", Flag = "🇮🇶", ExchangeRate = 0.0029m },
                new Currency { Code = "LBP", Name = "ليرة لبنانية", NameEn = "Lebanese Pound", Symbol = "ل.ل", SubUnit = "قرش", Country = "لبنان", CountryCode = "LB", Flag = "🇱🇧", ExchangeRate = 0.000042m },
                new Currency { Code = "SYP", Name = "ليرة سورية", NameEn = "Syrian Pound", Symbol = "ل.س", SubUnit = "قرش", Country = "سوريا", CountryCode = "SY", Flag = "🇸🇾", ExchangeRate = 0.00027m },
                new Currency { Code = "SDG", Name = "جنيه سوداني", NameEn = "Sudanese Pound", Symbol = "ج.س", SubUnit = "قرش", Country = "السودان", CountryCode = "SD", Flag = "🇸🇩", ExchangeRate = 0.0063m },
                new Currency { Code = "MAD", Name = "درهم مغربي", NameEn = "Moroccan Dirham", Symbol = "د.م", SubUnit = "سنتيم", Country = "المغرب", CountryCode = "MA", Flag = "🇲🇦", ExchangeRate = 0.38m },
                new Currency { Code = "TND", Name = "دينار تونسي", NameEn = "Tunisian Dinar", Symbol = "د.ت", SubUnit = "مليم", DecimalPlaces = 3, Country = "تونس", CountryCode = "TN", Flag = "🇹🇳", ExchangeRate = 1.21m },
                new Currency { Code = "DZD", Name = "دينار جزائري", NameEn = "Algerian Dinar", Symbol = "د.ج", SubUnit = "سنتيم", Country = "الجزائر", CountryCode = "DZ", Flag = "🇩🇿", ExchangeRate = 0.028m },
                new Currency { Code = "LYD", Name = "دينار ليبي", NameEn = "Libyan Dinar", Symbol = "د.ل", SubUnit = "درهم", DecimalPlaces = 3, Country = "ليبيا", CountryCode = "LY", Flag = "🇱🇾", ExchangeRate = 0.78m }
            };
            context.Currencies.AddRange(currencies);
            context.SaveChanges();

            // الحصول على العملة السعودية (الافتراضية)
            var sarCurrency = currencies.First(c => c.Code == "SAR");

            // إنشاء حساب افتراضي (الشركة)
            var defaultAccount = new Account
            {
                Name = "شركة المحاسب الذكي",
                NameEn = "Smart Accountant Co.",
                Email = "info@smartaccountant.com",
                Phone = "0500000000",
                Address = "المملكة العربية السعودية",
                CurrencyId = sarCurrency.Id,
                CurrencySymbol = sarCurrency.Symbol,
                TaxNumber = "300000000000001",
                Plan = AccountPlan.Professional,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                SubscriptionExpiry = DateTime.UtcNow.AddYears(1)
            };
            context.Accounts.Add(defaultAccount);
            context.SaveChanges();

            // ============================================
            // إنشاء أنواع المعاملات الافتراضية
            // ============================================
            var transactionTypes = new List<TransactionType>
            {
                new TransactionType
                {
                    AccountId = defaultAccount.Id,
                    Name = "مصروفات",
                    NameEn = "Expenses",
                    Code = TransactionTypeCodes.Expense,
                    Description = "المصروفات العامة مثل الكهرباء والإيجار والرواتب",
                    Color = "#dc2626",
                    Icon = "TrendingDown",
                    IsSystem = true,
                    DisplayOrder = 1,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new TransactionType
                {
                    AccountId = defaultAccount.Id,
                    Name = "مشتريات",
                    NameEn = "Purchases",
                    Code = TransactionTypeCodes.Purchase,
                    Description = "مشتريات البضاعة والمواد الخام",
                    Color = "#2563eb",
                    Icon = "ShoppingCart",
                    IsSystem = true,
                    DisplayOrder = 2,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new TransactionType
                {
                    AccountId = defaultAccount.Id,
                    Name = "إيرادات أخرى",
                    NameEn = "Other Income",
                    Code = TransactionTypeCodes.OtherIncome,
                    Description = "إيرادات غير البيع مثل بيع الكراتين وغيرها",
                    Color = "#059669",
                    Icon = "TrendingUp",
                    IsSystem = true,
                    DisplayOrder = 3,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                }
            };
            context.TransactionTypes.AddRange(transactionTypes);
            context.SaveChanges();

            // إنشاء مستخدم مالك الحساب
            var owner = new User
            {
                AccountId = defaultAccount.Id,
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                FullName = "مدير النظام",
                Email = "admin@smartaccountant.com",
                RoleType = UserRoleType.Owner,
                IsSuperAdmin = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CanManageProducts = true,
                CanManageCustomers = true,
                CanCreateInvoices = true,
                CanManageExpenses = true,
                CanViewReports = true,
                CanManageSettings = true,
                CanManageUsers = true
            };
            context.Users.Add(owner);
            context.SaveChanges();

            // إنشاء مستخدم محاسب
            var accountant = new User
            {
                AccountId = defaultAccount.Id,
                Username = "accountant",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("acc123"),
                FullName = "المحاسب",
                Email = "accountant@smartaccountant.com",
                RoleType = UserRoleType.Accountant,
                IsSuperAdmin = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CanManageProducts = true,
                CanManageCustomers = true,
                CanCreateInvoices = true,
                CanManageExpenses = true,
                CanViewReports = true,
                CanManageSettings = false,
                CanManageUsers = false
            };
            context.Users.Add(accountant);
            context.SaveChanges();

            // ============================================
            // إنشاء الصلاحيات
            // ============================================
            var permissions = CreateDefaultPermissions();
            context.Permissions.AddRange(permissions);
            context.SaveChanges();

            // ============================================
            // إنشاء الأدوار الافتراضية
            // ============================================
            var roles = CreateDefaultRoles(defaultAccount.Id);
            context.Roles.AddRange(roles);
            context.SaveChanges();

            // ربط الأدوار بالصلاحيات
            AssignPermissionsToRoles(context, roles, permissions);

            // ربط المستخدمين بالأدوار
            var adminRole = roles.First(r => r.Name == "مدير عام");
            var accountantRole = roles.First(r => r.Name == "محاسب");

            context.UserRoles.Add(new UserRole
            {
                UserId = owner.Id,
                RoleId = adminRole.Id
            });
            context.UserRoles.Add(new UserRole
            {
                UserId = accountant.Id,
                RoleId = accountantRole.Id
            });
            context.SaveChanges();

            // ============================================
            // إنشاء عناصر القائمة
            // ============================================
            var menuItems = CreateDefaultMenuItems();
            context.MenuItems.AddRange(menuItems);
            context.SaveChanges();

            // إنشاء وحدات القياس الأساسية
            var units = new List<Unit>
            {
                new Unit { AccountId = defaultAccount.Id, Name = "قطعة", NameEn = "Piece", Symbol = "PCS", IsBase = true, CreatedByUserId = owner.Id },
                new Unit { AccountId = defaultAccount.Id, Name = "كيلوجرام", NameEn = "Kilogram", Symbol = "KG", IsBase = true, CreatedByUserId = owner.Id },
                new Unit { AccountId = defaultAccount.Id, Name = "جرام", NameEn = "Gram", Symbol = "G", IsBase = false, ConversionFactor = 0.001m, CreatedByUserId = owner.Id },
                new Unit { AccountId = defaultAccount.Id, Name = "لتر", NameEn = "Liter", Symbol = "L", IsBase = true, CreatedByUserId = owner.Id },
                new Unit { AccountId = defaultAccount.Id, Name = "متر", NameEn = "Meter", Symbol = "M", IsBase = true, CreatedByUserId = owner.Id },
                new Unit { AccountId = defaultAccount.Id, Name = "كرتون", NameEn = "Carton", Symbol = "CTN", IsBase = false, CreatedByUserId = owner.Id },
                new Unit { AccountId = defaultAccount.Id, Name = "علبة", NameEn = "Box", Symbol = "BOX", IsBase = false, CreatedByUserId = owner.Id },
                new Unit { AccountId = defaultAccount.Id, Name = "باكيت", NameEn = "Packet", Symbol = "PKT", IsBase = false, CreatedByUserId = owner.Id }
            };
            context.Units.AddRange(units);
            context.SaveChanges();

            // إنشاء تصنيفات المنتجات
            var categories = new List<ProductCategory>
            {
                new ProductCategory { AccountId = defaultAccount.Id, Name = "منتجات عامة", NameEn = "General Products" },
                new ProductCategory { AccountId = defaultAccount.Id, Name = "مواد خام", NameEn = "Raw Materials" },
                new ProductCategory { AccountId = defaultAccount.Id, Name = "منتجات نهائية", NameEn = "Finished Products" }
            };
            context.ProductCategories.AddRange(categories);
            context.SaveChanges();

            // إنشاء منتجات تجريبية
            var products = new List<Product>
            {
                new Product
                {
                    AccountId = defaultAccount.Id,
                    Code = "P001",
                    Barcode = "6281000000001",
                    Name = "منتج تجريبي 1",
                    NameEn = "Sample Product 1",
                    CategoryId = categories[0].Id,
                    CostPrice = 50,
                    SellingPrice = 75,
                    StockQuantity = 100,
                    MinStockLevel = 10,
                    TaxPercent = 15,
                    CreatedByUserId = owner.Id
                },
                new Product
                {
                    AccountId = defaultAccount.Id,
                    Code = "P002",
                    Barcode = "6281000000002",
                    Name = "منتج تجريبي 2",
                    NameEn = "Sample Product 2",
                    CategoryId = categories[0].Id,
                    CostPrice = 30,
                    SellingPrice = 50,
                    StockQuantity = 200,
                    MinStockLevel = 20,
                    TaxPercent = 15,
                    CreatedByUserId = owner.Id
                }
            };
            context.Products.AddRange(products);
            context.SaveChanges();

            // ربط المنتجات بالوحدات
            var productUnits = new List<ProductUnit>
            {
                new ProductUnit
                {
                    ProductId = products[0].Id,
                    UnitId = units[0].Id, // قطعة
                    ConversionFactor = 1,
                    SellingPrice = 75,
                    CostPrice = 50,
                    IsDefault = true
                },
                new ProductUnit
                {
                    ProductId = products[0].Id,
                    UnitId = units[5].Id, // كرتون
                    ConversionFactor = 12,
                    SellingPrice = 850,
                    CostPrice = 550,
                    IsDefault = false
                },
                new ProductUnit
                {
                    ProductId = products[1].Id,
                    UnitId = units[0].Id, // قطعة
                    ConversionFactor = 1,
                    SellingPrice = 50,
                    CostPrice = 30,
                    IsDefault = true
                }
            };
            context.ProductUnits.AddRange(productUnits);
            context.SaveChanges();

            // إنشاء عملاء تجريبيين
            var customers = new List<Customer>
            {
                new Customer
                {
                    AccountId = defaultAccount.Id,
                    Code = "C001",
                    Name = "عميل نقدي",
                    NameEn = "Cash Customer",
                    Type = CustomerType.Individual,
                    CreatedByUserId = owner.Id
                },
                new Customer
                {
                    AccountId = defaultAccount.Id,
                    Code = "C002",
                    Name = "شركة الفرسان",
                    NameEn = "Al-Fursan Company",
                    Type = CustomerType.Company,
                    TaxNumber = "300000000000003",
                    CreditLimit = 50000,
                    CreatedByUserId = owner.Id
                }
            };
            context.Customers.AddRange(customers);
            context.SaveChanges();

            // إنشاء تصنيفات المصروفات
            var expenseCategories = new List<ExpenseCategory>
            {
                new ExpenseCategory { AccountId = defaultAccount.Id, Code = "EXP001", Name = "مصاريف تشغيلية", NameEn = "Operating Expenses" },
                new ExpenseCategory { AccountId = defaultAccount.Id, Code = "EXP002", Name = "مصاريف إدارية", NameEn = "Administrative Expenses" },
                new ExpenseCategory { AccountId = defaultAccount.Id, Code = "EXP003", Name = "مصاريف رواتب", NameEn = "Salary Expenses" }
            };
            context.ExpenseCategories.AddRange(expenseCategories);
            context.SaveChanges();

            // إنشاء تصنيفات الإيرادات
            var revenueCategories = new List<RevenueCategory>
            {
                new RevenueCategory { AccountId = defaultAccount.Id, Code = "REV001", Name = "إيرادات مبيعات", NameEn = "Sales Revenue" },
                new RevenueCategory { AccountId = defaultAccount.Id, Code = "REV002", Name = "إيرادات خدمات", NameEn = "Service Revenue" },
                new RevenueCategory { AccountId = defaultAccount.Id, Code = "REV003", Name = "إيرادات أخرى", NameEn = "Other Revenue" }
            };
            context.RevenueCategories.AddRange(revenueCategories);
            context.SaveChanges();
        }

        /// <summary>
        /// إنشاء الصلاحيات الافتراضية
        /// </summary>
        private static List<Permission> CreateDefaultPermissions()
        {
            var permissions = new List<Permission>();
            int sortOrder = 1;

            // صلاحيات لوحة التحكم
            permissions.Add(new Permission { Code = "dashboard.view", Name = "عرض لوحة التحكم", NameEn = "View Dashboard", Module = "Dashboard", Type = PermissionType.View, SortOrder = sortOrder++ });

            // صلاحيات المنتجات
            permissions.Add(new Permission { Code = "products.view", Name = "عرض المنتجات", NameEn = "View Products", Module = "Products", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "products.create", Name = "إنشاء منتج", NameEn = "Create Product", Module = "Products", Type = PermissionType.Create, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "products.edit", Name = "تعديل منتج", NameEn = "Edit Product", Module = "Products", Type = PermissionType.Edit, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "products.delete", Name = "حذف منتج", NameEn = "Delete Product", Module = "Products", Type = PermissionType.Delete, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "products.export", Name = "تصدير المنتجات", NameEn = "Export Products", Module = "Products", Type = PermissionType.Export, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "products.import", Name = "استيراد المنتجات", NameEn = "Import Products", Module = "Products", Type = PermissionType.Import, SortOrder = sortOrder++ });

            // صلاحيات العملاء
            permissions.Add(new Permission { Code = "customers.view", Name = "عرض العملاء", NameEn = "View Customers", Module = "Customers", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "customers.create", Name = "إنشاء عميل", NameEn = "Create Customer", Module = "Customers", Type = PermissionType.Create, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "customers.edit", Name = "تعديل عميل", NameEn = "Edit Customer", Module = "Customers", Type = PermissionType.Edit, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "customers.delete", Name = "حذف عميل", NameEn = "Delete Customer", Module = "Customers", Type = PermissionType.Delete, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "customers.export", Name = "تصدير العملاء", NameEn = "Export Customers", Module = "Customers", Type = PermissionType.Export, SortOrder = sortOrder++ });

            // صلاحيات الفواتير
            permissions.Add(new Permission { Code = "invoices.view", Name = "عرض الفواتير", NameEn = "View Invoices", Module = "Invoices", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "invoices.create", Name = "إنشاء فاتورة", NameEn = "Create Invoice", Module = "Invoices", Type = PermissionType.Create, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "invoices.edit", Name = "تعديل فاتورة", NameEn = "Edit Invoice", Module = "Invoices", Type = PermissionType.Edit, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "invoices.delete", Name = "حذف فاتورة", NameEn = "Delete Invoice", Module = "Invoices", Type = PermissionType.Delete, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "invoices.print", Name = "طباعة فاتورة", NameEn = "Print Invoice", Module = "Invoices", Type = PermissionType.Print, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "invoices.approve", Name = "اعتماد فاتورة", NameEn = "Approve Invoice", Module = "Invoices", Type = PermissionType.Approve, SortOrder = sortOrder++ });

            // صلاحيات المصروفات
            permissions.Add(new Permission { Code = "expenses.view", Name = "عرض المصروفات", NameEn = "View Expenses", Module = "Expenses", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "expenses.create", Name = "إنشاء مصروف", NameEn = "Create Expense", Module = "Expenses", Type = PermissionType.Create, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "expenses.edit", Name = "تعديل مصروف", NameEn = "Edit Expense", Module = "Expenses", Type = PermissionType.Edit, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "expenses.delete", Name = "حذف مصروف", NameEn = "Delete Expense", Module = "Expenses", Type = PermissionType.Delete, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "expenses.approve", Name = "اعتماد مصروف", NameEn = "Approve Expense", Module = "Expenses", Type = PermissionType.Approve, SortOrder = sortOrder++ });

            // صلاحيات الإيرادات
            permissions.Add(new Permission { Code = "revenues.view", Name = "عرض الإيرادات", NameEn = "View Revenues", Module = "Revenues", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "revenues.create", Name = "إنشاء إيراد", NameEn = "Create Revenue", Module = "Revenues", Type = PermissionType.Create, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "revenues.edit", Name = "تعديل إيراد", NameEn = "Edit Revenue", Module = "Revenues", Type = PermissionType.Edit, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "revenues.delete", Name = "حذف إيراد", NameEn = "Delete Revenue", Module = "Revenues", Type = PermissionType.Delete, SortOrder = sortOrder++ });

            // صلاحيات التقارير
            permissions.Add(new Permission { Code = "reports.view", Name = "عرض التقارير", NameEn = "View Reports", Module = "Reports", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "reports.financial", Name = "التقارير المالية", NameEn = "Financial Reports", Module = "Reports", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "reports.sales", Name = "تقارير المبيعات", NameEn = "Sales Reports", Module = "Reports", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "reports.export", Name = "تصدير التقارير", NameEn = "Export Reports", Module = "Reports", Type = PermissionType.Export, SortOrder = sortOrder++ });

            // صلاحيات المستخدمين
            permissions.Add(new Permission { Code = "users.view", Name = "عرض المستخدمين", NameEn = "View Users", Module = "Users", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "users.create", Name = "إنشاء مستخدم", NameEn = "Create User", Module = "Users", Type = PermissionType.Create, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "users.edit", Name = "تعديل مستخدم", NameEn = "Edit User", Module = "Users", Type = PermissionType.Edit, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "users.delete", Name = "حذف مستخدم", NameEn = "Delete User", Module = "Users", Type = PermissionType.Delete, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "users.roles", Name = "إدارة أدوار المستخدم", NameEn = "Manage User Roles", Module = "Users", Type = PermissionType.Edit, SortOrder = sortOrder++ });

            // صلاحيات الأدوار
            permissions.Add(new Permission { Code = "roles.view", Name = "عرض الأدوار", NameEn = "View Roles", Module = "Roles", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "roles.create", Name = "إنشاء دور", NameEn = "Create Role", Module = "Roles", Type = PermissionType.Create, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "roles.edit", Name = "تعديل دور", NameEn = "Edit Role", Module = "Roles", Type = PermissionType.Edit, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "roles.delete", Name = "حذف دور", NameEn = "Delete Role", Module = "Roles", Type = PermissionType.Delete, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "roles.permissions", Name = "إدارة صلاحيات الدور", NameEn = "Manage Role Permissions", Module = "Roles", Type = PermissionType.Edit, SortOrder = sortOrder++ });

            // صلاحيات الإعدادات
            permissions.Add(new Permission { Code = "settings.view", Name = "عرض الإعدادات", NameEn = "View Settings", Module = "Settings", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "settings.edit", Name = "تعديل الإعدادات", NameEn = "Edit Settings", Module = "Settings", Type = PermissionType.Edit, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "settings.account", Name = "إعدادات الحساب", NameEn = "Account Settings", Module = "Settings", Type = PermissionType.Edit, SortOrder = sortOrder++ });

            // صلاحيات الإشعارات
            permissions.Add(new Permission { Code = "notifications.view", Name = "عرض الإشعارات", NameEn = "View Notifications", Module = "Notifications", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "notifications.send", Name = "إرسال إشعارات", NameEn = "Send Notifications", Module = "Notifications", Type = PermissionType.Create, SortOrder = sortOrder++ });

            // صلاحيات سجل النشاط
            permissions.Add(new Permission { Code = "activitylogs.view", Name = "عرض سجل النشاط", NameEn = "View Activity Logs", Module = "ActivityLogs", Type = PermissionType.View, SortOrder = sortOrder++ });
            permissions.Add(new Permission { Code = "activitylogs.delete", Name = "حذف سجل النشاط", NameEn = "Delete Activity Logs", Module = "ActivityLogs", Type = PermissionType.Delete, SortOrder = sortOrder++ });

            return permissions;
        }

        /// <summary>
        /// إنشاء الأدوار الافتراضية
        /// </summary>
        private static List<Role> CreateDefaultRoles(int accountId)
        {
            return new List<Role>
            {
                new Role
                {
                    AccountId = accountId,
                    Name = "مدير عام",
                    NameEn = "Super Admin",
                    Description = "مدير النظام - كامل الصلاحيات",
                    IsSystemRole = true,
                    Color = "#ef4444",
                    Icon = "admin_panel_settings"
                },
                new Role
                {
                    AccountId = accountId,
                    Name = "مدير",
                    NameEn = "Manager",
                    Description = "مدير القسم - صلاحيات إدارية واسعة",
                    IsSystemRole = true,
                    Color = "#f97316",
                    Icon = "supervisor_account"
                },
                new Role
                {
                    AccountId = accountId,
                    Name = "محاسب",
                    NameEn = "Accountant",
                    Description = "محاسب - صلاحيات مالية",
                    IsSystemRole = true,
                    Color = "#22c55e",
                    Icon = "account_balance"
                },
                new Role
                {
                    AccountId = accountId,
                    Name = "مبيعات",
                    NameEn = "Sales",
                    Description = "موظف مبيعات - صلاحيات الفواتير والعملاء",
                    IsSystemRole = true,
                    Color = "#3b82f6",
                    Icon = "point_of_sale"
                },
                new Role
                {
                    AccountId = accountId,
                    Name = "مستخدم",
                    NameEn = "User",
                    Description = "مستخدم عادي - صلاحيات محدودة",
                    IsSystemRole = true,
                    Color = "#6b7280",
                    Icon = "person"
                }
            };
        }

        /// <summary>
        /// ربط الصلاحيات بالأدوار
        /// </summary>
        private static void AssignPermissionsToRoles(ApplicationDbContext context, List<Role> roles, List<Permission> permissions)
        {
            var adminRole = roles.First(r => r.Name == "مدير عام");
            var managerRole = roles.First(r => r.Name == "مدير");
            var accountantRole = roles.First(r => r.Name == "محاسب");
            var salesRole = roles.First(r => r.Name == "مبيعات");
            var userRole = roles.First(r => r.Name == "مستخدم");

            // المدير العام - كل الصلاحيات
            foreach (var permission in permissions)
            {
                context.RolePermissions.Add(new RolePermission
                {
                    RoleId = adminRole.Id,
                    PermissionId = permission.Id
                });
            }

            // المدير - معظم الصلاحيات ما عدا الإعدادات الحساسة
            var managerPermissions = permissions.Where(p =>
                !p.Code.StartsWith("settings.") &&
                !p.Code.Contains("delete") ||
                p.Code == "settings.view"
            );
            foreach (var permission in managerPermissions)
            {
                context.RolePermissions.Add(new RolePermission
                {
                    RoleId = managerRole.Id,
                    PermissionId = permission.Id
                });
            }

            // المحاسب - صلاحيات مالية
            var accountantPermissions = permissions.Where(p =>
                p.Module == "Dashboard" ||
                p.Module == "Products" && p.Type == PermissionType.View ||
                p.Module == "Customers" ||
                p.Module == "Invoices" ||
                p.Module == "Expenses" ||
                p.Module == "Revenues" ||
                p.Module == "Reports"
            );
            foreach (var permission in accountantPermissions)
            {
                context.RolePermissions.Add(new RolePermission
                {
                    RoleId = accountantRole.Id,
                    PermissionId = permission.Id
                });
            }

            // المبيعات - صلاحيات المبيعات فقط
            var salesPermissions = permissions.Where(p =>
                p.Module == "Dashboard" ||
                p.Module == "Products" && p.Type == PermissionType.View ||
                p.Module == "Customers" ||
                p.Module == "Invoices" && (p.Type == PermissionType.View || p.Type == PermissionType.Create || p.Type == PermissionType.Print)
            );
            foreach (var permission in salesPermissions)
            {
                context.RolePermissions.Add(new RolePermission
                {
                    RoleId = salesRole.Id,
                    PermissionId = permission.Id
                });
            }

            // المستخدم العادي - عرض فقط
            var userPermissions = permissions.Where(p =>
                p.Code == "dashboard.view" ||
                p.Code == "products.view" ||
                p.Code == "customers.view"
            );
            foreach (var permission in userPermissions)
            {
                context.RolePermissions.Add(new RolePermission
                {
                    RoleId = userRole.Id,
                    PermissionId = permission.Id
                });
            }

            context.SaveChanges();
        }

        /// <summary>
        /// إنشاء عناصر القائمة الافتراضية
        /// </summary>
        private static List<MenuItem> CreateDefaultMenuItems()
        {
            return new List<MenuItem>
            {
                // القائمة الرئيسية
                new MenuItem { Code = "dashboard", Title = "لوحة التحكم", TitleEn = "Dashboard", Icon = "dashboard", Path = "/dashboard", RequiredPermission = "dashboard.view", SortOrder = 1, ShowInSidebar = true },
                
                // المنتجات
                new MenuItem { Code = "products", Title = "المنتجات", TitleEn = "Products", Icon = "inventory_2", Path = "/products", RequiredPermission = "products.view", SortOrder = 2, ShowInSidebar = true },
                
                // العملاء
                new MenuItem { Code = "customers", Title = "العملاء", TitleEn = "Customers", Icon = "people", Path = "/customers", RequiredPermission = "customers.view", SortOrder = 3, ShowInSidebar = true },
                
                // الفواتير
                new MenuItem { Code = "invoices", Title = "الفواتير", TitleEn = "Invoices", Icon = "receipt_long", Path = "/invoices", RequiredPermission = "invoices.view", SortOrder = 4, ShowInSidebar = true },
                
                // المصروفات
                new MenuItem { Code = "expenses", Title = "المصروفات", TitleEn = "Expenses", Icon = "payments", Path = "/expenses", RequiredPermission = "expenses.view", SortOrder = 5, ShowInSidebar = true },
                
                // الإيرادات
                new MenuItem { Code = "revenues", Title = "الإيرادات", TitleEn = "Revenues", Icon = "account_balance", Path = "/revenues", RequiredPermission = "revenues.view", SortOrder = 6, ShowInSidebar = true },
                
                // التقارير
                new MenuItem { Code = "reports", Title = "التقارير", TitleEn = "Reports", Icon = "assessment", Path = "/reports", RequiredPermission = "reports.view", SortOrder = 7, ShowInSidebar = true },
                
                // الإدارة (لوحة المدير)
                new MenuItem { Code = "admin", Title = "الإدارة", TitleEn = "Admin", Icon = "admin_panel_settings", Path = "/admin", RequiredPermission = "users.view", SortOrder = 8, ShowInSidebar = true },
                
                // الإعدادات
                new MenuItem { Code = "settings", Title = "الإعدادات", TitleEn = "Settings", Icon = "settings", Path = "/settings", RequiredPermission = "settings.view", SortOrder = 9, ShowInSidebar = true }
            };
        }
    }
}
