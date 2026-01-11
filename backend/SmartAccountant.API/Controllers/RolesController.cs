using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Services;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RolesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;

        public RolesController(ApplicationDbContext context, IActivityLogService activityLog)
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
        /// الحصول على جميع الأدوار للحساب
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetRoles(
            [FromQuery] int accountId = 1,
            [FromQuery] bool includePermissions = false)
        {
            var query = _context.Roles
                .Where(r => r.AccountId == accountId)
                .OrderBy(r => r.IsSystemRole)
                .ThenBy(r => r.Name);

            if (includePermissions)
            {
                var roles = await query
                    .Select(r => new
                    {
                        r.Id,
                        r.Name,
                        r.NameEn,
                        r.Description,
                        r.IsSystemRole,
                        r.Color,
                        r.Icon,
                        r.IsActive,
                        r.CreatedAt,
                        UsersCount = r.UserRoles.Count,
                        Permissions = r.RolePermissions.Select(rp => new
                        {
                            rp.Permission.Id,
                            rp.Permission.Code,
                            rp.Permission.Name,
                            rp.Permission.Module,
                            rp.Permission.Type
                        })
                    })
                    .ToListAsync();

                return Ok(roles);
            }
            else
            {
                var roles = await query
                    .Select(r => new
                    {
                        r.Id,
                        r.Name,
                        r.NameEn,
                        r.Description,
                        r.IsSystemRole,
                        r.Color,
                        r.Icon,
                        r.IsActive,
                        r.CreatedAt,
                        UsersCount = r.UserRoles.Count,
                        PermissionsCount = r.RolePermissions.Count
                    })
                    .ToListAsync();

                return Ok(roles);
            }
        }

        /// <summary>
        /// الحصول على دور محدد مع الصلاحيات
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetRole(int id)
        {
            var role = await _context.Roles
                .Where(r => r.Id == id)
                .Select(r => new
                {
                    r.Id,
                    r.AccountId,
                    r.Name,
                    r.NameEn,
                    r.Description,
                    r.IsSystemRole,
                    r.Color,
                    r.Icon,
                    r.IsActive,
                    r.CreatedAt,
                    Users = r.UserRoles.Select(ur => new
                    {
                        ur.User.Id,
                        ur.User.Username,
                        ur.User.FullName,
                        ur.User.Email,
                        ur.AssignedAt
                    }),
                    Permissions = r.RolePermissions.Select(rp => new
                    {
                        rp.Permission.Id,
                        rp.Permission.Code,
                        rp.Permission.Name,
                        rp.Permission.NameEn,
                        rp.Permission.Module,
                        rp.Permission.Type,
                        rp.Permission.Description
                    })
                })
                .FirstOrDefaultAsync();

            if (role == null)
                return NotFound(new { message = "الدور غير موجود" });

            return Ok(role);
        }

        /// <summary>
        /// إنشاء دور جديد
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Role>> CreateRole([FromBody] CreateRoleDto dto)
        {
            // التحقق من عدم وجود دور بنفس الاسم
            var exists = await _context.Roles.AnyAsync(r => 
                r.AccountId == dto.AccountId && r.Name == dto.Name);
                
            if (exists)
                return BadRequest(new { message = "يوجد دور بنفس الاسم" });

            var role = new Role
            {
                AccountId = dto.AccountId,
                Name = dto.Name,
                NameEn = dto.NameEn,
                Description = dto.Description,
                Color = dto.Color ?? "#6366f1",
                Icon = dto.Icon ?? "shield",
                IsSystemRole = false,
                IsActive = true
            };

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            // إضافة الصلاحيات إن وجدت
            if (dto.PermissionIds?.Any() == true)
            {
                foreach (var permissionId in dto.PermissionIds)
                {
                    _context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = role.Id,
                        PermissionId = permissionId
                    });
                }
                await _context.SaveChangesAsync();
            }

            // تسجيل النشاط
            await _activityLog.LogAsync(dto.AccountId, GetUserId(), ActivityActions.CreateRole, EntityTypes.Role,
                role.Id, role.Name, $"تم إنشاء دور جديد: {role.Name}");

            return CreatedAtAction(nameof(GetRole), new { id = role.Id }, role);
        }

        /// <summary>
        /// تحديث دور
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleDto dto)
        {
            var role = await _context.Roles.FindAsync(id);
            if (role == null)
                return NotFound(new { message = "الدور غير موجود" });

            if (role.IsSystemRole && dto.Name != role.Name)
                return BadRequest(new { message = "لا يمكن تغيير اسم دور النظام" });

            role.Name = dto.Name ?? role.Name;
            role.NameEn = dto.NameEn ?? role.NameEn;
            role.Description = dto.Description ?? role.Description;
            role.Color = dto.Color ?? role.Color;
            role.Icon = dto.Icon ?? role.Icon;
            role.IsActive = dto.IsActive ?? role.IsActive;

            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(role.AccountId, GetUserId(), ActivityActions.UpdateRole, EntityTypes.Role,
                role.Id, role.Name, $"تم تعديل الدور: {role.Name}");

            return NoContent();
        }

        /// <summary>
        /// تغيير حالة الدور (تنشيط/تعطيل)
        /// </summary>
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> ToggleRoleStatus(int id, [FromBody] ToggleStatusDto dto)
        {
            var role = await _context.Roles.FindAsync(id);
            
            if (role == null)
                return NotFound(new { message = "الدور غير موجود" });

            if (role.IsSystemRole)
                return BadRequest(new { message = "لا يمكن تغيير حالة دور النظام" });

            role.IsActive = dto.IsActive;
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            var action = dto.IsActive ? "تفعيل الدور" : "تعطيل الدور";
            await _activityLog.LogAsync(role.AccountId, GetUserId(), action, EntityTypes.Role,
                role.Id, role.Name, $"تم {(dto.IsActive ? "تفعيل" : "تعطيل")} الدور: {role.Name}");

            return Ok(new { success = true, message = dto.IsActive ? "تم تفعيل الدور" : "تم تعطيل الدور", isActive = role.IsActive });
        }

        /// <summary>
        /// حذف دور
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRole(int id)
        {
            var role = await _context.Roles
                .Include(r => r.UserRoles)
                .FirstOrDefaultAsync(r => r.Id == id);
                
            if (role == null)
                return NotFound(new { message = "الدور غير موجود" });

            if (role.IsSystemRole)
                return BadRequest(new { message = "لا يمكن حذف دور النظام" });

            if (role.UserRoles.Any())
                return BadRequest(new { message = "لا يمكن حذف دور مرتبط بمستخدمين" });

            // تسجيل النشاط
            await _activityLog.LogAsync(role.AccountId, GetUserId(), ActivityActions.DeleteRole, EntityTypes.Role,
                role.Id, role.Name, $"تم حذف الدور: {role.Name}");

            _context.Roles.Remove(role);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// تحديث صلاحيات الدور
        /// </summary>
        [HttpPut("{id}/permissions")]
        public async Task<IActionResult> UpdateRolePermissions(int id, [FromBody] int[] permissionIds)
        {
            var role = await _context.Roles
                .Include(r => r.RolePermissions)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (role == null)
                return NotFound(new { message = "الدور غير موجود" });

            // حذف الصلاحيات القديمة
            _context.RolePermissions.RemoveRange(role.RolePermissions);

            // إضافة الصلاحيات الجديدة
            foreach (var permissionId in permissionIds)
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    RoleId = role.Id,
                    PermissionId = permissionId
                });
            }

            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(role.AccountId, GetUserId(), ActivityActions.UpdatePermissions, EntityTypes.Role,
                role.Id, role.Name, $"تم تحديث صلاحيات الدور: {role.Name} ({permissionIds.Length} صلاحية)");

            return NoContent();
        }

        /// <summary>
        /// إضافة صلاحية للدور
        /// </summary>
        [HttpPost("{id}/permissions/{permissionId}")]
        public async Task<IActionResult> AddPermissionToRole(int id, int permissionId)
        {
            var exists = await _context.RolePermissions
                .AnyAsync(rp => rp.RoleId == id && rp.PermissionId == permissionId);

            if (exists)
                return BadRequest(new { message = "الصلاحية موجودة مسبقاً" });

            _context.RolePermissions.Add(new RolePermission
            {
                RoleId = id,
                PermissionId = permissionId
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>
        /// إزالة صلاحية من الدور
        /// </summary>
        [HttpDelete("{id}/permissions/{permissionId}")]
        public async Task<IActionResult> RemovePermissionFromRole(int id, int permissionId)
        {
            var rolePermission = await _context.RolePermissions
                .FirstOrDefaultAsync(rp => rp.RoleId == id && rp.PermissionId == permissionId);

            if (rolePermission == null)
                return NotFound(new { message = "الصلاحية غير موجودة في هذا الدور" });

            _context.RolePermissions.Remove(rolePermission);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// نسخ دور مع صلاحياته
        /// </summary>
        [HttpPost("{id}/clone")]
        public async Task<ActionResult<Role>> CloneRole(int id, [FromBody] CloneRoleDto dto)
        {
            var sourceRole = await _context.Roles
                .Include(r => r.RolePermissions)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (sourceRole == null)
                return NotFound(new { message = "الدور المصدر غير موجود" });

            var newRole = new Role
            {
                AccountId = sourceRole.AccountId,
                Name = dto.NewName,
                NameEn = dto.NewNameEn,
                Description = dto.Description ?? sourceRole.Description,
                Color = dto.Color ?? sourceRole.Color,
                Icon = sourceRole.Icon,
                IsSystemRole = false,
                IsActive = true
            };

            _context.Roles.Add(newRole);
            await _context.SaveChangesAsync();

            // نسخ الصلاحيات
            foreach (var rp in sourceRole.RolePermissions)
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    RoleId = newRole.Id,
                    PermissionId = rp.PermissionId
                });
            }
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRole), new { id = newRole.Id }, newRole);
        }
    }

    public class CreateRoleDto
    {
        public int AccountId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }
        public string? Description { get; set; }
        public string? Color { get; set; }
        public string? Icon { get; set; }
        public int[]? PermissionIds { get; set; }
    }

    public class UpdateRoleDto
    {
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Description { get; set; }
        public string? Color { get; set; }
        public string? Icon { get; set; }
        public bool? IsActive { get; set; }
    }

    public class CloneRoleDto
    {
        public string NewName { get; set; } = string.Empty;
        public string? NewNameEn { get; set; }
        public string? Description { get; set; }
        public string? Color { get; set; }
    }
}
