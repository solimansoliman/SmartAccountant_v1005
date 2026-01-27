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
            var user = await _context.Users
                .Include(u => u.Account)
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

            if (user == null)
            {
                return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });
            }

            // التحقق من كلمة المرور باستخدام BCrypt
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                // زيادة عداد محاولات الدخول الفاشلة
                user.FailedLoginAttempts++;
                if (user.FailedLoginAttempts >= 5)
                {
                    user.LockoutEnd = DateTime.UtcNow.AddMinutes(30);
                }
                await _context.SaveChangesAsync();
                
                // تسجيل محاولة دخول فاشلة
                await _activityLog.LogAsync(user.AccountId, user.Id, ActivityActions.LoginFailed, EntityTypes.User,
                    user.Id, user.Username, $"فشل تسجيل دخول المستخدم: {user.Username} - كلمة مرور خاطئة");
                
                return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });
            }

            // التحقق من القفل
            if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTime.UtcNow)
            {
                return Unauthorized(new { message = "تم قفل الحساب. حاول مرة أخرى لاحقاً" });
            }

            if (!user.Account.IsActive)
            {
                return Unauthorized(new { message = "الحساب غير فعال" });
            }

            if (user.Account.SubscriptionExpiry.HasValue && user.Account.SubscriptionExpiry < DateTime.UtcNow)
            {
                return Unauthorized(new { message = "انتهت صلاحية الاشتراك" });
            }

            // تحديث بيانات تسجيل الدخول
            user.LastLoginAt = DateTime.UtcNow;
            user.LastLoginIp = HttpContext.Connection.RemoteIpAddress?.ToString();
            user.FailedLoginAttempts = 0;
            user.LockoutEnd = null;
            await _context.SaveChangesAsync();

            // تسجيل نشاط تسجيل الدخول
            await _activityLog.LogAsync(user.AccountId, user.Id, ActivityActions.Login, EntityTypes.User,
                user.Id, user.Username, $"تسجيل دخول المستخدم: {user.Username}");

            // الحصول على الصلاحيات
            List<string> permissions;
            if (user.IsSuperAdmin)
            {
                permissions = await _context.Permissions.Select(p => p.Code).ToListAsync();
            }
            else
            {
                permissions = user.UserRoles
                    .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
                    .Distinct()
                    .ToList();
            }

            // الحصول على الأدوار
            var roles = user.UserRoles.Select(ur => new RoleDto
            {
                Id = ur.Role.Id,
                Name = ur.Role.Name,
                NameEn = ur.Role.NameEn,
                Color = ur.Role.Color,
                Icon = ur.Role.Icon
            }).ToList();

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
                    AccountName = user.Account.Name,
                    AccountLogo = user.Account.LogoUrl,  // شعار الشركة
                    Currency = user.Account.CurrencySymbol,
                    CurrencyId = user.Account.CurrencyId,
                    Roles = roles,
                    PermissionCodes = permissions,
                    Permissions = new PermissionsDto
                    {
                        CanManageProducts = user.CanManageProducts || permissions.Contains("products.view"),
                        CanManageCustomers = user.CanManageCustomers || permissions.Contains("customers.view"),
                        CanCreateInvoices = user.CanCreateInvoices || permissions.Contains("invoices.create"),
                        CanManageExpenses = user.CanManageExpenses || permissions.Contains("expenses.view"),
                        CanViewReports = user.CanViewReports || permissions.Contains("reports.view"),
                        CanManageSettings = user.CanManageSettings || permissions.Contains("settings.view"),
                        CanManageUsers = user.CanManageUsers || permissions.Contains("users.view"),
                        CanManageLogo = user.IsSuperAdmin || user.RoleType == UserRoleType.Owner || user.RoleType == UserRoleType.Admin || permissions.Contains("account.logo")
                    }
                },
                // ✅ JWT Token آمن ومشفر
                Token = _jwtService.GenerateToken(user)
            };
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

            // إنشاء المستخدم المالك
            var owner = new User
            {
                AccountId = account.Id,
                Username = request.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FullName = request.FullName,
                Email = request.Email,
                Phone = request.Phone,
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

            // إنشاء البيانات الأساسية
            await CreateDefaultData(account.Id, owner.Id);

            return new RegisterResponse
            {
                Success = true,
                Message = "تم إنشاء الحساب بنجاح",
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

            var user = await _context.Users
                .Include(u => u.Account)
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);

            if (user == null)
            {
                return Unauthorized();
            }

            // الحصول على الصلاحيات
            List<string> permissions;
            if (user.IsSuperAdmin)
            {
                permissions = await _context.Permissions.Select(p => p.Code).ToListAsync();
            }
            else
            {
                permissions = await _context.UserRoles
                    .Where(ur => ur.UserId == userId)
                    .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
                    .Distinct()
                    .ToListAsync();
            }

            var roles = user.UserRoles.Select(ur => new RoleDto
            {
                Id = ur.Role.Id,
                Name = ur.Role.Name,
                NameEn = ur.Role.NameEn,
                Color = ur.Role.Color,
                Icon = ur.Role.Icon
            }).ToList();

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
                Permissions = new PermissionsDto
                {
                    CanManageProducts = user.CanManageProducts || permissions.Contains("products.view"),
                    CanManageCustomers = user.CanManageCustomers || permissions.Contains("customers.view"),
                    CanCreateInvoices = user.CanCreateInvoices || permissions.Contains("invoices.create"),
                    CanManageExpenses = user.CanManageExpenses || permissions.Contains("expenses.view"),
                    CanViewReports = user.CanViewReports || permissions.Contains("reports.view"),
                    CanManageSettings = user.CanManageSettings || permissions.Contains("settings.view"),
                    CanManageUsers = user.CanManageUsers || permissions.Contains("users.view"),
                    CanManageLogo = user.IsSuperAdmin || user.RoleType == UserRoleType.Owner || user.RoleType == UserRoleType.Admin || permissions.Contains("account.logo")
                }
            };
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
            // وحدات القياس
            var units = new List<Unit>
            {
                new Unit { AccountId = accountId, Name = "قطعة", NameEn = "Piece", Symbol = "PCS", IsBase = true, CreatedByUserId = userId },
                new Unit { AccountId = accountId, Name = "كيلوجرام", NameEn = "Kilogram", Symbol = "KG", IsBase = true, CreatedByUserId = userId },
                new Unit { AccountId = accountId, Name = "لتر", NameEn = "Liter", Symbol = "L", IsBase = true, CreatedByUserId = userId }
            };
            _context.Units.AddRange(units);

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
                NameEn = "Cash Customer",
                Type = CustomerType.Individual,
                CreatedByUserId = userId
            });

            await _context.SaveChangesAsync();
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
