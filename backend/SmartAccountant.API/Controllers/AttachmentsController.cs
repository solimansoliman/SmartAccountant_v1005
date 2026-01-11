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
    /// كونترولر المرفقات - لإدارة الملفات المرفقة مع الكيانات
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AttachmentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;

        public AttachmentsController(ApplicationDbContext context, IActivityLogService activityLog)
        {
            _context = context;
            _activityLog = activityLog;
        }

        private int GetAccountId() => int.Parse(User.FindFirst("accountId")?.Value ?? "0");
        private int GetUserId() => int.Parse(User.FindFirst("userId")?.Value ?? "0");

        /// <summary>
        /// جلب المرفقات حسب نوع الكيان ومعرفه
        /// GET: api/attachments/entity/Invoice/5
        /// </summary>
        [HttpGet("entity/{entityType}/{entityId}")]
        public async Task<ActionResult<IEnumerable<AttachmentDto>>> GetAttachmentsByEntity(string entityType, int entityId)
        {
            var accountId = GetAccountId();
            var attachments = await _context.Attachments
                .Where(a => a.AccountId == accountId && a.EntityType == entityType && a.EntityId == entityId)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new AttachmentDto
                {
                    Id = a.Id,
                    EntityType = a.EntityType,
                    EntityId = a.EntityId,
                    FileName = a.FileName,
                    OriginalFileName = a.OriginalFileName,
                    FileUrl = a.FileUrl,
                    FileSize = a.FileSize,
                    FileType = a.FileType,
                    MimeType = a.MimeType,
                    Description = a.Description,
                    IsPublic = a.IsPublic,
                    DownloadCount = a.DownloadCount,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            return Ok(attachments);
        }

        /// <summary>
        /// جلب مرفق واحد
        /// GET: api/attachments/5
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<AttachmentDto>> GetAttachment(int id)
        {
            var accountId = GetAccountId();
            var attachment = await _context.Attachments
                .Where(a => a.AccountId == accountId && a.Id == id)
                .Select(a => new AttachmentDto
                {
                    Id = a.Id,
                    EntityType = a.EntityType,
                    EntityId = a.EntityId,
                    FileName = a.FileName,
                    OriginalFileName = a.OriginalFileName,
                    FileUrl = a.FileUrl,
                    FileSize = a.FileSize,
                    FileType = a.FileType,
                    MimeType = a.MimeType,
                    Description = a.Description,
                    IsPublic = a.IsPublic,
                    DownloadCount = a.DownloadCount,
                    CreatedAt = a.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (attachment == null)
                return NotFound();

            return Ok(attachment);
        }

        /// <summary>
        /// إضافة مرفق جديد
        /// POST: api/attachments
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<AttachmentDto>> CreateAttachment([FromBody] CreateAttachmentDto dto)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            var attachment = new Attachment
            {
                AccountId = accountId,
                EntityType = dto.EntityType,
                EntityId = dto.EntityId,
                FileName = dto.FileName,
                OriginalFileName = dto.OriginalFileName,
                FilePath = dto.FilePath,
                FileUrl = dto.FileUrl,
                FileSize = dto.FileSize,
                FileType = dto.FileType,
                MimeType = dto.MimeType,
                Description = dto.Description,
                IsPublic = dto.IsPublic,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Attachments.Add(attachment);
            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(accountId, userId, "Create", "Attachment", 
                attachment.Id, attachment.OriginalFileName, "إضافة مرفق جديد",
                null, JsonSerializer.Serialize(new { attachment.FileName, attachment.EntityType, attachment.EntityId }));

            return CreatedAtAction(nameof(GetAttachment), new { id = attachment.Id }, new AttachmentDto
            {
                Id = attachment.Id,
                EntityType = attachment.EntityType,
                EntityId = attachment.EntityId,
                FileName = attachment.FileName,
                OriginalFileName = attachment.OriginalFileName,
                FileUrl = attachment.FileUrl,
                FileSize = attachment.FileSize,
                FileType = attachment.FileType,
                MimeType = attachment.MimeType,
                Description = attachment.Description,
                IsPublic = attachment.IsPublic,
                DownloadCount = attachment.DownloadCount,
                CreatedAt = attachment.CreatedAt
            });
        }

        /// <summary>
        /// حذف مرفق
        /// DELETE: api/attachments/5
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAttachment(int id)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();
            var attachment = await _context.Attachments
                .FirstOrDefaultAsync(a => a.AccountId == accountId && a.Id == id);

            if (attachment == null)
                return NotFound();

            var oldData = JsonSerializer.Serialize(new { attachment.Id, attachment.FileName, attachment.EntityType, attachment.EntityId });
            _context.Attachments.Remove(attachment);
            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(accountId, userId, "Delete", "Attachment", 
                id, attachment.OriginalFileName, "حذف مرفق", oldData, null);

            return NoContent();
        }
    }

    // DTOs
    public class AttachmentDto
    {
        public int Id { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public string? FileUrl { get; set; }
        public long FileSize { get; set; }
        public string? FileType { get; set; }
        public string? MimeType { get; set; }
        public string? Description { get; set; }
        public bool IsPublic { get; set; }
        public int DownloadCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateAttachmentDto
    {
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public string? FilePath { get; set; }
        public string? FileUrl { get; set; }
        public long FileSize { get; set; }
        public string? FileType { get; set; }
        public string? MimeType { get; set; }
        public string? Description { get; set; }
        public bool IsPublic { get; set; }
    }
}
