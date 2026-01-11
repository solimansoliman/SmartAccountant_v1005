using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Services;
using System.Text.Json;

namespace SmartAccountant.API.Controllers
{
    /// <summary>
    /// كونترولر ربط التاغات - لإدارة التاغات على الكيانات
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EntityTagsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;

        public EntityTagsController(ApplicationDbContext context, IActivityLogService activityLog)
        {
            _context = context;
            _activityLog = activityLog;
        }

        private int GetAccountId() => int.Parse(User.FindFirst("accountId")?.Value ?? "0");
        private int GetUserId() => int.Parse(User.FindFirst("userId")?.Value ?? "0");

        /// <summary>
        /// جلب التاغات حسب نوع الكيان ومعرفه
        /// GET: api/entitytags/entity/Product/5
        /// </summary>
        [HttpGet("entity/{entityType}/{entityId}")]
        public async Task<ActionResult<IEnumerable<EntityTagDto>>> GetTagsByEntity(string entityType, int entityId)
        {
            var tags = await _context.EntityTags
                .Include(et => et.Tag)
                .Where(et => et.EntityType == entityType && et.EntityId == entityId)
                .Select(et => new EntityTagDto
                {
                    Id = et.Id,
                    TagId = et.TagId,
                    TagName = et.Tag != null ? et.Tag.Name : "",
                    TagColor = et.Tag != null ? et.Tag.Color : "",
                    EntityType = et.EntityType,
                    EntityId = et.EntityId,
                    CreatedAt = et.CreatedAt
                })
                .ToListAsync();

            return Ok(tags);
        }

        /// <summary>
        /// جلب الكيانات حسب تاغ معين
        /// GET: api/entitytags/tag/5/Product
        /// </summary>
        [HttpGet("tag/{tagId}/{entityType}")]
        public async Task<ActionResult<IEnumerable<int>>> GetEntitiesByTag(int tagId, string entityType)
        {
            var entityIds = await _context.EntityTags
                .Where(et => et.TagId == tagId && et.EntityType == entityType)
                .Select(et => et.EntityId)
                .ToListAsync();

            return Ok(entityIds);
        }

        /// <summary>
        /// إضافة تاغ لكيان
        /// POST: api/entitytags
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<EntityTagDto>> AddTagToEntity([FromBody] CreateEntityTagDto dto)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            // التحقق من عدم وجود الربط مسبقاً
            var exists = await _context.EntityTags
                .AnyAsync(et => et.TagId == dto.TagId && et.EntityType == dto.EntityType && et.EntityId == dto.EntityId);

            if (exists)
                return BadRequest(new { message = "التاغ مرتبط بهذا الكيان مسبقاً" });

            // التحقق من وجود التاغ
            var tag = await _context.Tags.FindAsync(dto.TagId);
            if (tag == null)
                return NotFound(new { message = "التاغ غير موجود" });

            var entityTag = new EntityTag
            {
                TagId = dto.TagId,
                EntityType = dto.EntityType,
                EntityId = dto.EntityId,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.EntityTags.Add(entityTag);
            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(accountId, userId, "Create", "EntityTag", 
                entityTag.Id, tag.Name, "ربط تاغ بكيان",
                null, JsonSerializer.Serialize(new { TagName = tag.Name, dto.EntityType, dto.EntityId }));

            return CreatedAtAction(nameof(GetTagsByEntity), 
                new { entityType = dto.EntityType, entityId = dto.EntityId }, 
                new EntityTagDto
                {
                    Id = entityTag.Id,
                    TagId = entityTag.TagId,
                    TagName = tag.Name,
                    TagColor = tag.Color,
                    EntityType = entityTag.EntityType,
                    EntityId = entityTag.EntityId,
                    CreatedAt = entityTag.CreatedAt
                });
        }

        /// <summary>
        /// إزالة تاغ من كيان
        /// DELETE: api/entitytags/5
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> RemoveTagFromEntity(int id)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();
            
            var entityTag = await _context.EntityTags
                .Include(et => et.Tag)
                .FirstOrDefaultAsync(et => et.Id == id);

            if (entityTag == null)
                return NotFound();

            var oldData = JsonSerializer.Serialize(new { 
                TagName = entityTag.Tag?.Name, 
                entityTag.EntityType, 
                entityTag.EntityId 
            });

            _context.EntityTags.Remove(entityTag);
            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(accountId, userId, "Delete", "EntityTag", 
                id, entityTag.Tag?.Name, "إزالة تاغ من كيان", oldData, null);

            return NoContent();
        }

        /// <summary>
        /// إزالة تاغ من كيان بمعرفات محددة
        /// DELETE: api/entitytags/tag/5/Product/10
        /// </summary>
        [HttpDelete("tag/{tagId}/{entityType}/{entityId}")]
        public async Task<IActionResult> RemoveTagFromEntityByIds(int tagId, string entityType, int entityId)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();
            
            var entityTag = await _context.EntityTags
                .Include(et => et.Tag)
                .FirstOrDefaultAsync(et => et.TagId == tagId && et.EntityType == entityType && et.EntityId == entityId);

            if (entityTag == null)
                return NotFound();

            var oldData = JsonSerializer.Serialize(new { 
                TagName = entityTag.Tag?.Name, 
                entityTag.EntityType, 
                entityTag.EntityId 
            });

            _context.EntityTags.Remove(entityTag);
            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(accountId, userId, "Delete", "EntityTag", 
                entityTag.Id, entityTag.Tag?.Name, "إزالة تاغ من كيان", oldData, null);

            return NoContent();
        }
    }

    // DTOs
    public class EntityTagDto
    {
        public int Id { get; set; }
        public int TagId { get; set; }
        public string TagName { get; set; } = string.Empty;
        public string? TagColor { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateEntityTagDto
    {
        public int TagId { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
    }
}
