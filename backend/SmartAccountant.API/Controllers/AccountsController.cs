using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Services;
using System.Net.Mail;
using System.Text.RegularExpressions;

namespace SmartAccountant.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;
        private readonly ILogger<AccountsController> _logger;

        public AccountsController(ApplicationDbContext context, IActivityLogService activityLog, ILogger<AccountsController> logger)
        {
            _context = context;
            _activityLog = activityLog;
            _logger = logger;
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
                var accountName = dto.Name?.Trim() ?? string.Empty;
                var accountNameEn = dto.NameEn?.Trim();
                var email = dto.Email?.Trim();
                var phone = dto.Phone?.Trim();
                var address = dto.Address?.Trim();
                var currencySymbol = dto.CurrencySymbol?.Trim() ?? "ج.م";
                var taxNumber = dto.TaxNumber?.Trim();
                var adminUsername = dto.AdminUsername?.Trim() ?? string.Empty;
                var adminPassword = dto.AdminPassword ?? string.Empty;
                var adminFullName = string.IsNullOrWhiteSpace(dto.AdminFullName) ? accountName : dto.AdminFullName.Trim();

                // التحقق من البيانات المطلوبة
                if (string.IsNullOrWhiteSpace(accountName))
                    return BadRequest(new { message = "اسم الحساب مطلوب" });
                if (accountName.Length < 2 || accountName.Length > 120)
                    return BadRequest(new { message = "اسم الحساب يجب أن يكون بين حرفين و120 حرفاً" });

                if (string.IsNullOrWhiteSpace(adminUsername))
                    return BadRequest(new { message = "اسم المستخدم المسؤول مطلوب" });
                if (!Regex.IsMatch(adminUsername, "^[a-zA-Z0-9._-]{3,50}$"))
                    return BadRequest(new { message = "اسم المستخدم غير صالح" });

                if (string.IsNullOrWhiteSpace(adminPassword))
                    return BadRequest(new { message = "كلمة مرور المسؤول مطلوبة" });
                if (adminPassword.Length < 6)
                    return BadRequest(new { message = "كلمة مرور المسؤول يجب ألا تقل عن 6 أحرف" });

                if (!string.IsNullOrWhiteSpace(email))
                {
                    try
                    {
                        _ = new MailAddress(email);
                    }
                    catch
                    {
                        return BadRequest(new { message = "البريد الإلكتروني غير صالح" });
                    }
                }

                if (!string.IsNullOrWhiteSpace(phone) && !Regex.IsMatch(phone, "^[0-9+()\\-\\s]{7,20}$"))
                    return BadRequest(new { message = "رقم الهاتف غير صالح" });

                if (currencySymbol.Length > 10)
                    return BadRequest(new { message = "رمز العملة طويل جداً" });

                if (!string.IsNullOrWhiteSpace(taxNumber) && taxNumber.Length > 50)
                    return BadRequest(new { message = "الرقم الضريبي طويل جداً" });

                var existingAccount = await _context.Accounts
                    .AnyAsync(a => a.Name.ToLower() == accountName.ToLower());
                if (existingAccount)
                    return BadRequest(new { message = "اسم الحساب موجود مسبقاً" });

                // التحقق من عدم تكرار اسم المستخدم
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Username.ToLower() == adminUsername.ToLower());
                if (existingUser != null)
                    return BadRequest(new { message = "اسم المستخدم موجود مسبقاً" });

                // جلب العملة الافتراضية إذا لم تُحدد
                var currencyId = dto.CurrencyId;
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
                    Name = accountName,
                    NameEn = accountNameEn,
                    Email = email,
                    Phone = phone,
                    Address = address,
                    CurrencyId = currencyId.Value,
                    CurrencySymbol = currencySymbol,
                    TaxNumber = taxNumber,
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
                    Username = adminUsername,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                    FullName = adminFullName,
                    Email = email,
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
                // إنشاء أدوار أساسية (Lookup) لكل حساب جديد
                var defaultRoles = new List<Role>
                {
                    new Role { AccountId = accountId, Name = "مسؤول", NameEn = "Administrator", Description = "إدارة كاملة للحساب", IsSystemRole = true, Color = "#dc2626", Icon = "shield", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Role { AccountId = accountId, Name = "مدير", NameEn = "Manager", Description = "إدارة العمليات اليومية", IsSystemRole = true, Color = "#2563eb", Icon = "briefcase", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Role { AccountId = accountId, Name = "محاسب", NameEn = "Accountant", Description = "إدارة القيود والفواتير والتقارير", IsSystemRole = true, Color = "#16a34a", Icon = "calculator", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Role { AccountId = accountId, Name = "أمين مخزون", NameEn = "Inventory Keeper", Description = "إدارة المخزون والمنتجات", IsSystemRole = true, Color = "#ca8a04", Icon = "boxes", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Role { AccountId = accountId, Name = "موظف مبيعات", NameEn = "Sales", Description = "إنشاء الفواتير وخدمة العملاء", IsSystemRole = true, Color = "#9333ea", Icon = "shopping-cart", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Role { AccountId = accountId, Name = "NewAcount", NameEn = "NewAcount", Description = "دور افتراضي بصلاحيات محدودة", IsSystemRole = true, Color = "#0f766e", Icon = "user", IsActive = true, CreatedAt = DateTime.UtcNow },
                    new Role { AccountId = accountId, Name = "عارض", NameEn = "Viewer", Description = "عرض فقط", IsSystemRole = true, Color = "#475569", Icon = "eye", IsActive = true, CreatedAt = DateTime.UtcNow }
                };

                var existingRoleNames = await _context.Roles
                    .Where(r => r.AccountId == accountId)
                    .Select(r => r.Name)
                    .ToListAsync();

                var rolesToAdd = defaultRoles
                    .Where(r => !existingRoleNames.Contains(r.Name))
                    .ToList();

                if (rolesToAdd.Any())
                {
                    _context.Roles.AddRange(rolesToAdd);
                    await _context.SaveChangesAsync();
                }

                // ربط مالك الحساب بدور "مسؤول" تلقائياً
                var adminRole = await _context.Roles
                    .Where(r => r.AccountId == accountId && r.Name == "مسؤول")
                    .FirstOrDefaultAsync();

                if (adminRole != null)
                {
                    var hasOwnerRole = await _context.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleId == adminRole.Id);
                    if (!hasOwnerRole)
                    {
                        _context.UserRoles.Add(new UserRole
                        {
                            UserId = userId,
                            RoleId = adminRole.Id,
                            AssignedAt = DateTime.UtcNow,
                            AssignedByUserId = userId
                        });
                        await _context.SaveChangesAsync();
                    }
                }

                // إنشاء/تأكيد الوحدات الافتراضية الخاصة بالحساب
                await DefaultUnitsSeeder.EnsureForAccountAsync(_context, accountId, userId);

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
            try
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

                // جلب معلومات الاشتراك (بدون استخدام Set<Subscription> لتجنب الأخطاء)
                var plan = account.PlanDetails;

                return Ok(new AccountUsageDto
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
                    HasOfflineMode = plan?.HasOfflineMode ?? false,
                    HasWhiteLabel = plan?.HasWhiteLabel ?? false,
                    
                    // معلومات الاشتراك (نرجع قيماً افتراضية)
                    SubscriptionStart = null,
                    SubscriptionEnd = null,
                    SubscriptionStatus = "none",
                    AutoRenew = false,
                    DaysRemaining = 0
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account usage for account {AccountId}", id);
                return Ok(new AccountUsageDto
                {
                    AccountId = id,
                    AccountName = string.Empty,
                    PlanId = null,
                    PlanName = "مجاني",
                    PlanNameEn = "Free",
                    CurrentUsers = 0,
                    CurrentMonthInvoices = 0,
                    CurrentCustomers = 0,
                    CurrentProducts = 0,
                    MaxUsers = 1,
                    MaxInvoices = 50,
                    MaxCustomers = 25,
                    MaxProducts = 50,
                    UsersPercentage = 0,
                    InvoicesPercentage = 0,
                    CustomersPercentage = 0,
                    ProductsPercentage = 0,
                    HasBasicReports = true,
                    HasAdvancedReports = false,
                    HasEmailSupport = true,
                    HasPrioritySupport = false,
                    HasDedicatedManager = false,
                    HasBackup = false,
                    BackupFrequency = null,
                    HasCustomInvoices = false,
                    HasMultiCurrency = false,
                    HasApiAccess = false,
                    HasOfflineMode = false,
                    HasWhiteLabel = false,
                    SubscriptionStart = null,
                    SubscriptionEnd = null,
                    SubscriptionStatus = "none",
                    AutoRenew = false,
                    DaysRemaining = 0
                });
            }
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
        public bool HasOfflineMode { get; set; }
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
        public DateTime? CreatedAt { get; set; }
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
