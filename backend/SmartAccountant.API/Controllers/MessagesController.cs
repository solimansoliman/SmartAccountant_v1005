using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MessagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MessagesController(ApplicationDbContext context)
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
        /// الحصول على صندوق الوارد
        /// </summary>
        [HttpGet("inbox")]
        public async Task<ActionResult<IEnumerable<MessageDto>>> GetInbox(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();
            
            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            var messages = await _context.Messages
                .Include(m => m.Sender)
                .Where(m => m.AccountId == accountId && 
                           (m.ReceiverId == userId || (m.ReceiverId == null && m.Type == MessageType.Broadcast)) &&
                           !m.IsDeletedByReceiver)
                .OrderByDescending(m => m.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    SenderId = m.SenderId,
                    SenderName = m.Sender.FullName,
                    Subject = m.Subject,
                    Content = m.Content,
                    Type = m.Type.ToString(),
                    Priority = m.Priority.ToString(),
                    IsRead = m.IsRead,
                    HasAttachment = m.AttachmentUrl != null,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            return messages;
        }

        /// <summary>
        /// الحصول على الرسائل المرسلة
        /// </summary>
        [HttpGet("sent")]
        public async Task<ActionResult<IEnumerable<MessageDto>>> GetSentMessages(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();
            
            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            var messages = await _context.Messages
                .Include(m => m.Receiver)
                .Where(m => m.AccountId == accountId && m.SenderId == userId && !m.IsDeletedBySender)
                .OrderByDescending(m => m.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    ReceiverId = m.ReceiverId,
                    ReceiverName = m.Receiver != null ? m.Receiver.FullName : "الجميع",
                    Subject = m.Subject,
                    Content = m.Content,
                    Type = m.Type.ToString(),
                    Priority = m.Priority.ToString(),
                    IsRead = m.IsRead,
                    HasAttachment = m.AttachmentUrl != null,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            return messages;
        }

        /// <summary>
        /// عدد الرسائل غير المقروءة
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

            return await _context.Messages
                .CountAsync(m => m.AccountId == accountId && 
                               (m.ReceiverId == userId || (m.ReceiverId == null && m.Type == MessageType.Broadcast)) &&
                               !m.IsRead && !m.IsDeletedByReceiver);
        }

        /// <summary>
        /// الحصول على رسالة
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Message>> GetMessage(int id)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            var message = await _context.Messages
                .Include(m => m.Sender)
                .Include(m => m.Receiver)
                .Include(m => m.Replies)
                .ThenInclude(r => r.Sender)
                .FirstOrDefaultAsync(m => m.Id == id && m.AccountId == accountId &&
                    (m.SenderId == userId || m.ReceiverId == userId || m.ReceiverId == null));

            if (message == null)
            {
                return NotFound();
            }

            // تحديد كمقروءة إذا كان المستلم
            if (message.ReceiverId == userId && !message.IsRead)
            {
                message.IsRead = true;
                message.ReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return message;
        }

        /// <summary>
        /// إرسال رسالة
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Message>> SendMessage(SendMessageDto dto)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            if (!userId.HasValue)
            {
                return Unauthorized();
            }

            var message = new Message
            {
                AccountId = accountId,
                SenderId = userId.Value,
                ReceiverId = dto.ReceiverId,
                Subject = dto.Subject,
                Content = dto.Content,
                Type = dto.ReceiverId.HasValue ? MessageType.Direct : MessageType.Broadcast,
                Priority = dto.Priority,
                AttachmentUrl = dto.AttachmentUrl,
                ParentMessageId = dto.ParentMessageId
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            // إرسال إشعار للمستلم
            if (dto.ReceiverId.HasValue)
            {
                var sender = await _context.Users.FindAsync(userId);
                _context.Notifications.Add(new Notification
                {
                    AccountId = accountId,
                    UserId = dto.ReceiverId.Value,
                    Title = "رسالة جديدة",
                    Body = $"لديك رسالة جديدة من {sender?.FullName}",
                    Type = NotificationType.Info,
                    ActionUrl = $"/messages/{message.Id}",
                    Icon = "mail"
                });
                await _context.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetMessage), new { id = message.Id }, message);
        }

        /// <summary>
        /// حذف رسالة (soft delete)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMessage(int id)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            var message = await _context.Messages
                .FirstOrDefaultAsync(m => m.Id == id && m.AccountId == accountId &&
                    (m.SenderId == userId || m.ReceiverId == userId));

            if (message == null)
            {
                return NotFound();
            }

            if (message.SenderId == userId)
            {
                message.IsDeletedBySender = true;
            }
            if (message.ReceiverId == userId)
            {
                message.IsDeletedByReceiver = true;
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// الحصول على مستخدمي الحساب للإرسال
        /// </summary>
        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<object>>> GetAccountUsers()
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            return await _context.Users
                .Where(u => u.AccountId == accountId && u.IsActive && u.Id != userId)
                .Select(u => new { u.Id, u.FullName, u.Username, u.Email, u.AccountId, Role = u.RoleType.ToString() })
                .ToListAsync();
        }

        /// <summary>
        /// الحصول على جميع المستخدمين (للأدمن فقط)
        /// </summary>
        [HttpGet("all-users")]
        public async Task<ActionResult<IEnumerable<object>>> GetAllUsers()
        {
            var userId = GetUserId();

            return await _context.Users
                .Where(u => u.IsActive && u.Id != userId)
                .Select(u => new { u.Id, u.FullName, u.Username, u.Email, u.AccountId, Role = u.RoleType.ToString() })
                .ToListAsync();
        }

        /// <summary>
        /// الحصول على جميع الحسابات
        /// </summary>
        [HttpGet("accounts")]
        public async Task<ActionResult<IEnumerable<object>>> GetAllAccounts()
        {
            return await _context.Accounts
                .Where(a => a.IsActive)
                .Select(a => new { a.Id, a.Name, a.NameEn })
                .ToListAsync();
        }

        /// <summary>
        /// الحصول على حدود عدد الحروف للمستخدم الحالي
        /// </summary>
        [HttpGet("limits")]
        public async Task<ActionResult<object>> GetCharacterLimits()
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            // جلب حدود الحساب
            var account = await _context.Accounts
                .Where(a => a.Id == accountId)
                .Select(a => new { a.MaxMessageLength, a.MaxNotificationLength })
                .FirstOrDefaultAsync();

            if (account == null)
            {
                return Ok(new { maxMessageLength = 1000, maxNotificationLength = 500 });
            }

            // جلب حدود المستخدم (إن وجدت)
            if (userId.HasValue)
            {
                var user = await _context.Users
                    .Where(u => u.Id == userId)
                    .Select(u => new { u.MaxMessageLength, u.MaxNotificationLength })
                    .FirstOrDefaultAsync();

                if (user != null)
                {
                    // إذا كان حد المستخدم = 0، استخدم حد الحساب
                    // إذا كان حد المستخدم = -1، بدون حد
                    // غير ذلك، استخدم حد المستخدم
                    var maxMsg = user.MaxMessageLength == 0 ? account.MaxMessageLength :
                                 user.MaxMessageLength == -1 ? 0 : user.MaxMessageLength;
                    var maxNotif = user.MaxNotificationLength == 0 ? account.MaxNotificationLength :
                                   user.MaxNotificationLength == -1 ? 0 : user.MaxNotificationLength;

                    return Ok(new { maxMessageLength = maxMsg, maxNotificationLength = maxNotif });
                }
            }

            return Ok(new { maxMessageLength = account.MaxMessageLength, maxNotificationLength = account.MaxNotificationLength });
        }
    }

    public class MessageDto
    {
        public int Id { get; set; }
        public int? SenderId { get; set; }
        public string? SenderName { get; set; }
        public int? ReceiverId { get; set; }
        public string? ReceiverName { get; set; }
        public string? Subject { get; set; }
        public string Content { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public bool HasAttachment { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class SendMessageDto
    {
        public int? ReceiverId { get; set; }
        public string? Subject { get; set; }
        public string Content { get; set; } = string.Empty;
        public MessagePriority Priority { get; set; } = MessagePriority.Normal;
        public string? AttachmentUrl { get; set; }
        public int? ParentMessageId { get; set; }
    }
}
