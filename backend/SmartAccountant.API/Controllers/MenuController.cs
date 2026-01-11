using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MenuController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MenuController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// الحصول على جميع عناصر القائمة
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetMenuItems()
        {
            var menuItems = await _context.MenuItems
                .Where(m => m.IsActive && m.ParentId == null)
                .OrderBy(m => m.SortOrder)
                .Select(m => new
                {
                    m.Id,
                    m.Code,
                    m.Title,
                    m.TitleEn,
                    m.Icon,
                    m.Path,
                    m.RequiredPermission,
                    m.SortOrder,
                    m.ShowInSidebar,
                    m.ShowInHeader,
                    Children = m.Children
                        .Where(c => c.IsActive)
                        .OrderBy(c => c.SortOrder)
                        .Select(c => new
                        {
                            c.Id,
                            c.Code,
                            c.Title,
                            c.TitleEn,
                            c.Icon,
                            c.Path,
                            c.RequiredPermission,
                            c.SortOrder,
                            c.ShowInSidebar,
                            c.ShowInHeader
                        })
                })
                .ToListAsync();

            return Ok(menuItems);
        }

        /// <summary>
        /// الحصول على القائمة للمستخدم بناءً على صلاحياته
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetUserMenu(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            // الحصول على صلاحيات المستخدم
            List<string> userPermissions;
            
            if (user.IsSuperAdmin)
            {
                userPermissions = await _context.Permissions
                    .Select(p => p.Code)
                    .ToListAsync();
            }
            else
            {
                userPermissions = await _context.UserRoles
                    .Where(ur => ur.UserId == userId)
                    .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
                    .Distinct()
                    .ToListAsync();
            }

            // الحصول على القائمة مع الفلترة
            var allMenuItems = await _context.MenuItems
                .Where(m => m.IsActive)
                .OrderBy(m => m.SortOrder)
                .ToListAsync();

            var menuItems = allMenuItems
                .Where(m => m.ParentId == null && HasAccess(m, userPermissions))
                .Select(m => new
                {
                    m.Id,
                    m.Code,
                    m.Title,
                    m.TitleEn,
                    m.Icon,
                    m.Path,
                    m.ShowInSidebar,
                    m.ShowInHeader,
                    Children = allMenuItems
                        .Where(c => c.ParentId == m.Id && HasAccess(c, userPermissions))
                        .OrderBy(c => c.SortOrder)
                        .Select(c => new
                        {
                            c.Id,
                            c.Code,
                            c.Title,
                            c.TitleEn,
                            c.Icon,
                            c.Path,
                            c.ShowInSidebar,
                            c.ShowInHeader
                        })
                        .ToList()
                })
                .ToList();

            return Ok(menuItems);
        }

        /// <summary>
        /// الحصول على الشريط الجانبي للمستخدم
        /// </summary>
        [HttpGet("sidebar/{userId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetUserSidebar(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "المستخدم غير موجود" });

            List<string> userPermissions;
            
            if (user.IsSuperAdmin)
            {
                userPermissions = await _context.Permissions.Select(p => p.Code).ToListAsync();
            }
            else
            {
                userPermissions = await _context.UserRoles
                    .Where(ur => ur.UserId == userId)
                    .SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.Code))
                    .Distinct()
                    .ToListAsync();
            }

            var allMenuItems = await _context.MenuItems
                .Where(m => m.IsActive && m.ShowInSidebar)
                .OrderBy(m => m.SortOrder)
                .ToListAsync();

            var sidebar = allMenuItems
                .Where(m => m.ParentId == null && HasAccess(m, userPermissions))
                .Select(m => new
                {
                    m.Id,
                    m.Code,
                    m.Title,
                    m.TitleEn,
                    m.Icon,
                    m.Path,
                    Children = allMenuItems
                        .Where(c => c.ParentId == m.Id && HasAccess(c, userPermissions))
                        .OrderBy(c => c.SortOrder)
                        .Select(c => new
                        {
                            c.Id,
                            c.Code,
                            c.Title,
                            c.TitleEn,
                            c.Icon,
                            c.Path
                        })
                        .ToList()
                })
                .ToList();

            return Ok(sidebar);
        }

        /// <summary>
        /// إضافة عنصر قائمة جديد
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<MenuItem>> CreateMenuItem([FromBody] CreateMenuItemDto dto)
        {
            var exists = await _context.MenuItems.AnyAsync(m => m.Code == dto.Code);
            if (exists)
                return BadRequest(new { message = "كود العنصر موجود مسبقاً" });

            var menuItem = new MenuItem
            {
                Code = dto.Code,
                Title = dto.Title,
                TitleEn = dto.TitleEn,
                Icon = dto.Icon,
                Path = dto.Path,
                ParentId = dto.ParentId,
                RequiredPermission = dto.RequiredPermission,
                SortOrder = dto.SortOrder,
                ShowInSidebar = dto.ShowInSidebar,
                ShowInHeader = dto.ShowInHeader,
                IsActive = true
            };

            _context.MenuItems.Add(menuItem);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMenuItems), new { id = menuItem.Id }, menuItem);
        }

        /// <summary>
        /// تحديث عنصر قائمة
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMenuItem(int id, [FromBody] UpdateMenuItemDto dto)
        {
            var menuItem = await _context.MenuItems.FindAsync(id);
            if (menuItem == null)
                return NotFound(new { message = "العنصر غير موجود" });

            if (dto.Title != null) menuItem.Title = dto.Title;
            if (dto.TitleEn != null) menuItem.TitleEn = dto.TitleEn;
            if (dto.Icon != null) menuItem.Icon = dto.Icon;
            if (dto.Path != null) menuItem.Path = dto.Path;
            if (dto.ParentId.HasValue) menuItem.ParentId = dto.ParentId;
            if (dto.RequiredPermission != null) menuItem.RequiredPermission = dto.RequiredPermission;
            if (dto.SortOrder.HasValue) menuItem.SortOrder = dto.SortOrder.Value;
            if (dto.ShowInSidebar.HasValue) menuItem.ShowInSidebar = dto.ShowInSidebar.Value;
            if (dto.ShowInHeader.HasValue) menuItem.ShowInHeader = dto.ShowInHeader.Value;
            if (dto.IsActive.HasValue) menuItem.IsActive = dto.IsActive.Value;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>
        /// حذف عنصر قائمة
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMenuItem(int id)
        {
            var menuItem = await _context.MenuItems
                .Include(m => m.Children)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (menuItem == null)
                return NotFound(new { message = "العنصر غير موجود" });

            if (menuItem.Children.Any())
                return BadRequest(new { message = "لا يمكن حذف عنصر له عناصر فرعية" });

            _context.MenuItems.Remove(menuItem);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// تحديث ترتيب عناصر القائمة
        /// </summary>
        [HttpPut("reorder")]
        public async Task<IActionResult> ReorderMenuItems([FromBody] List<MenuItemOrderDto> items)
        {
            foreach (var item in items)
            {
                var menuItem = await _context.MenuItems.FindAsync(item.Id);
                if (menuItem != null)
                {
                    menuItem.SortOrder = item.SortOrder;
                    menuItem.ParentId = item.ParentId;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "تم تحديث الترتيب بنجاح" });
        }

        private bool HasAccess(MenuItem menuItem, List<string> userPermissions)
        {
            // إذا لم تكن هناك صلاحية مطلوبة، فالوصول مسموح
            if (string.IsNullOrEmpty(menuItem.RequiredPermission))
                return true;

            // التحقق من وجود الصلاحية
            return userPermissions.Contains(menuItem.RequiredPermission);
        }
    }

    public class CreateMenuItemDto
    {
        public string Code { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? TitleEn { get; set; }
        public string? Icon { get; set; }
        public string? Path { get; set; }
        public int? ParentId { get; set; }
        public string? RequiredPermission { get; set; }
        public int SortOrder { get; set; }
        public bool ShowInSidebar { get; set; } = true;
        public bool ShowInHeader { get; set; } = false;
    }

    public class UpdateMenuItemDto
    {
        public string? Title { get; set; }
        public string? TitleEn { get; set; }
        public string? Icon { get; set; }
        public string? Path { get; set; }
        public int? ParentId { get; set; }
        public string? RequiredPermission { get; set; }
        public int? SortOrder { get; set; }
        public bool? ShowInSidebar { get; set; }
        public bool? ShowInHeader { get; set; }
        public bool? IsActive { get; set; }
    }

    public class MenuItemOrderDto
    {
        public int Id { get; set; }
        public int SortOrder { get; set; }
        public int? ParentId { get; set; }
    }
}
