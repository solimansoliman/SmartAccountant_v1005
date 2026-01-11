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
    /// كونترولر التعليقات - لإدارة التعليقات على الكيانات
    /// يدعم التعليقات المتداخلة (ردود على تعليقات)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CommentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;

        public CommentsController(ApplicationDbContext context, IActivityLogService activityLog)
        {
            _context = context;
            _activityLog = activityLog;
        }

        private int GetAccountId() => int.Parse(User.FindFirst("accountId")?.Value ?? "0");
        private int GetUserId() => int.Parse(User.FindFirst("userId")?.Value ?? "0");

        /// <summary>
        /// جلب التعليقات حسب نوع الكيان ومعرفه
        /// GET: api/comments/entity/Invoice/5
        /// </summary>
        [HttpGet("entity/{entityType}/{entityId}")]
        public async Task<ActionResult<IEnumerable<CommentDto>>> GetCommentsByEntity(string entityType, int entityId)
        {
            var accountId = GetAccountId();
            
            // جلب التعليقات الرئيسية فقط (بدون ParentCommentId)
            var comments = await _context.Comments
                .Include(c => c.User)
                .Include(c => c.Replies)
                    .ThenInclude(r => r.User)
                .Where(c => c.AccountId == accountId 
                    && c.EntityType == entityType 
                    && c.EntityId == entityId
                    && c.ParentCommentId == null
                    && c.DeletedAt == null)
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new CommentDto
                {
                    Id = c.Id,
                    EntityType = c.EntityType,
                    EntityId = c.EntityId,
                    UserId = c.UserId,
                    UserName = c.User != null ? c.User.FullName : "Unknown",
                    Content = c.Content,
                    IsInternal = c.IsInternal,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt,
                    Replies = c.Replies
                        .Where(r => r.DeletedAt == null)
                        .Select(r => new CommentDto
                        {
                            Id = r.Id,
                            EntityType = r.EntityType,
                            EntityId = r.EntityId,
                            ParentCommentId = r.ParentCommentId,
                            UserId = r.UserId,
                            UserName = r.User != null ? r.User.FullName : "Unknown",
                            Content = r.Content,
                            IsInternal = r.IsInternal,
                            CreatedAt = r.CreatedAt,
                            UpdatedAt = r.UpdatedAt
                        }).ToList()
                })
                .ToListAsync();

            return Ok(comments);
        }

        /// <summary>
        /// جلب تعليق واحد
        /// GET: api/comments/5
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<CommentDto>> GetComment(int id)
        {
            var accountId = GetAccountId();
            var comment = await _context.Comments
                .Include(c => c.User)
                .Where(c => c.AccountId == accountId && c.Id == id && c.DeletedAt == null)
                .Select(c => new CommentDto
                {
                    Id = c.Id,
                    EntityType = c.EntityType,
                    EntityId = c.EntityId,
                    ParentCommentId = c.ParentCommentId,
                    UserId = c.UserId,
                    UserName = c.User != null ? c.User.FullName : "Unknown",
                    Content = c.Content,
                    IsInternal = c.IsInternal,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (comment == null)
                return NotFound();

            return Ok(comment);
        }

        /// <summary>
        /// إضافة تعليق جديد
        /// POST: api/comments
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<CommentDto>> CreateComment([FromBody] CreateCommentDto dto)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            var comment = new Comment
            {
                AccountId = accountId,
                EntityType = dto.EntityType,
                EntityId = dto.EntityId,
                ParentCommentId = dto.ParentCommentId,
                UserId = userId,
                Content = dto.Content,
                IsInternal = dto.IsInternal,
                CreatedAt = DateTime.UtcNow
            };

            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(accountId, userId, "Create", "Comment", 
                comment.Id, null, "إضافة تعليق جديد",
                null, JsonSerializer.Serialize(new { comment.Content, comment.EntityType, comment.EntityId }));

            var user = await _context.Users.FindAsync(userId);

            return CreatedAtAction(nameof(GetComment), new { id = comment.Id }, new CommentDto
            {
                Id = comment.Id,
                EntityType = comment.EntityType,
                EntityId = comment.EntityId,
                ParentCommentId = comment.ParentCommentId,
                UserId = comment.UserId,
                UserName = user?.FullName ?? "Unknown",
                Content = comment.Content,
                IsInternal = comment.IsInternal,
                CreatedAt = comment.CreatedAt
            });
        }

        /// <summary>
        /// تعديل تعليق
        /// PUT: api/comments/5
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateComment(int id, [FromBody] UpdateCommentDto dto)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            var comment = await _context.Comments
                .FirstOrDefaultAsync(c => c.AccountId == accountId && c.Id == id && c.DeletedAt == null);

            if (comment == null)
                return NotFound();

            // فقط صاحب التعليق يمكنه تعديله
            if (comment.UserId != userId)
                return Forbid();

            var oldContent = comment.Content;
            comment.Content = dto.Content;
            comment.IsInternal = dto.IsInternal;
            comment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(accountId, userId, "Update", "Comment", 
                id, null, "تعديل تعليق",
                JsonSerializer.Serialize(new { Content = oldContent }), 
                JsonSerializer.Serialize(new { Content = dto.Content }));

            return NoContent();
        }

        /// <summary>
        /// حذف تعليق (Soft Delete)
        /// DELETE: api/comments/5
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(int id)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            var comment = await _context.Comments
                .FirstOrDefaultAsync(c => c.AccountId == accountId && c.Id == id && c.DeletedAt == null);

            if (comment == null)
                return NotFound();

            // فقط صاحب التعليق يمكنه حذفه (أو المسؤول)
            var user = await _context.Users.FindAsync(userId);
            if (comment.UserId != userId && user?.IsSuperAdmin != true)
                return Forbid();

            comment.DeletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(accountId, userId, "Delete", "Comment", 
                id, null, "حذف تعليق",
                JsonSerializer.Serialize(new { comment.Content }), null);

            return NoContent();
        }
    }

    // DTOs
    public class CommentDto
    {
        public int Id { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public int? ParentCommentId { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsInternal { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<CommentDto>? Replies { get; set; }
    }

    public class CreateCommentDto
    {
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public int? ParentCommentId { get; set; }
        public string Content { get; set; } = string.Empty;
        public bool IsInternal { get; set; }
    }

    public class UpdateCommentDto
    {
        public string Content { get; set; } = string.Empty;
        public bool IsInternal { get; set; }
    }
}
