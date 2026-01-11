using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Services;

namespace SmartAccountant.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;

        public AccountsController(ApplicationDbContext context, IActivityLogService activityLog)
        {
            _context = context;
            _activityLog = activityLog;
        }

        private int GetUserId()
        {
            if (Request.Headers.TryGetValue("X-User-Id", out var userIdHeader) && 
                int.TryParse(userIdHeader, out var userId))
            {
                return userId;
            }
            return 1;
        }

        // GET: api/Accounts
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AccountDto>>> GetAccounts()
        {
            var accounts = await _context.Accounts
                .Select(a => new AccountDto
                {
                    Id = a.Id,
                    Name = a.Name,
                    NameEn = a.NameEn,
                    Email = a.Email,
                    Phone = a.Phone,
                    Currency = a.CurrencySymbol,
                    CurrencyId = a.CurrencyId,
                    Plan = a.Plan.ToString(),
                    UsersCount = a.Users.Count,
                    IsActive = a.IsActive,
                    CreatedAt = a.CreatedAt,
                    SubscriptionExpiry = a.SubscriptionExpiry,
                    MaxMessageLength = a.MaxMessageLength,
                    MaxNotificationLength = a.MaxNotificationLength
                })
                .ToListAsync();

            return Ok(accounts);
        }

        // GET: api/Accounts/5
        [HttpGet("{id}")]
        public async Task<ActionResult<AccountDetailDto>> GetAccount(int id)
        {
            var account = await _context.Accounts
                .Include(a => a.Users)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (account == null)
            {
                return NotFound();
            }

            return new AccountDetailDto
            {
                Id = account.Id,
                Name = account.Name,
                NameEn = account.NameEn,
                Email = account.Email,
                Phone = account.Phone,
                Address = account.Address,
                Currency = account.CurrencySymbol,
                CurrencyId = account.CurrencyId,
                TaxNumber = account.TaxNumber,
                LogoUrl = account.LogoUrl,
                Plan = account.Plan.ToString(),
                IsActive = account.IsActive,
                CreatedAt = account.CreatedAt,
                SubscriptionExpiry = account.SubscriptionExpiry,
                MaxMessageLength = account.MaxMessageLength,
                MaxNotificationLength = account.MaxNotificationLength,
                Users = account.Users.Select(u => new UserDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    FullName = u.FullName,
                    Email = u.Email,
                    Role = u.RoleType.ToString(),
                    IsActive = u.IsActive,
                    LastLoginAt = u.LastLoginAt
                }).ToList()
            };
        }

        // POST: api/Accounts
        [HttpPost]
        public async Task<ActionResult<Account>> CreateAccount(CreateAccountDto dto)
        {
            try
            {
                // التحقق من البيانات المطلوبة
                if (string.IsNullOrWhiteSpace(dto.Name))
                    return BadRequest(new { message = "اسم الحساب مطلوب" });
                if (string.IsNullOrWhiteSpace(dto.AdminUsername))
                    return BadRequest(new { message = "اسم المستخدم المسؤول مطلوب" });
                if (string.IsNullOrWhiteSpace(dto.AdminPassword))
                    return BadRequest(new { message = "كلمة مرور المسؤول مطلوبة" });

                // التحقق من عدم تكرار اسم المستخدم
                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.AdminUsername);
                if (existingUser != null)
                    return BadRequest(new { message = "اسم المستخدم موجود مسبقاً" });

                // جلب العملة الافتراضية إذا لم تُحدد
                var currencyId = dto.CurrencyId;
                var currencySymbol = dto.CurrencySymbol ?? "ج.م";
                if (!currencyId.HasValue || currencyId.Value == 0)
                {
                    var defaultCurrency = await _context.Currencies.FirstOrDefaultAsync();
                    if (defaultCurrency != null)
                    {
                        currencyId = defaultCurrency.Id;
                        currencySymbol = defaultCurrency.Symbol ?? currencySymbol;
                    }
                    else
                    {
                        return BadRequest(new { message = "لا توجد عملات في النظام. يرجى إضافة عملة أولاً." });
                    }
                }

                var account = new Account
                {
                    Name = dto.Name,
                    NameEn = dto.NameEn,
                    Email = dto.Email,
                    Phone = dto.Phone,
                    Address = dto.Address,
                    CurrencyId = currencyId.Value,
                    CurrencySymbol = currencySymbol,
                    TaxNumber = dto.TaxNumber,
                    Plan = AccountPlan.Trial,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    SubscriptionExpiry = DateTime.UtcNow.AddDays(30) // 30 يوم تجريبي
                };

                _context.Accounts.Add(account);
                await _context.SaveChangesAsync();

                // إنشاء المستخدم الأول (المالك)
                var owner = new User
                {
                    AccountId = account.Id,
                    Username = dto.AdminUsername,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.AdminPassword),
                    FullName = dto.AdminFullName ?? dto.Name,
                    Email = dto.Email,
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

                _context.Users.Add(owner);
                await _context.SaveChangesAsync();

                // إنشاء البيانات الأساسية للحساب الجديد
                await CreateDefaultDataForAccount(account.Id, owner.Id);

                // تسجيل النشاط
                await _activityLog.LogAsync(account.Id, owner.Id, ActivityActions.Create, EntityTypes.Account,
                    account.Id, account.Name, $"تم إنشاء حساب جديد: {account.Name}");

                return CreatedAtAction(nameof(GetAccount), new { id = account.Id }, account);
            }
            catch (Exception ex)
            {
                // عرض رسالة الخطأ الكاملة مع جميع Inner Exceptions
                var errorMessage = ex.Message;
                var innerEx = ex.InnerException;
                var details = new List<string>();
                
                while (innerEx != null)
                {
                    details.Add(innerEx.Message);
                    innerEx = innerEx.InnerException;
                }
                
                return StatusCode(500, new { 
                    message = $"خطأ في إنشاء الحساب: {errorMessage}", 
                    details = string.Join(" -> ", details),
                    stackTrace = ex.StackTrace?.Substring(0, Math.Min(500, ex.StackTrace?.Length ?? 0))
                });
            }
        }

        // PUT: api/Accounts/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAccount(int id, UpdateAccountDto dto)
        {
            var account = await _context.Accounts.FindAsync(id);
            if (account == null)
            {
                return NotFound();
            }

            var oldName = account.Name;
            account.Name = dto.Name ?? account.Name;
            account.NameEn = dto.NameEn ?? account.NameEn;
            account.Email = dto.Email ?? account.Email;
            account.Phone = dto.Phone ?? account.Phone;
            account.Address = dto.Address ?? account.Address;
            account.CurrencyId = dto.CurrencyId ?? account.CurrencyId;
            account.CurrencySymbol = dto.CurrencySymbol ?? account.CurrencySymbol;
            account.TaxNumber = dto.TaxNumber ?? account.TaxNumber;
            account.LogoUrl = dto.LogoUrl ?? account.LogoUrl;
            
            // تحديث حدود الحروف
            if (dto.MaxMessageLength.HasValue)
                account.MaxMessageLength = dto.MaxMessageLength.Value;
            if (dto.MaxNotificationLength.HasValue)
                account.MaxNotificationLength = dto.MaxNotificationLength.Value;

            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(id, GetUserId(), ActivityActions.Update, EntityTypes.Account,
                id, account.Name, $"تم تعديل بيانات الحساب: {account.Name}");

            return NoContent();
        }

        // PUT: api/Accounts/5/logo
        [HttpPut("{id}/logo")]
        public async Task<IActionResult> UpdateAccountLogo(int id, [FromBody] UpdateLogoDto dto)
        {
            var account = await _context.Accounts.FindAsync(id);
            if (account == null)
            {
                return NotFound();
            }

            var hadLogo = !string.IsNullOrEmpty(account.LogoUrl);
            var hasNewLogo = !string.IsNullOrEmpty(dto.LogoUrl);
            
            account.LogoUrl = dto.LogoUrl;
            account.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            var action = hasNewLogo ? ActivityActions.UpdateLogo : "حذف الشعار";
            var description = hasNewLogo ? $"تم تحديث شعار الحساب: {account.Name}" : $"تم حذف شعار الحساب: {account.Name}";
            await _activityLog.LogAsync(id, GetUserId(), action, EntityTypes.Account,
                id, account.Name, description);

            return Ok(new { success = true, message = "تم تحديث الشعار بنجاح", logoUrl = account.LogoUrl });
        }

        // DELETE: api/Accounts/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAccount(int id)
        {
            var account = await _context.Accounts.FindAsync(id);
            if (account == null)
            {
                return NotFound();
            }

            // تسجيل النشاط قبل الحذف
            await _activityLog.LogAsync(id, GetUserId(), ActivityActions.Delete, EntityTypes.Account,
                id, account.Name, $"تم حذف الحساب: {account.Name}");

            // Soft delete
            account.IsActive = false;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PATCH: api/Accounts/5/status - تغيير حالة الحساب (تنشيط/تعطيل)
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> ToggleAccountStatus(int id, [FromBody] ToggleStatusDto dto)
        {
            var account = await _context.Accounts.FindAsync(id);
            if (account == null)
            {
                return NotFound(new { message = "الحساب غير موجود" });
            }

            account.IsActive = dto.IsActive;
            account.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            var action = dto.IsActive ? "تفعيل الحساب" : "تعطيل الحساب";
            var description = dto.IsActive ? $"تم تفعيل الحساب: {account.Name}" : $"تم تعطيل الحساب: {account.Name}";
            await _activityLog.LogAsync(id, GetUserId(), action, EntityTypes.Account,
                id, account.Name, description);

            return Ok(new { success = true, message = dto.IsActive ? "تم تفعيل الحساب" : "تم تعطيل الحساب", isActive = account.IsActive });
        }

        // إنشاء البيانات الأساسية للحساب الجديد
        private async Task CreateDefaultDataForAccount(int accountId, int userId)
        {
            try
            {
                // إنشاء وحدات القياس الأساسية
                var units = new List<Unit>
                {
                    new Unit { AccountId = accountId, Name = "قطعة", NameEn = "Piece", Symbol = "PCS", IsBase = true, CreatedByUserId = userId },
                    new Unit { AccountId = accountId, Name = "كيلوجرام", NameEn = "Kilogram", Symbol = "KG", IsBase = true, CreatedByUserId = userId },
                    new Unit { AccountId = accountId, Name = "لتر", NameEn = "Liter", Symbol = "L", IsBase = true, CreatedByUserId = userId },
                    new Unit { AccountId = accountId, Name = "متر", NameEn = "Meter", Symbol = "M", IsBase = true, CreatedByUserId = userId },
                    new Unit { AccountId = accountId, Name = "كرتون", NameEn = "Carton", Symbol = "CTN", IsBase = false, CreatedByUserId = userId }
                };
                _context.Units.AddRange(units);
                await _context.SaveChangesAsync();

                // إنشاء تصنيفات المنتجات
                var productCategories = new List<ProductCategory>
                {
                    new ProductCategory { AccountId = accountId, Name = "منتجات عامة", NameEn = "General Products" },
                    new ProductCategory { AccountId = accountId, Name = "مواد خام", NameEn = "Raw Materials" },
                    new ProductCategory { AccountId = accountId, Name = "منتجات نهائية", NameEn = "Finished Products" }
                };
                _context.ProductCategories.AddRange(productCategories);
                await _context.SaveChangesAsync();

                // إنشاء تصنيفات المصروفات
                var expenseCategories = new List<ExpenseCategory>
                {
                    new ExpenseCategory { AccountId = accountId, Code = "EXP001", Name = "مصاريف تشغيلية", NameEn = "Operating Expenses" },
                    new ExpenseCategory { AccountId = accountId, Code = "EXP002", Name = "مصاريف إدارية", NameEn = "Administrative Expenses" },
                    new ExpenseCategory { AccountId = accountId, Code = "EXP003", Name = "مصاريف رواتب", NameEn = "Salary Expenses" }
                };
                _context.ExpenseCategories.AddRange(expenseCategories);
                await _context.SaveChangesAsync();

                // إنشاء تصنيفات الإيرادات
                var revenueCategories = new List<RevenueCategory>
                {
                    new RevenueCategory { AccountId = accountId, Code = "REV001", Name = "إيرادات مبيعات", NameEn = "Sales Revenue" },
                    new RevenueCategory { AccountId = accountId, Code = "REV002", Name = "إيرادات خدمات", NameEn = "Service Revenue" },
                    new RevenueCategory { AccountId = accountId, Code = "REV003", Name = "إيرادات أخرى", NameEn = "Other Revenue" }
                };
                _context.RevenueCategories.AddRange(revenueCategories);
                await _context.SaveChangesAsync();

                // إنشاء عميل نقدي افتراضي
                var cashCustomer = new Customer
                {
                    AccountId = accountId,
                    Code = "C001",
                    Name = "عميل نقدي",
                    NameEn = "Cash Customer",
                    Type = CustomerType.Individual,
                    CreatedByUserId = userId
                };
                _context.Customers.Add(cashCustomer);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Log the error but don't fail the account creation
                Console.WriteLine($"Error creating default data: {ex.Message}");
                Console.WriteLine($"Inner: {ex.InnerException?.Message}");
                throw; // Re-throw to show the error
            }
        }

        // GET: api/Accounts/{id}/usage
        /// <summary>
        /// الحصول على استخدام الحساب مقارنة بحدود الخطة
        /// </summary>
        [HttpGet("{id}/usage")]
        public async Task<ActionResult<AccountUsageDto>> GetAccountUsage(int id)
        {
            var account = await _context.Accounts
                .Include(a => a.PlanDetails)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (account == null)
                return NotFound(new { message = "الحساب غير موجود" });

            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var endOfMonth = startOfMonth.AddMonths(1);

            // حساب الاستخدام الحالي
            var currentUsers = await _context.Users.CountAsync(u => u.AccountId == id && u.IsActive);
            var currentMonthInvoices = await _context.Invoices.CountAsync(i => i.AccountId == id && i.InvoiceDate >= startOfMonth && i.InvoiceDate < endOfMonth);
            var currentCustomers = await _context.Customers.CountAsync(c => c.AccountId == id);
            var currentProducts = await _context.Products.CountAsync(p => p.AccountId == id);

            // جلب معلومات الاشتراك
            var subscription = await _context.Set<Subscription>()
                .Where(s => s.AccountId == id && s.Status == "active")
                .OrderByDescending(s => s.EndDate)
                .FirstOrDefaultAsync();

            var plan = account.PlanDetails;

            return new AccountUsageDto
            {
                AccountId = account.Id,
                AccountName = account.Name,
                PlanId = account.PlanId,
                PlanName = plan?.Name ?? "مجاني",
                PlanNameEn = plan?.NameEn ?? "Free",
                
                // الاستخدام الحالي
                CurrentUsers = currentUsers,
                CurrentMonthInvoices = currentMonthInvoices,
                CurrentCustomers = currentCustomers,
                CurrentProducts = currentProducts,
                
                // حدود الخطة
                MaxUsers = plan?.MaxUsers ?? 1,
                MaxInvoices = plan?.MaxInvoices ?? 50,
                MaxCustomers = plan?.MaxCustomers ?? 25,
                MaxProducts = plan?.MaxProducts ?? 50,
                
                // النسب المئوية (لعرض شريط التقدم)
                UsersPercentage = plan?.MaxUsers > 0 ? (double)currentUsers / plan.MaxUsers * 100 : 0,
                InvoicesPercentage = plan?.MaxInvoices > 0 ? (double)currentMonthInvoices / plan.MaxInvoices * 100 : 0,
                CustomersPercentage = plan?.MaxCustomers > 0 ? (double)currentCustomers / plan.MaxCustomers * 100 : 0,
                ProductsPercentage = plan?.MaxProducts > 0 ? (double)currentProducts / plan.MaxProducts * 100 : 0,
                
                // ميزات الخطة
                HasBasicReports = plan?.HasBasicReports ?? true,
                HasAdvancedReports = plan?.HasAdvancedReports ?? false,
                HasEmailSupport = plan?.HasEmailSupport ?? true,
                HasPrioritySupport = plan?.HasPrioritySupport ?? false,
                HasDedicatedManager = plan?.HasDedicatedManager ?? false,
                HasBackup = plan?.HasBackup ?? false,
                BackupFrequency = plan?.BackupFrequency,
                HasCustomInvoices = plan?.HasCustomInvoices ?? false,
                HasMultiCurrency = plan?.HasMultiCurrency ?? false,
                HasApiAccess = plan?.HasApiAccess ?? false,
                HasWhiteLabel = plan?.HasWhiteLabel ?? false,
                
                // معلومات الاشتراك
                SubscriptionStart = subscription?.StartDate,
                SubscriptionEnd = subscription?.EndDate,
                SubscriptionStatus = subscription?.Status ?? "none",
                AutoRenew = subscription?.AutoRenew ?? false,
                DaysRemaining = subscription != null ? Math.Max(0, (subscription.EndDate - DateTime.UtcNow).Days) : 0
            };
        }
    }

    // DTOs
    public class AccountUsageDto
    {
        public int AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public int? PlanId { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public string? PlanNameEn { get; set; }
        
        // الاستخدام الحالي
        public int CurrentUsers { get; set; }
        public int CurrentMonthInvoices { get; set; }
        public int CurrentCustomers { get; set; }
        public int CurrentProducts { get; set; }
        
        // حدود الخطة
        public int MaxUsers { get; set; }
        public int MaxInvoices { get; set; }
        public int MaxCustomers { get; set; }
        public int MaxProducts { get; set; }
        
        // النسب المئوية
        public double UsersPercentage { get; set; }
        public double InvoicesPercentage { get; set; }
        public double CustomersPercentage { get; set; }
        public double ProductsPercentage { get; set; }
        
        // ميزات الخطة
        public bool HasBasicReports { get; set; }
        public bool HasAdvancedReports { get; set; }
        public bool HasEmailSupport { get; set; }
        public bool HasPrioritySupport { get; set; }
        public bool HasDedicatedManager { get; set; }
        public bool HasBackup { get; set; }
        public string? BackupFrequency { get; set; }
        public bool HasCustomInvoices { get; set; }
        public bool HasMultiCurrency { get; set; }
        public bool HasApiAccess { get; set; }
        public bool HasWhiteLabel { get; set; }
        
        // معلومات الاشتراك
        public DateTime? SubscriptionStart { get; set; }
        public DateTime? SubscriptionEnd { get; set; }
        public string SubscriptionStatus { get; set; } = string.Empty;
        public bool AutoRenew { get; set; }
        public int DaysRemaining { get; set; }
    }

    public class AccountDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string Currency { get; set; } = "ج.م";
        public int? CurrencyId { get; set; }
        public string Plan { get; set; } = string.Empty;
        public int? PlanId { get; set; }
        public int UsersCount { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SubscriptionExpiry { get; set; }
        public int MaxMessageLength { get; set; }
        public int MaxNotificationLength { get; set; }
    }

    public class AccountDetailDto : AccountDto
    {
        public string? Address { get; set; }
        public string? TaxNumber { get; set; }
        public string? LogoUrl { get; set; }
        public new bool IsActive { get; set; }
        public new DateTime? SubscriptionExpiry { get; set; }
        public List<UserDto> Users { get; set; } = new();
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string Role { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime? LastLoginAt { get; set; }
    }

    public class CreateAccountDto
    {
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public int? CurrencyId { get; set; }
        public string? CurrencySymbol { get; set; }
        public string? TaxNumber { get; set; }
        public string AdminUsername { get; set; } = string.Empty;
        public string AdminPassword { get; set; } = string.Empty;
        public string AdminFullName { get; set; } = string.Empty;
    }

    public class UpdateAccountDto
    {
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public int? CurrencyId { get; set; }
        public string? CurrencySymbol { get; set; }
        public string? TaxNumber { get; set; }
        public string? LogoUrl { get; set; }
        /// <summary>
        /// الحد الأقصى لعدد حروف الرسالة (0 = بدون حد)
        /// </summary>
        public int? MaxMessageLength { get; set; }
        /// <summary>
        /// الحد الأقصى لعدد حروف الإشعار (0 = بدون حد)
        /// </summary>
        public int? MaxNotificationLength { get; set; }
    }

    public class UpdateLogoDto
    {
        public string? LogoUrl { get; set; }
    }

    public class ToggleStatusDto
    {
        public bool IsActive { get; set; }
    }
}
