using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Services;

namespace SmartAccountant.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;
        private readonly IJwtService _jwtService;  // ✅ JWT Service

        public AuthController(ApplicationDbContext context, IActivityLogService activityLog, IJwtService jwtService)
        {
            _context = context;
            _activityLog = activityLog;
            _jwtService = jwtService;  // ✅ إضافة JWT Service
        }

        // POST: api/Auth/login
        [HttpPost("login")]
        public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
        {
            try
            {
                // Validate input
                if (string.IsNullOrWhiteSpace(request?.Username) || string.IsNullOrWhiteSpace(request?.Password))
                {
                    return BadRequest(new { message = "اسم المستخدم وكلمة المرور مطلوبان" });
                }

                User? user = null;
                var roleGraphLoaded = false;
                try
                {
                    user = await _context.Users
                        .Include(u => u.UserRoles)
                            .ThenInclude(ur => ur.Role)
                                .ThenInclude(r => r.RolePermissions)
                                    .ThenInclude(rp => rp.Permission)
                        .AsNoTracking()
                        .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);
                    roleGraphLoaded = true;
                }
                catch (Exception ex)
                {
                    // توافق مع قواعد بيانات قديمة لا تحتوي عمود Id في جداول الربط UserRoles/RolePermissions.
                    Console.WriteLine($"User Role Graph Query Warning: {ex.Message}");
                    user = await _context.Users
                        .AsNoTracking()
                        .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);
                }

                if (user == null)
                {
                    return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });
                }
                
                // Load account separately
                Account? account = null;
                try
                {
                    account = await _context.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Id == user.AccountId);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Account Query Error: {ex.Message}");
                    account = null; // Continue without account if loading fails
                }

                // التحقق من كلمة المرور باستخدام BCrypt
                if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                {
                    // زيادة عداد محاولات الدخول الفاشلة
                    var userToUpdate = await _context.Users.FirstOrDefaultAsync(u => u.Id == user.Id);
                    if (userToUpdate != null)
                    {
                        userToUpdate.FailedLoginAttempts++;
                        if (userToUpdate.FailedLoginAttempts >= 5)
                        {
                            userToUpdate.LockoutEnd = DateTime.UtcNow.AddMinutes(30);
                        }
                        await _context.SaveChangesAsync();
                    }
                    
                    // تسجيل محاولة دخول فاشلة (non-blocking)
                    try
                    {
                        await _activityLog.LogAsync(user.AccountId, user.Id, ActivityActions.LoginFailed, EntityTypes.User,
                            user.Id, user.Username, $"فشل تسجيل دخول المستخدم: {user.Username} - كلمة مرور خاطئة");
                    }
                    catch { /* Ignore activity log errors */ }
                    
                    return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });
                }

                // التحقق من القفل
                if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTime.UtcNow)
                {
                    return Unauthorized(new { message = "تم قفل الحساب. حاول مرة أخرى لاحقاً" });
                }

                if (account != null && !account.IsActive)
                {
                    return Unauthorized(new { message = "الحساب غير فعال" });
                }

                if (account?.SubscriptionExpiry.HasValue == true && account.SubscriptionExpiry < DateTime.UtcNow)
                {
                    return Unauthorized(new { message = "انتهت صلاحية الاشتراك" });
                }

                // تحديث بيانات تسجيل الدخول
                // Reload user with tracking for update
                var userForUpdate = await _context.Users.FirstOrDefaultAsync(u => u.Id == user.Id);
                if (userForUpdate != null)
                {
                    userForUpdate.LastLoginAt = DateTime.UtcNow;
                    userForUpdate.LastLoginIp = HttpContext.Connection.RemoteIpAddress?.ToString();
                    userForUpdate.FailedLoginAttempts = 0;
                    userForUpdate.LockoutEnd = null;
                    await _context.SaveChangesAsync();
                }

                // تسجيل نشاط تسجيل الدخول (non-blocking)
                try
                {
                    await _activityLog.LogAsync(user.AccountId, user.Id, ActivityActions.Login, EntityTypes.User,
                        user.Id, user.Username, $"تسجيل دخول المستخدم: {user.Username}");
                }
                catch { /* Ignore activity log errors */ }

                List<UserRole> roleAssignments;
                if (roleGraphLoaded)
                {
                    roleAssignments = user.UserRoles.ToList();
                }
                else
                {
                    try
                    {
                        roleAssignments = await _context.UserRoles
                            .Where(ur => ur.UserId == user.Id)
                            .Include(ur => ur.Role)
                                .ThenInclude(r => r.RolePermissions)
                                    .ThenInclude(rp => rp.Permission)
                            .AsNoTracking()
                            .ToListAsync();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Role Snapshot Query Warning: {ex.Message}");
                        roleAssignments = new List<UserRole>();
                    }
                }

                var roles = roleAssignments
                    .Where(ur => ur.Role != null)
                    .Select(ur => ur.Role)
                    .GroupBy(r => r.Id)
                    .Select(g => g.First())
                    .Select(role => new RoleDto
                    {
                        Id = role.Id,
                        Name = role.Name,
                        NameEn = role.NameEn,
                        Color = role.Color,
                        Icon = role.Icon
                    })
                    .ToList();

                var hasRoleAssignments = roleAssignments.Any();

                List<string> permissions;
                if (user.IsSuperAdmin)
                {
                    permissions = await _context.Permissions.Select(p => p.Code).ToListAsync();
                }
                else
                {
                    permissions = roleAssignments
                        .Where(ur => ur.Role != null)
                        .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
                        .Where(code => !string.IsNullOrWhiteSpace(code))
                        .Distinct()
                        .ToList();
                }

                return new LoginResponse
                {
                    Success = true,
                    Message = "تم تسجيل الدخول بنجاح",
                    User = new AuthUserDto
                    {
                        Id = user.Id,
                        Username = user.Username,
                        FullName = user.FullName,
                        Email = user.Email,
                        AvatarUrl = user.AvatarUrl,
                        Role = user.RoleType.ToString(),
                        IsSuperAdmin = user.IsSuperAdmin,
                        AccountId = user.AccountId,
                        AccountName = account?.Name ?? "شركة",
                        AccountLogo = account?.LogoUrl,  // شعار الشركة
                        Currency = account?.CurrencySymbol ?? "ج.م",
                        CurrencyId = account?.CurrencyId,
                        Roles = roles,
                        PermissionCodes = permissions,
                        Permissions = BuildPermissions(user, permissions, hasRoleAssignments)
                    },
                    // ✅ JWT Token آمن ومشفر
                    Token = _jwtService.GenerateToken(user)
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Login Error: {ex.Message}");
                Console.WriteLine($"Stack Trace: {ex.StackTrace}");
                return StatusCode(500, new { message = "خطأ في الخادم - حاول مرة أخرى لاحقاً", error = ex.Message });
            }
        }

        // POST: api/Auth/register
        [HttpPost("register")]
        public async Task<ActionResult<RegisterResponse>> Register(RegisterRequest request)
        {
            // التحقق من عدم وجود اسم مستخدم مكرر
            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
            {
                return BadRequest(new { message = "اسم المستخدم موجود مسبقاً" });
            }

            // إنشاء الحساب الجديد
            var account = new Account
            {
                Name = request.CompanyName,
                Email = request.Email,
                Phone = request.Phone,
                CurrencyId = request.CurrencyId,
                CurrencySymbol = request.CurrencySymbol ?? "ج.م",
                Plan = AccountPlan.Trial,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                SubscriptionExpiry = DateTime.UtcNow.AddDays(30)
            };

            _context.Accounts.Add(account);
            await _context.SaveChangesAsync();

            // إنشاء مستخدم جديد بصلاحيات محدودة حتى يقوم الأدمن بترقيته.
            var owner = new User
            {
                AccountId = account.Id,
                Username = request.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FullName = request.FullName,
                Email = request.Email,
                Phone = request.Phone,
                RoleType = UserRoleType.User,
                IsSuperAdmin = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CanManageProducts = false,
                CanManageCustomers = false,
                CanCreateInvoices = false,
                CanManageExpenses = false,
                CanViewReports = false,
                CanManageSettings = false,
                CanManageUsers = false
            };

            _context.Users.Add(owner);
            await _context.SaveChangesAsync();

            // إنشاء البيانات الأساسية
            await CreateDefaultData(account.Id, owner.Id);

            return new RegisterResponse
            {
                Success = true,
                Message = "تم إنشاء الحساب بصلاحيات محدودة. يمكن للأدمن ترقيتك لاحقاً",
                AccountId = account.Id,
                UserId = owner.Id
            };
        }

        // GET: api/Auth/me
        [HttpGet("me")]
        public async Task<ActionResult<AuthUserDto>> GetCurrentUser([FromHeader(Name = "X-User-Id")] int? userId)
        {
            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            User? user;
            var roleGraphLoaded = false;
            try
            {
                user = await _context.Users
                    .Include(u => u.Account)
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
                roleGraphLoaded = true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetCurrentUser Role Graph Query Warning: {ex.Message}");
                user = await _context.Users
                    .Include(u => u.Account)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
            }

            if (user == null)
            {
                return Unauthorized();
            }

            List<UserRole> roleAssignments;
            if (roleGraphLoaded)
            {
                roleAssignments = user.UserRoles.ToList();
            }
            else
            {
                try
                {
                    roleAssignments = await _context.UserRoles
                        .Where(ur => ur.UserId == user.Id)
                        .Include(ur => ur.Role)
                            .ThenInclude(r => r.RolePermissions)
                                .ThenInclude(rp => rp.Permission)
                        .AsNoTracking()
                        .ToListAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"GetCurrentUser Role Snapshot Query Warning: {ex.Message}");
                    roleAssignments = new List<UserRole>();
                }
            }

            var roles = roleAssignments
                .Where(ur => ur.Role != null)
                .Select(ur => ur.Role)
                .GroupBy(r => r.Id)
                .Select(g => g.First())
                .Select(role => new RoleDto
                {
                    Id = role.Id,
                    Name = role.Name,
                    NameEn = role.NameEn,
                    Color = role.Color,
                    Icon = role.Icon
                })
                .ToList();

            var hasRoleAssignments = roleAssignments.Any();

            List<string> permissions;
            if (user.IsSuperAdmin)
            {
                permissions = await _context.Permissions.Select(p => p.Code).ToListAsync();
            }
            else
            {
                permissions = roleAssignments
                    .Where(ur => ur.Role != null)
                    .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
                    .Where(code => !string.IsNullOrWhiteSpace(code))
                    .Distinct()
                    .ToList();
            }

            return new AuthUserDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                AvatarUrl = user.AvatarUrl,
                Role = user.RoleType.ToString(),
                IsSuperAdmin = user.IsSuperAdmin,
                AccountId = user.AccountId,
                AccountName = user.Account.Name,
                AccountLogo = user.Account.LogoUrl,  // شعار الشركة
                Currency = user.Account.CurrencySymbol,
                CurrencyId = user.Account.CurrencyId,
                Roles = roles,
                PermissionCodes = permissions,
                Permissions = BuildPermissions(user, permissions, hasRoleAssignments)
            };
        }

        // GET: api/Auth/hash-password (TEMPORARY - for testing only)
        [HttpGet("hash-password/{password}")]
        public IActionResult GetHashedPassword(string password)
        {
            try
            {
                var hashed = BCrypt.Net.BCrypt.HashPassword(password, 12);
                return Ok(new { password, hashed });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // POST: api/Auth/change-password
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromHeader(Name = "X-User-Id")] int? userId, ChangePasswordRequest request)
        {
            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound();
            }

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "كلمة المرور الحالية غير صحيحة" });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "تم تغيير كلمة المرور بنجاح" });
        }

        /// <summary>
        /// إعادة ضبط كلمة المرور للمستخدم admin (للتطوير فقط)
        /// </summary>
        [HttpPost("reset-admin")]
        public async Task<IActionResult> ResetAdminPassword()
        {
            var admin = await _context.Users.FirstOrDefaultAsync(u => u.Username == "admin");
            if (admin == null)
            {
                return NotFound(new { message = "المستخدم admin غير موجود" });
            }

            // إعادة ضبط كلمة المرور إلى admin123
            admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");
            admin.FailedLoginAttempts = 0;
            admin.LockoutEnd = null;
            admin.IsActive = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "تم إعادة ضبط كلمة المرور بنجاح. كلمة المرور الجديدة: admin123" });
        }

        private async Task CreateDefaultData(int accountId, int userId)
        {
            // إنشاء/تأكيد الوحدات الافتراضية الخاصة بالحساب
            await DefaultUnitsSeeder.EnsureForAccountAsync(_context, accountId, userId);

            // تصنيفات المنتجات
            _context.ProductCategories.Add(new ProductCategory 
            { 
                AccountId = accountId, 
                Name = "منتجات عامة", 
                NameEn = "General Products" 
            });

            // تصنيفات المصروفات
            _context.ExpenseCategories.Add(new ExpenseCategory 
            { 
                AccountId = accountId, 
                Code = "EXP001", 
                Name = "مصاريف عامة", 
                NameEn = "General Expenses" 
            });

            // تصنيفات الإيرادات
            _context.RevenueCategories.Add(new RevenueCategory 
            { 
                AccountId = accountId, 
                Code = "REV001", 
                Name = "إيرادات عامة", 
                NameEn = "General Revenue" 
            });

            // عميل نقدي
            _context.Customers.Add(new Customer
            {
                AccountId = accountId,
                Code = "C001",
                Name = "عميل نقدي",
                Type = CustomerType.Individual,
                CreatedByUserId = userId
            });

            await _context.SaveChangesAsync();
        }

        private static PermissionsDto BuildPermissions(User user, List<string> permissions, bool hasRoleAssignments)
        {
            bool hasPermission(params string[] codes) => codes.Any(code => permissions.Contains(code));
            var allowLegacyFallback = !hasRoleAssignments
                && (user.IsSuperAdmin || user.RoleType == UserRoleType.Owner || user.RoleType == UserRoleType.Admin);

            bool byRoleOrLegacy(bool legacyValue, params string[] codes)
            {
                if (hasRoleAssignments)
                {
                    return hasPermission(codes);
                }

                return allowLegacyFallback ? legacyValue : false;
            }

            return new PermissionsDto
            {
                CanManageProducts = byRoleOrLegacy(user.CanManageProducts, "products.view", "products.create", "products.update", "products.delete"),
                CanManageCustomers = byRoleOrLegacy(user.CanManageCustomers, "customers.view", "customers.create", "customers.update", "customers.delete"),
                CanCreateInvoices = byRoleOrLegacy(user.CanCreateInvoices, "invoices.create", "invoices.view", "invoices.update"),
                CanManageExpenses = byRoleOrLegacy(user.CanManageExpenses, "expenses.view", "expenses.create", "expenses.update", "expenses.delete"),
                CanViewReports = byRoleOrLegacy(user.CanViewReports, "reports.view", "reports.summary", "reports.analytics"),
                CanManageSettings = byRoleOrLegacy(user.CanManageSettings, "settings.view", "settings.update", "settings.manage"),
                CanManageUsers = byRoleOrLegacy(user.CanManageUsers, "users.view", "users.create", "users.update", "users.delete"),
                CanManageLogo = user.IsSuperAdmin
                    || user.RoleType == UserRoleType.Owner
                    || user.RoleType == UserRoleType.Admin
                    || (hasRoleAssignments && hasPermission("account.logo", "settings.manage"))
            };
        }
    }

    // DTOs
    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public AuthUserDto? User { get; set; }
        public string? Token { get; set; }
    }

    public class RegisterRequest
    {
        public string CompanyName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public int? CurrencyId { get; set; }
        public string? CurrencySymbol { get; set; }
    }

    public class RegisterResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int AccountId { get; set; }
        public int UserId { get; set; }
    }

    public class AuthUserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? AvatarUrl { get; set; }
        public string Role { get; set; } = string.Empty;
        public bool IsSuperAdmin { get; set; }
        public int AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string? AccountLogo { get; set; }  // شعار الشركة
        public string Currency { get; set; } = "ج.م";
        public int? CurrencyId { get; set; }
        public List<RoleDto> Roles { get; set; } = new();
        public List<string> PermissionCodes { get; set; } = new();
        public PermissionsDto Permissions { get; set; } = new();
    }

    public class RoleDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }
        public string? Color { get; set; }
        public string? Icon { get; set; }
    }

    public class PermissionsDto
    {
        public bool CanManageProducts { get; set; }
        public bool CanManageCustomers { get; set; }
        public bool CanCreateInvoices { get; set; }
        public bool CanManageExpenses { get; set; }
        public bool CanViewReports { get; set; }
        public bool CanManageSettings { get; set; }
        public bool CanManageUsers { get; set; }
        public bool CanManageLogo { get; set; }  // صلاحية إدارة شعار الشركة
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
