using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public NotificationsController(ApplicationDbContext context)
        {
            _context = context;
        }

        private int GetAccountId()
        {
            if (Request.Headers.TryGetValue("X-Account-Id", out var accountIdHeader) && 
                int.TryParse(accountIdHeader, out var accountId))
            {
                return accountId;
            }
            return 1;
        }

        private int? GetUserId()
        {
            if (Request.Headers.TryGetValue("X-User-Id", out var userIdHeader) && 
                int.TryParse(userIdHeader, out var userId))
            {
                return userId;
            }
            return null;
        }

        /// <summary>
        /// الحصول على إشعارات المستخدم
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Notification>>> GetNotifications(
            [FromQuery] bool? unreadOnly = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();
            
            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            var query = _context.Notifications
                .Where(n => n.AccountId == accountId && n.UserId == userId)
                .Where(n => n.ExpiresAt == null || n.ExpiresAt > DateTime.UtcNow);

            if (unreadOnly == true)
            {
                query = query.Where(n => !n.IsRead);
            }

            var notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return notifications;
        }

        /// <summary>
        /// عدد الإشعارات غير المقروءة
        /// </summary>
        [HttpGet("unread-count")]
        public async Task<ActionResult<int>> GetUnreadCount()
        {
            var accountId = GetAccountId();
            var userId = GetUserId();
            
            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            return await _context.Notifications
                .CountAsync(n => n.AccountId == accountId && n.UserId == userId && !n.IsRead);
        }

        /// <summary>
        /// تحديد إشعار كمقروء
        /// </summary>
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.AccountId == accountId && n.UserId == userId);

            if (notification == null)
            {
                return NotFound();
            }

            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// تحديد جميع الإشعارات كمقروءة
        /// </summary>
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            await _context.Notifications
                .Where(n => n.AccountId == accountId && n.UserId == userId && !n.IsRead)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(n => n.IsRead, true)
                    .SetProperty(n => n.ReadAt, DateTime.UtcNow));

            return NoContent();
        }

        /// <summary>
        /// إرسال إشعار لمستخدم
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Notification>> CreateNotification(CreateNotificationDto dto)
        {
            var accountId = GetAccountId();

            var notification = new Notification
            {
                AccountId = accountId,
                UserId = dto.UserId,
                Title = dto.Title,
                Body = dto.Message,
                Type = dto.Type,
                ActionUrl = dto.Link,
                Icon = dto.Icon,
                ExpiresAt = dto.ExpiresAt,
                Notes = dto.Data
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetNotifications), notification);
        }

        /// <summary>
        /// إرسال إشعار لجميع مستخدمي الحساب
        /// </summary>
        [HttpPost("broadcast")]
        public async Task<IActionResult> BroadcastNotification(BroadcastNotificationDto dto)
        {
            var accountId = GetAccountId();

            var users = await _context.Users
                .Where(u => u.AccountId == accountId && u.IsActive)
                .Select(u => u.Id)
                .ToListAsync();

            var notifications = users.Select(userId => new Notification
            {
                AccountId = accountId,
                UserId = userId,
                Title = dto.Title,
                Body = dto.Message,
                Type = dto.Type,
                ActionUrl = dto.Link,
                Icon = dto.Icon,
                ExpiresAt = dto.ExpiresAt
            }).ToList();

            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();

            return Ok(new { SentTo = users.Count });
        }

        /// <summary>
        /// حذف إشعار
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.AccountId == accountId && n.UserId == userId);

            if (notification == null)
            {
                return NotFound();
            }

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    public class CreateNotificationDto
    {
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public NotificationType Type { get; set; } = NotificationType.Info;
        public string? Link { get; set; }
        public string? Icon { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string? Data { get; set; }
    }

    public class BroadcastNotificationDto
    {
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public NotificationType Type { get; set; } = NotificationType.Info;
        public string? Link { get; set; }
        public string? Icon { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
