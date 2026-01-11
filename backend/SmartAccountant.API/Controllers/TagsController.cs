using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TagsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TagsController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// الحصول على جميع العلامات للحساب
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetTags(
            [FromQuery] int accountId = 1,
            [FromQuery] bool? isActive = null)
        {
            var query = _context.Tags
                .Where(t => t.AccountId == accountId);

            if (isActive.HasValue)
            {
                query = query.Where(t => t.IsActive == isActive.Value);
            }

            var tags = await query
                .OrderBy(t => t.Name)
                .Select(t => new
                {
                    t.Id,
                    t.AccountId,
                    t.Name,
                    t.NameEn,
                    t.Color,
                    t.Description,
                    t.IsActive,
                    t.CreatedAt
                })
                .ToListAsync();

            return Ok(tags);
        }

        /// <summary>
        /// الحصول على علامة محددة
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetTag(int id)
        {
            var tag = await _context.Tags
                .Where(t => t.Id == id)
                .Select(t => new
                {
                    t.Id,
                    t.AccountId,
                    t.Name,
                    t.NameEn,
                    t.Color,
                    t.Description,
                    t.IsActive,
                    t.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (tag == null)
                return NotFound(new { message = "العلامة غير موجودة" });

            return Ok(tag);
        }

        /// <summary>
        /// إنشاء علامة جديدة
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Tag>> CreateTag([FromBody] CreateTagDto dto)
        {
            // التحقق من عدم وجود علامة بنفس الاسم
            var exists = await _context.Tags.AnyAsync(t =>
                t.AccountId == dto.AccountId && t.Name == dto.Name);

            if (exists)
                return BadRequest(new { message = "توجد علامة بنفس الاسم" });

            var tag = new Tag
            {
                AccountId = dto.AccountId,
                Name = dto.Name,
                NameEn = dto.NameEn,
                Color = dto.Color ?? "#3B82F6",
                Description = dto.Description,
                IsActive = true
            };

            _context.Tags.Add(tag);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTag), new { id = tag.Id }, tag);
        }

        /// <summary>
        /// تحديث علامة
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTag(int id, [FromBody] UpdateTagDto dto)
        {
            var tag = await _context.Tags.FindAsync(id);
            if (tag == null)
                return NotFound(new { message = "العلامة غير موجودة" });

            // التحقق من عدم تكرار الاسم
            if (dto.Name != null && dto.Name != tag.Name)
            {
                var exists = await _context.Tags.AnyAsync(t =>
                    t.AccountId == tag.AccountId && t.Name == dto.Name && t.Id != id);
                if (exists)
                    return BadRequest(new { message = "توجد علامة بنفس الاسم" });
            }

            tag.Name = dto.Name ?? tag.Name;
            tag.NameEn = dto.NameEn ?? tag.NameEn;
            tag.Color = dto.Color ?? tag.Color;
            tag.Description = dto.Description ?? tag.Description;
            tag.IsActive = dto.IsActive ?? tag.IsActive;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>
        /// حذف علامة
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTag(int id)
        {
            var tag = await _context.Tags.FindAsync(id);
            if (tag == null)
                return NotFound(new { message = "العلامة غير موجودة" });

            _context.Tags.Remove(tag);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// تفعيل/تعطيل علامة
        /// </summary>
        [HttpPatch("{id}/toggle")]
        public async Task<IActionResult> ToggleTag(int id)
        {
            var tag = await _context.Tags.FindAsync(id);
            if (tag == null)
                return NotFound(new { message = "العلامة غير موجودة" });

            tag.IsActive = !tag.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new { message = tag.IsActive ? "تم تفعيل العلامة" : "تم تعطيل العلامة", isActive = tag.IsActive });
        }
    }

    // DTOs
    public class CreateTagDto
    {
        public int AccountId { get; set; } = 1;
        public required string Name { get; set; }
        public string? NameEn { get; set; }
        public string? Color { get; set; }
        public string? Description { get; set; }
    }

    public class UpdateTagDto
    {
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Color { get; set; }
        public string? Description { get; set; }
        public bool? IsActive { get; set; }
    }
}
