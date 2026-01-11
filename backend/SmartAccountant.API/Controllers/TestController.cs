using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;

namespace SmartAccountant.API.Controllers
{
    /// <summary>
    /// Controller لاختبار الاتصال بقاعدة البيانات وتجربة الـ API
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class TestController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public TestController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        /// <summary>
        /// اختبار بسيط - هل الـ API يعمل؟
        /// </summary>
        [HttpGet("ping")]
        public IActionResult Ping()
        {
            return Ok(new
            {
                success = true,
                message = "🚀 API is running!",
                timestamp = DateTime.UtcNow,
                server = Environment.MachineName
            });
        }

        /// <summary>
        /// اختبار الاتصال بقاعدة البيانات
        /// </summary>
        [HttpGet("db-connection")]
        public async Task<IActionResult> TestDbConnection()
        {
            try
            {
                var canConnect = await _context.Database.CanConnectAsync();
                
                if (canConnect)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "✅ Database connection successful!",
                        database = _context.Database.GetDbConnection().Database,
                        server = _context.Database.GetDbConnection().DataSource,
                        timestamp = DateTime.UtcNow
                    });
                }
                
                return StatusCode(500, new
                {
                    success = false,
                    message = "❌ Cannot connect to database",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "❌ Database connection failed",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// الحصول على إحصائيات قاعدة البيانات
        /// </summary>
        [HttpGet("db-stats")]
        public async Task<IActionResult> GetDbStats()
        {
            try
            {
                var stats = new
                {
                    success = true,
                    message = "📊 Database Statistics",
                    data = new
                    {
                        currencies = await _context.Currencies.CountAsync(),
                        accounts = await _context.Accounts.CountAsync(),
                        users = await _context.Users.CountAsync(),
                        roles = await _context.Roles.CountAsync(),
                        permissions = await _context.Permissions.CountAsync(),
                        products = await _context.Products.CountAsync(),
                        productCategories = await _context.ProductCategories.CountAsync(),
                        customers = await _context.Customers.CountAsync(),
                        invoices = await _context.Invoices.CountAsync(),
                        expenses = await _context.Expenses.CountAsync(),
                        revenues = await _context.Revenues.CountAsync(),
                        units = await _context.Units.CountAsync(),
                        menuItems = await _context.MenuItems.CountAsync(),
                        phoneNumbers = await _context.PhoneNumbers.CountAsync(),
                        emails = await _context.Emails.CountAsync()
                    },
                    timestamp = DateTime.UtcNow
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "❌ Failed to get database stats",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// الحصول على جميع العملات
        /// </summary>
        [HttpGet("currencies")]
        public async Task<IActionResult> GetCurrencies()
        {
            try
            {
                var currencies = await _context.Currencies
                    .Where(c => c.IsActive)
                    .OrderBy(c => c.Id)
                    .Select(c => new
                    {
                        c.Id,
                        c.Code,
                        c.Name,
                        c.NameEn,
                        c.Symbol,
                        c.Country,
                        c.Flag,
                        c.ExchangeRate,
                        c.IsDefault
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = currencies.Count,
                    data = currencies
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// الحصول على جميع الأدوار
        /// </summary>
        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            try
            {
                var roles = await _context.Roles
                    .Where(r => r.IsActive)
                    .OrderBy(r => r.Id)
                    .Select(r => new
                    {
                        r.Id,
                        r.Name,
                        r.NameEn,
                        r.Description,
                        r.Color,
                        r.Icon,
                        r.IsSystemRole
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = roles.Count,
                    data = roles
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// الحصول على جميع الصلاحيات
        /// </summary>
        [HttpGet("permissions")]
        public async Task<IActionResult> GetPermissions()
        {
            try
            {
                var permissions = await _context.Permissions
                    .OrderBy(p => p.SortOrder)
                    .Select(p => new
                    {
                        p.Id,
                        p.Code,
                        p.Name,
                        p.NameEn,
                        p.Module,
                        p.Type,
                        p.Description
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = permissions.Count,
                    data = permissions
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// الحصول على جميع المستخدمين
        /// </summary>
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            try
            {
                var users = await _context.Users
                    .Where(u => u.IsActive)
                    .OrderBy(u => u.Id)
                    .Select(u => new
                    {
                        u.Id,
                        u.Username,
                        u.FullName,
                        u.Email,
                        u.RoleType,
                        u.IsSuperAdmin,
                        u.IsActive,
                        u.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = users.Count,
                    data = users
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// الحصول على جميع العملاء
        /// </summary>
        [HttpGet("customers")]
        public async Task<IActionResult> GetCustomers()
        {
            try
            {
                var customers = await _context.Customers
                    .Include(c => c.PrimaryPhone)
                    .Include(c => c.PrimaryEmail)
                    .Where(c => c.IsActive)
                    .OrderBy(c => c.Id)
                    .Select(c => new
                    {
                        c.Id,
                        c.Code,
                        c.Name,
                        c.NameEn,
                        Phone = c.PrimaryPhone != null ? c.PrimaryPhone.Phone : null,
                        Email = c.PrimaryEmail != null ? c.PrimaryEmail.EmailAddress : null,
                        c.City,
                        c.Type,
                        c.Balance,
                        c.CreditLimit,
                        c.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = customers.Count,
                    data = customers
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// الحصول على جميع المنتجات
        /// </summary>
        [HttpGet("products")]
        public async Task<IActionResult> GetProducts()
        {
            try
            {
                var products = await _context.Products
                    .Where(p => p.IsActive)
                    .OrderBy(p => p.Id)
                    .Select(p => new
                    {
                        p.Id,
                        p.Code,
                        p.Barcode,
                        p.Name,
                        p.NameEn,
                        p.CostPrice,
                        p.SellingPrice,
                        p.StockQuantity,
                        p.MinStockLevel,
                        p.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = products.Count,
                    data = products
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// الحصول على عناصر القائمة
        /// </summary>
        [HttpGet("menu-items")]
        public async Task<IActionResult> GetMenuItems()
        {
            try
            {
                var menuItems = await _context.MenuItems
                    .Where(m => m.IsActive)
                    .OrderBy(m => m.SortOrder)
                    .Select(m => new
                    {
                        m.Id,
                        m.Code,
                        m.Title,
                        m.TitleEn,
                        m.Icon,
                        m.Path,
                        m.ParentId,
                        m.SortOrder,
                        m.RequiredPermission,
                        m.ShowInSidebar
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = menuItems.Count,
                    data = menuItems
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// الحصول على الوحدات
        /// </summary>
        [HttpGet("units")]
        public async Task<IActionResult> GetUnits()
        {
            try
            {
                var units = await _context.Units
                    .Where(u => u.IsActive)
                    .OrderBy(u => u.Id)
                    .Select(u => new
                    {
                        u.Id,
                        u.Name,
                        u.NameEn,
                        u.Symbol,
                        u.IsBase,
                        u.ConversionFactor
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = units.Count,
                    data = units
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// الحصول على تصنيفات المنتجات
        /// </summary>
        [HttpGet("product-categories")]
        public async Task<IActionResult> GetProductCategories()
        {
            try
            {
                var categories = await _context.ProductCategories
                    .Where(c => c.IsActive)
                    .OrderBy(c => c.Id)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.NameEn,
                        c.ParentCategoryId
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = categories.Count,
                    data = categories
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// الحصول على تصنيفات المصروفات
        /// </summary>
        [HttpGet("expense-categories")]
        public async Task<IActionResult> GetExpenseCategories()
        {
            try
            {
                var categories = await _context.ExpenseCategories
                    .Where(c => c.IsActive)
                    .OrderBy(c => c.Id)
                    .Select(c => new
                    {
                        c.Id,
                        c.Code,
                        c.Name,
                        c.NameEn
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = categories.Count,
                    data = categories
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// الحصول على تصنيفات الإيرادات
        /// </summary>
        [HttpGet("revenue-categories")]
        public async Task<IActionResult> GetRevenueCategories()
        {
            try
            {
                var categories = await _context.RevenueCategories
                    .Where(c => c.IsActive)
                    .OrderBy(c => c.Id)
                    .Select(c => new
                    {
                        c.Id,
                        c.Code,
                        c.Name,
                        c.NameEn
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = categories.Count,
                    data = categories
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// اختبار شامل للنظام
        /// </summary>
        [HttpGet("health")]
        public async Task<IActionResult> HealthCheck()
        {
            var checks = new List<object>();
            var allPassed = true;

            // 1. Database Connection
            try
            {
                var canConnect = await _context.Database.CanConnectAsync();
                checks.Add(new { name = "Database Connection", status = canConnect ? "✅ Pass" : "❌ Fail", passed = canConnect });
                if (!canConnect) allPassed = false;
            }
            catch (Exception ex)
            {
                checks.Add(new { name = "Database Connection", status = "❌ Fail", passed = false, error = ex.Message });
                allPassed = false;
            }

            // 2. Currencies Table
            try
            {
                var count = await _context.Currencies.CountAsync();
                checks.Add(new { name = "Currencies Table", status = count > 0 ? $"✅ Pass ({count} records)" : "⚠️ Empty", passed = count > 0, count });
            }
            catch (Exception ex)
            {
                checks.Add(new { name = "Currencies Table", status = "❌ Fail", passed = false, error = ex.Message });
                allPassed = false;
            }

            // 3. Users Table
            try
            {
                var count = await _context.Users.CountAsync();
                checks.Add(new { name = "Users Table", status = count > 0 ? $"✅ Pass ({count} records)" : "⚠️ Empty", passed = count > 0, count });
            }
            catch (Exception ex)
            {
                checks.Add(new { name = "Users Table", status = "❌ Fail", passed = false, error = ex.Message });
                allPassed = false;
            }

            // 4. Roles Table
            try
            {
                var count = await _context.Roles.CountAsync();
                checks.Add(new { name = "Roles Table", status = count > 0 ? $"✅ Pass ({count} records)" : "⚠️ Empty", passed = count > 0, count });
            }
            catch (Exception ex)
            {
                checks.Add(new { name = "Roles Table", status = "❌ Fail", passed = false, error = ex.Message });
                allPassed = false;
            }

            // 5. Permissions Table
            try
            {
                var count = await _context.Permissions.CountAsync();
                checks.Add(new { name = "Permissions Table", status = count > 0 ? $"✅ Pass ({count} records)" : "⚠️ Empty", passed = count > 0, count });
            }
            catch (Exception ex)
            {
                checks.Add(new { name = "Permissions Table", status = "❌ Fail", passed = false, error = ex.Message });
                allPassed = false;
            }

            return Ok(new
            {
                success = allPassed,
                message = allPassed ? "All health checks passed!" : "Some checks failed",
                checks,
                timestamp = DateTime.UtcNow
            });
        }

        /// <summary>
        /// Fix Arabic data in TransactionTypes table
        /// ملاحظة: عند كتابة SQL خام مع نصوص عربية:
        /// 1. استخدم N'' prefix للنصوص العربية (مثل N'مصروفات')
        /// 2. أو استخدم Parameters (الطريقة الأفضل)
        /// </summary>
        [HttpPost("fix-arabic-data")]
        public async Task<IActionResult> FixArabicData()
        {
            try
            {
                // الطريقة الموصى بها: استخدام Parameters
                // هذا يحمي من SQL Injection ويتعامل مع Unicode تلقائياً
                var sql = @"UPDATE TransactionTypes 
                           SET Name = {0}, NameEn = {1}, Description = {2} 
                           WHERE Code = {3}";
                
                await _context.Database.ExecuteSqlRawAsync(sql, 
                    "مصروفات عامة", "General Expenses", "المصروفات العامة", "EXPENSE");
                
                await _context.Database.ExecuteSqlRawAsync(sql, 
                    "مشتريات", "Purchases", "مشتريات البضاعة", "PURCHASE");
                
                await _context.Database.ExecuteSqlRawAsync(sql, 
                    "إيرادات أخرى", "Other Income", "إيرادات أخرى", "OTHER_INCOME");

                // ملاحظة: الطريقة القديمة (لا تزال تعمل مع N'' prefix):
                // var sql1 = "UPDATE TransactionTypes SET Name = N'مصروفات عامة' WHERE Code = 'EXPENSE'";
                // await _context.Database.ExecuteSqlRawAsync(sql1);

                return Ok(new { success = true, message = "Arabic data fixed" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }
    }
}

