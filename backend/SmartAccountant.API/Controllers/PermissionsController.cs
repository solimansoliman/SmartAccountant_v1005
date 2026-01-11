using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PermissionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PermissionsController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// الحصول على جميع الصلاحيات
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetPermissions()
        {
            var permissions = await _context.Permissions
                .OrderBy(p => p.Module)
                .ThenBy(p => p.SortOrder)
                .Select(p => new
                {
                    p.Id,
                    p.Code,
                    p.Name,
                    p.NameEn,
                    p.Description,
                    p.Module,
                    p.Type,
                    TypeName = p.Type.ToString(),
                    p.SortOrder
                })
                .ToListAsync();

            return Ok(permissions);
        }

        /// <summary>
        /// الحصول على الصلاحيات مجمعة حسب الوحدة
        /// </summary>
        [HttpGet("grouped")]
        public async Task<ActionResult<object>> GetPermissionsGrouped()
        {
            var permissions = await _context.Permissions
                .OrderBy(p => p.SortOrder)
                .ToListAsync();

            var grouped = permissions
                .GroupBy(p => p.Module)
                .Select(g => new
                {
                    Module = g.Key,
                    ModuleName = GetModuleName(g.Key),
                    ModuleIcon = GetModuleIcon(g.Key),
                    Permissions = g.Select(p => new
                    {
                        p.Id,
                        p.Code,
                        p.Name,
                        p.NameEn,
                        p.Description,
                        p.Type,
                        TypeName = p.Type.ToString()
                    })
                })
                .ToList();

            return Ok(grouped);
        }

        /// <summary>
        /// الحصول على صلاحية محددة
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Permission>> GetPermission(int id)
        {
            var permission = await _context.Permissions.FindAsync(id);
            if (permission == null)
                return NotFound(new { message = "الصلاحية غير موجودة" });

            return Ok(permission);
        }

        /// <summary>
        /// الحصول على الصلاحيات حسب الوحدة
        /// </summary>
        [HttpGet("module/{module}")]
        public async Task<ActionResult<IEnumerable<Permission>>> GetPermissionsByModule(string module)
        {
            var permissions = await _context.Permissions
                .Where(p => p.Module == module)
                .OrderBy(p => p.SortOrder)
                .ToListAsync();

            return Ok(permissions);
        }

        /// <summary>
        /// التحقق من صلاحية المستخدم
        /// </summary>
        [HttpGet("check")]
        public async Task<ActionResult<bool>> CheckPermission(
            [FromQuery] int userId,
            [FromQuery] string permissionCode)
        {
            // الحصول على المستخدم
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            // إذا كان Super Admin فله كل الصلاحيات
            if (user.IsSuperAdmin)
                return Ok(new { hasPermission = true });

            // التحقق من الصلاحية
            var hasPermission = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Join(_context.RolePermissions, ur => ur.RoleId, rp => rp.RoleId, (ur, rp) => rp)
                .Join(_context.Permissions, rp => rp.PermissionId, p => p.Id, (rp, p) => p)
                .AnyAsync(p => p.Code == permissionCode);

            return Ok(new { hasPermission });
        }

        /// <summary>
        /// الحصول على صلاحيات المستخدم
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<string>>> GetUserPermissions(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            // إذا كان Super Admin
            if (user.IsSuperAdmin)
            {
                var allPermissions = await _context.Permissions
                    .Select(p => p.Code)
                    .ToListAsync();
                return Ok(allPermissions);
            }

            // الحصول على صلاحيات المستخدم من أدواره
            var permissions = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Join(_context.RolePermissions, ur => ur.RoleId, rp => rp.RoleId, (ur, rp) => rp)
                .Join(_context.Permissions, rp => rp.PermissionId, p => p.Id, (rp, p) => p.Code)
                .Distinct()
                .ToListAsync();

            return Ok(permissions);
        }

        /// <summary>
        /// الحصول على صلاحيات المستخدم مفصلة
        /// </summary>
        [HttpGet("user/{userId}/detailed")]
        public async Task<ActionResult<object>> GetUserPermissionsDetailed(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            List<Permission> permissions;

            if (user.IsSuperAdmin)
            {
                permissions = await _context.Permissions.ToListAsync();
            }
            else
            {
                permissions = await _context.UserRoles
                    .Where(ur => ur.UserId == userId)
                    .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission))
                    .Distinct()
                    .ToListAsync();
            }

            var grouped = permissions
                .GroupBy(p => p.Module)
                .Select(g => new
                {
                    Module = g.Key,
                    ModuleName = GetModuleName(g.Key),
                    Permissions = g.Select(p => new
                    {
                        p.Code,
                        p.Name,
                        p.Type
                    })
                })
                .ToList();

            return Ok(new
            {
                UserId = userId,
                IsSuperAdmin = user.IsSuperAdmin,
                Modules = grouped
            });
        }

        /// <summary>
        /// قائمة الوحدات المتاحة
        /// </summary>
        [HttpGet("modules")]
        public ActionResult<IEnumerable<object>> GetModules()
        {
            var modules = new[]
            {
                new { Code = "Dashboard", Name = "لوحة التحكم", NameEn = "Dashboard", Icon = "dashboard" },
                new { Code = "Products", Name = "المنتجات", NameEn = "Products", Icon = "inventory" },
                new { Code = "Customers", Name = "العملاء", NameEn = "Customers", Icon = "people" },
                new { Code = "Invoices", Name = "الفواتير", NameEn = "Invoices", Icon = "receipt" },
                new { Code = "Expenses", Name = "المصروفات", NameEn = "Expenses", Icon = "payments" },
                new { Code = "Revenues", Name = "الإيرادات", NameEn = "Revenues", Icon = "account_balance" },
                new { Code = "Reports", Name = "التقارير", NameEn = "Reports", Icon = "assessment" },
                new { Code = "Users", Name = "المستخدمين", NameEn = "Users", Icon = "manage_accounts" },
                new { Code = "Roles", Name = "الأدوار", NameEn = "Roles", Icon = "admin_panel_settings" },
                new { Code = "Settings", Name = "الإعدادات", NameEn = "Settings", Icon = "settings" },
                new { Code = "Notifications", Name = "الإشعارات", NameEn = "Notifications", Icon = "notifications" },
                new { Code = "ActivityLogs", Name = "سجل النشاط", NameEn = "Activity Logs", Icon = "history" }
            };

            return Ok(modules);
        }

        private static string GetModuleName(string module)
        {
            return module switch
            {
                "Dashboard" => "لوحة التحكم",
                "Products" => "المنتجات",
                "Customers" => "العملاء",
                "Invoices" => "الفواتير",
                "Expenses" => "المصروفات",
                "Revenues" => "الإيرادات",
                "Reports" => "التقارير",
                "Users" => "المستخدمين",
                "Roles" => "الأدوار",
                "Settings" => "الإعدادات",
                "Notifications" => "الإشعارات",
                "ActivityLogs" => "سجل النشاط",
                _ => module
            };
        }

        private static string GetModuleIcon(string module)
        {
            return module switch
            {
                "Dashboard" => "dashboard",
                "Products" => "inventory",
                "Customers" => "people",
                "Invoices" => "receipt",
                "Expenses" => "payments",
                "Revenues" => "account_balance",
                "Reports" => "assessment",
                "Users" => "manage_accounts",
                "Roles" => "admin_panel_settings",
                "Settings" => "settings",
                "Notifications" => "notifications",
                "ActivityLogs" => "history",
                _ => "folder"
            };
        }
    }
}
