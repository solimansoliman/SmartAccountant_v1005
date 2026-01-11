using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Services;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/admin/users")]
    public class AdminUsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;

        public AdminUsersController(ApplicationDbContext context, IActivityLogService activityLog)
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

        /// <summary>
        /// الحصول على جميع المستخدمين للحساب (أو جميع الحسابات للمدير العام)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<object>> GetUsers(
            [FromQuery] int? accountId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] int? roleId = null)
        {
            // إذا لم يُحدد accountId أو كان 0، يتم جلب جميع المستخدمين (للمدير العام)
            IQueryable<User> query = _context.Users.AsQueryable();
            
            if (accountId.HasValue && accountId.Value > 0)
            {
                query = query.Where(u => u.AccountId == accountId.Value);
            }

            // البحث
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(u =>
                    u.Username.Contains(search) ||
                    u.FullName.Contains(search) ||
                    (u.Email != null && u.Email.Contains(search)) ||
                    (u.Phone != null && u.Phone.Contains(search)));
            }

            // فلتر الحالة
            if (isActive.HasValue)
                query = query.Where(u => u.IsActive == isActive.Value);

            // فلتر الدور
            if (roleId.HasValue)
                query = query.Where(u => u.UserRoles.Any(ur => ur.RoleId == roleId.Value));

            var totalItems = await query.CountAsync();

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    u.Id,
                    u.AccountId,
                    AccountName = u.Account != null ? u.Account.Name : null,
                    u.Username,
                    u.FullName,
                    u.Email,
                    u.Phone,
                    u.AvatarUrl,
                    u.JobTitle,
                    u.Department,
                    u.IsSuperAdmin,
                    u.IsActive,
                    u.CreatedAt,
                    u.LastLoginAt,
                    u.LastLoginIp,
                    u.EmailVerified,
                    u.PhoneVerified,
                    u.FailedLoginAttempts,
                    u.MaxMessageLength,
                    u.MaxNotificationLength,
                    IsLocked = u.LockoutEnd.HasValue && u.LockoutEnd > DateTime.UtcNow,
                    Roles = u.UserRoles.Select(ur => new
                    {
                        ur.Role.Id,
                        ur.Role.Name,
                        ur.Role.Color,
                        ur.Role.Icon
                    })
                })
                .ToListAsync();

            return Ok(new
            {
                items = users,
                totalItems,
                totalPages = (int)Math.Ceiling(totalItems / (double)pageSize),
                currentPage = page
            });
        }

        /// <summary>
        /// الحصول على مستخدم محدد
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetUser(int id)
        {
            var user = await _context.Users
                .Where(u => u.Id == id)
                .Select(u => new
                {
                    u.Id,
                    u.AccountId,
                    u.Username,
                    u.FullName,
                    u.Email,
                    u.Phone,
                    u.AvatarUrl,
                    u.JobTitle,
                    u.Department,
                    u.RoleType,
                    RoleTypeName = u.RoleType.ToString(),
                    u.IsSuperAdmin,
                    u.IsActive,
                    u.CreatedAt,
                    u.LastLoginAt,
                    u.LastLoginIp,
                    u.EmailVerified,
                    u.PhoneVerified,
                    u.PreferredLanguage,
                    u.TimeZone,
                    u.FailedLoginAttempts,
                    u.LockoutEnd,
                    IsLocked = u.LockoutEnd.HasValue && u.LockoutEnd > DateTime.UtcNow,
                    Roles = u.UserRoles.Select(ur => new
                    {
                        ur.Role.Id,
                        ur.Role.Name,
                        ur.Role.NameEn,
                        ur.Role.Color,
                        ur.Role.Icon,
                        ur.AssignedAt
                    }),
                    // الصلاحيات المجمعة من الأدوار
                    Permissions = u.IsSuperAdmin 
                        ? _context.Permissions.Select(p => p.Code).ToList()
                        : u.UserRoles
                            .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
                            .Distinct()
                            .ToList(),
                    // آخر نشاط
                    RecentActivity = _context.ActivityLogs
                        .Where(a => a.UserId == u.Id)
                        .OrderByDescending(a => a.CreatedAt)
                        .Take(5)
                        .Select(a => new
                        {
                            a.Action,
                            a.Description,
                            a.CreatedAt
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            return Ok(user);
        }

        /// <summary>
        /// إنشاء مستخدم جديد
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<object>> CreateUser([FromBody] CreateUserDto dto)
        {
            // التحقق من عدم وجود مستخدم بنفس الاسم
            var exists = await _context.Users.AnyAsync(u =>
                u.AccountId == dto.AccountId && u.Username == dto.Username);

            if (exists)
                return BadRequest(new { message = "اسم المستخدم موجود مسبقاً" });

            // التحقق من البريد
            if (!string.IsNullOrEmpty(dto.Email))
            {
                var emailExists = await _context.Users.AnyAsync(u => u.Email == dto.Email);
                if (emailExists)
                    return BadRequest(new { message = "البريد الإلكتروني مستخدم مسبقاً" });
            }

            var user = new User
            {
                AccountId = dto.AccountId,
                Username = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.Phone,
                JobTitle = dto.JobTitle,
                Department = dto.Department,
                IsSuperAdmin = dto.IsSuperAdmin,
                IsActive = true,
                PreferredLanguage = dto.PreferredLanguage ?? "ar"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // إضافة الأدوار
            if (dto.RoleIds?.Any() == true)
            {
                foreach (var roleId in dto.RoleIds)
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = user.Id,
                        RoleId = roleId,
                        AssignedByUserId = dto.AssignedByUserId
                    });
                }
                await _context.SaveChangesAsync();
            }

            // تسجيل النشاط
            await _activityLog.LogAsync(dto.AccountId, GetUserId(), ActivityActions.Create, EntityTypes.User,
                user.Id, user.Username, $"تم إنشاء مستخدم جديد: {user.Username} ({user.FullName})");

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, new
            {
                user.Id,
                user.Username,
                user.FullName,
                message = "تم إنشاء المستخدم بنجاح"
            });
        }

        /// <summary>
        /// تحديث مستخدم
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            // تحديث البيانات
            if (!string.IsNullOrEmpty(dto.FullName))
                user.FullName = dto.FullName;

            if (dto.Email != null)
            {
                if (!string.IsNullOrEmpty(dto.Email))
                {
                    var emailExists = await _context.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id);
                    if (emailExists)
                        return BadRequest(new { message = "البريد الإلكتروني مستخدم مسبقاً" });
                }
                user.Email = dto.Email;
            }

            if (dto.Phone != null)
                user.Phone = dto.Phone;

            if (dto.JobTitle != null)
                user.JobTitle = dto.JobTitle;

            if (dto.Department != null)
                user.Department = dto.Department;

            if (dto.AvatarUrl != null)
                user.AvatarUrl = dto.AvatarUrl;

            if (dto.PreferredLanguage != null)
                user.PreferredLanguage = dto.PreferredLanguage;

            if (dto.TimeZone != null)
                user.TimeZone = dto.TimeZone;

            if (dto.IsSuperAdmin.HasValue)
                user.IsSuperAdmin = dto.IsSuperAdmin.Value;

            // تحديث حدود الحروف
            if (dto.MaxMessageLength.HasValue)
                user.MaxMessageLength = dto.MaxMessageLength.Value;

            if (dto.MaxNotificationLength.HasValue)
                user.MaxNotificationLength = dto.MaxNotificationLength.Value;

            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(user.AccountId, GetUserId(), ActivityActions.Update, EntityTypes.User,
                user.Id, user.Username, $"تم تعديل بيانات المستخدم: {user.Username}");

            return NoContent();
        }

        /// <summary>
        /// تغيير كلمة مرور المستخدم
        /// </summary>
        [HttpPut("{id}/password")]
        public async Task<IActionResult> ChangePassword(int id, [FromBody] ChangePasswordDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(user.AccountId, GetUserId(), ActivityActions.ChangePassword, EntityTypes.User,
                user.Id, user.Username, $"تم تغيير كلمة مرور المستخدم: {user.Username}");

            return Ok(new { message = "تم تغيير كلمة المرور بنجاح" });
        }

        /// <summary>
        /// تفعيل/تعطيل مستخدم
        /// </summary>
        [HttpPut("{id}/status")]
        public async Task<IActionResult> ToggleUserStatus(int id, [FromBody] bool isActive)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            user.IsActive = isActive;
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            var action = isActive ? ActivityActions.ActivateUser : ActivityActions.DeactivateUser;
            await _activityLog.LogAsync(user.AccountId, GetUserId(), action, EntityTypes.User,
                user.Id, user.Username, isActive ? $"تم تفعيل المستخدم: {user.Username}" : $"تم تعطيل المستخدم: {user.Username}");

            return Ok(new { message = isActive ? "تم تفعيل المستخدم" : "تم تعطيل المستخدم" });
        }

        /// <summary>
        /// قفل/فتح قفل مستخدم
        /// </summary>
        [HttpPut("{id}/lock")]
        public async Task<IActionResult> ToggleUserLock(int id, [FromBody] LockUserDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            if (dto.Lock)
            {
                user.LockoutEnd = dto.LockUntil ?? DateTime.UtcNow.AddYears(100);
                await _context.SaveChangesAsync();
                return Ok(new { message = "تم قفل المستخدم" });
            }
            else
            {
                user.LockoutEnd = null;
                user.FailedLoginAttempts = 0;
                await _context.SaveChangesAsync();
                return Ok(new { message = "تم فتح قفل المستخدم" });
            }
        }

        /// <summary>
        /// تحديث أدوار المستخدم
        /// </summary>
        [HttpPut("{id}/roles")]
        public async Task<IActionResult> UpdateUserRoles(int id, [FromBody] UpdateUserRolesDto dto)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            // حذف الأدوار القديمة
            _context.UserRoles.RemoveRange(user.UserRoles);

            // إضافة الأدوار الجديدة
            foreach (var roleId in dto.RoleIds)
            {
                _context.UserRoles.Add(new UserRole
                {
                    UserId = user.Id,
                    RoleId = roleId,
                    AssignedByUserId = dto.AssignedByUserId
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "تم تحديث الأدوار بنجاح" });
        }

        /// <summary>
        /// إضافة دور للمستخدم
        /// </summary>
        [HttpPost("{id}/roles/{roleId}")]
        public async Task<IActionResult> AddRoleToUser(int id, int roleId, [FromQuery] int? assignedByUserId = null)
        {
            var exists = await _context.UserRoles
                .AnyAsync(ur => ur.UserId == id && ur.RoleId == roleId);

            if (exists)
                return BadRequest(new { message = "الدور موجود مسبقاً للمستخدم" });

            _context.UserRoles.Add(new UserRole
            {
                UserId = id,
                RoleId = roleId,
                AssignedByUserId = assignedByUserId
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "تم إضافة الدور بنجاح" });
        }

        /// <summary>
        /// إزالة دور من المستخدم
        /// </summary>
        [HttpDelete("{id}/roles/{roleId}")]
        public async Task<IActionResult> RemoveRoleFromUser(int id, int roleId)
        {
            var userRole = await _context.UserRoles
                .FirstOrDefaultAsync(ur => ur.UserId == id && ur.RoleId == roleId);

            if (userRole == null)
                return NotFound(new { message = "الدور غير موجود للمستخدم" });

            _context.UserRoles.Remove(userRole);
            await _context.SaveChangesAsync();

            return Ok(new { message = "تم إزالة الدور بنجاح" });
        }

        /// <summary>
        /// حذف مستخدم
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            // لا يمكن حذف Super Admin
            if (user.IsSuperAdmin)
                return BadRequest(new { message = "لا يمكن حذف المدير العام" });

            // تسجيل النشاط
            await _activityLog.LogAsync(user.AccountId, GetUserId(), ActivityActions.Delete, EntityTypes.User,
                user.Id, user.Username, $"تم حذف المستخدم: {user.Username}");

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "تم حذف المستخدم بنجاح" });
        }

        /// <summary>
        /// إحصائيات المستخدمين
        /// </summary>
        [HttpGet("statistics")]
        public async Task<ActionResult<object>> GetUserStatistics([FromQuery] int accountId = 1)
        {
            var stats = new
            {
                TotalUsers = await _context.Users.CountAsync(u => u.AccountId == accountId),
                ActiveUsers = await _context.Users.CountAsync(u => u.AccountId == accountId && u.IsActive),
                InactiveUsers = await _context.Users.CountAsync(u => u.AccountId == accountId && !u.IsActive),
                LockedUsers = await _context.Users.CountAsync(u => 
                    u.AccountId == accountId && u.LockoutEnd.HasValue && u.LockoutEnd > DateTime.UtcNow),
                SuperAdmins = await _context.Users.CountAsync(u => u.AccountId == accountId && u.IsSuperAdmin),
                
                // آخر المستخدمين المسجلين
                RecentUsers = await _context.Users
                    .Where(u => u.AccountId == accountId)
                    .OrderByDescending(u => u.CreatedAt)
                    .Take(5)
                    .Select(u => new
                    {
                        u.Id,
                        u.FullName,
                        u.Username,
                        u.CreatedAt
                    })
                    .ToListAsync(),
                
                // آخر تسجيلات الدخول
                RecentLogins = await _context.Users
                    .Where(u => u.AccountId == accountId && u.LastLoginAt.HasValue)
                    .OrderByDescending(u => u.LastLoginAt)
                    .Take(5)
                    .Select(u => new
                    {
                        u.Id,
                        u.FullName,
                        u.Username,
                        u.LastLoginAt,
                        u.LastLoginIp
                    })
                    .ToListAsync(),
                
                // توزيع الأدوار
                RolesDistribution = await _context.Roles
                    .Where(r => r.AccountId == accountId)
                    .Select(r => new
                    {
                        r.Name,
                        r.Color,
                        UsersCount = r.UserRoles.Count
                    })
                    .ToListAsync()
            };

            return Ok(stats);
        }
    }

    public class CreateUserDto
    {
        public int AccountId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? JobTitle { get; set; }
        public string? Department { get; set; }
        public bool IsSuperAdmin { get; set; }
        public string? PreferredLanguage { get; set; }
        public int[]? RoleIds { get; set; }
        public int? AssignedByUserId { get; set; }
    }

    public class UpdateUserDto
    {
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? JobTitle { get; set; }
        public string? Department { get; set; }
        public string? AvatarUrl { get; set; }
        public string? PreferredLanguage { get; set; }
        public string? TimeZone { get; set; }
        public bool? IsSuperAdmin { get; set; }
        /// <summary>
        /// الحد الأقصى لعدد حروف الرسالة (0 = استخدام حد الحساب، -1 = بدون حد)
        /// </summary>
        public int? MaxMessageLength { get; set; }
        /// <summary>
        /// الحد الأقصى لعدد حروف الإشعار (0 = استخدام حد الحساب، -1 = بدون حد)
        /// </summary>
        public int? MaxNotificationLength { get; set; }
    }

    public class ChangePasswordDto
    {
        public string NewPassword { get; set; } = string.Empty;
    }

    public class LockUserDto
    {
        public bool Lock { get; set; }
        public DateTime? LockUntil { get; set; }
    }

    public class UpdateUserRolesDto
    {
        public int[] RoleIds { get; set; } = Array.Empty<int>();
        public int? AssignedByUserId { get; set; }
    }
}
