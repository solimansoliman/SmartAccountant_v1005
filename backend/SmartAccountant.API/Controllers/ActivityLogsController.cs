using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ActivityLogsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ActivityLogsController(ApplicationDbContext context)
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

        /// <summary>
        /// الحصول على سجل النشاطات مع pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<ActivityLogsResponse>> GetActivityLogs(
            [FromQuery] int? userId = null,
            [FromQuery] string? action = null,
            [FromQuery] string? entityType = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var accountId = GetAccountId();

            var query = _context.ActivityLogs
                .Include(a => a.User)
                .Where(a => a.AccountId == accountId)
                .AsQueryable();

            if (userId.HasValue)
                query = query.Where(a => a.UserId == userId);

            if (!string.IsNullOrEmpty(action))
                query = query.Where(a => a.Action == action);

            if (!string.IsNullOrEmpty(entityType))
                query = query.Where(a => a.EntityType == entityType);

            if (fromDate.HasValue)
                query = query.Where(a => a.CreatedAt >= fromDate);

            if (toDate.HasValue)
                query = query.Where(a => a.CreatedAt <= toDate);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var logs = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new ActivityLogDto
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    UserName = a.User != null ? a.User.FullName : "مستخدم غير معروف",
                    Action = a.Action,
                    EntityType = a.EntityType,
                    EntityId = a.EntityId,
                    EntityName = a.EntityName,
                    Description = a.Description,
                    DescriptionEn = a.DescriptionEn,
                    IpAddress = a.IpAddress,
                    Browser = a.Browser,
                    Platform = a.Platform,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            return new ActivityLogsResponse
            {
                Logs = logs,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages
            };
        }

        /// <summary>
        /// الحصول على سجل نشاطات مستخدم معين
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<ActivityLogsResponse>> GetUserActivityLogs(
            int userId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var accountId = GetAccountId();

            var query = _context.ActivityLogs
                .Include(a => a.User)
                .Where(a => a.AccountId == accountId && a.UserId == userId);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var logs = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new ActivityLogDto
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    UserName = a.User != null ? a.User.FullName : "مستخدم غير معروف",
                    Action = a.Action,
                    EntityType = a.EntityType,
                    EntityId = a.EntityId,
                    EntityName = a.EntityName,
                    Description = a.Description,
                    DescriptionEn = a.DescriptionEn,
                    IpAddress = a.IpAddress,
                    Browser = a.Browser,
                    Platform = a.Platform,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            return new ActivityLogsResponse
            {
                Logs = logs,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages
            };
        }

        /// <summary>
        /// إحصائيات النشاطات
        /// </summary>
        [HttpGet("statistics")]
        public async Task<ActionResult<object>> GetStatistics(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var accountId = GetAccountId();
            fromDate ??= DateTime.UtcNow.AddDays(-30);
            toDate ??= DateTime.UtcNow;

            var logs = await _context.ActivityLogs
                .Where(a => a.AccountId == accountId && a.CreatedAt >= fromDate && a.CreatedAt <= toDate)
                .ToListAsync();

            return new
            {
                TotalActivities = logs.Count,
                
                // أكثر المستخدمين نشاطاً
                TopUsers = logs
                    .GroupBy(a => a.UserId)
                    .Select(g => new { UserId = g.Key, Count = g.Count() })
                    .OrderByDescending(x => x.Count)
                    .Take(5),
                
                // أكثر الأنشطة تكراراً
                TopActions = logs
                    .GroupBy(a => a.Action)
                    .Select(g => new { Action = g.Key, Count = g.Count() })
                    .OrderByDescending(x => x.Count)
                    .Take(10),
                
                // النشاطات حسب اليوم
                ActivitiesByDay = logs
                    .GroupBy(a => a.CreatedAt.Date)
                    .Select(g => new { Date = g.Key, Count = g.Count() })
                    .OrderBy(x => x.Date),
                
                // أكثر الكيانات تعديلاً
                TopEntities = logs
                    .GroupBy(a => a.EntityType)
                    .Select(g => new { Entity = g.Key, Count = g.Count() })
                    .OrderByDescending(x => x.Count)
                    .Take(5),

                // عمليات تسجيل الدخول
                LoginStats = new
                {
                    Logins = logs.Count(a => a.Action == "Login" || a.Action == "تسجيل دخول"),
                    Logouts = logs.Count(a => a.Action == "Logout" || a.Action == "تسجيل خروج")
                }
            };
        }

        /// <summary>
        /// الحصول على تفاصيل نشاط
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<ActivityLogDetailDto>> GetActivityLog(int id)
        {
            var accountId = GetAccountId();

            var log = await _context.ActivityLogs
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.Id == id && a.AccountId == accountId);

            if (log == null)
            {
                return NotFound();
            }

            return new ActivityLogDetailDto
            {
                Id = log.Id,
                UserId = log.UserId,
                UserName = log.User?.FullName ?? "مستخدم غير معروف",
                Action = log.Action,
                EntityType = log.EntityType,
                EntityId = log.EntityId,
                EntityName = log.EntityName,
                Description = log.Description,
                DescriptionEn = log.DescriptionEn,
                OldValues = log.OldValues,
                NewValues = log.NewValues,
                Changes = log.Changes,
                IpAddress = log.IpAddress,
                UserAgent = log.UserAgent,
                Browser = log.Browser,
                Platform = log.Platform,
                Location = log.Location,
                Notes = log.Notes,
                CreatedAt = log.CreatedAt
            };
        }

        /// <summary>
        /// تسجيل نشاط جديد (للاستخدام من الـ Frontend)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<ActivityLog>> LogActivity(CreateActivityLogDto dto)
        {
            var accountId = GetAccountId();
            
            // استخدام User-Id من الهيدر أو default
            int userId = 1;
            if (Request.Headers.TryGetValue("X-User-Id", out var userIdHeader) && 
                int.TryParse(userIdHeader, out var parsedUserId))
            {
                userId = parsedUserId;
            }

            var log = new ActivityLog
            {
                AccountId = accountId,
                UserId = userId,
                Action = dto.Action,
                EntityType = dto.EntityType,
                EntityId = dto.EntityId,
                EntityName = dto.EntityName,
                Description = dto.Description,
                DescriptionEn = dto.DescriptionEn,
                OldValues = dto.OldValues,
                NewValues = dto.NewValues,
                Changes = dto.Changes,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                Browser = dto.Browser,
                Platform = dto.Platform,
                Location = dto.Location,
                Notes = dto.Notes
            };

            _context.ActivityLogs.Add(log);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetActivityLog), new { id = log.Id }, log);
        }

        /// <summary>
        /// حذف السجلات القديمة (للصيانة)
        /// </summary>
        [HttpDelete("cleanup")]
        public async Task<ActionResult<object>> CleanupOldLogs([FromQuery] int olderThanDays = 90)
        {
            var accountId = GetAccountId();
            var cutoffDate = DateTime.UtcNow.AddDays(-olderThanDays);

            var deletedCount = await _context.ActivityLogs
                .Where(a => a.AccountId == accountId && a.CreatedAt < cutoffDate)
                .ExecuteDeleteAsync();

            return new { DeletedCount = deletedCount, OlderThan = cutoffDate };
        }

        /// <summary>
        /// الحصول على قائمة الإجراءات المتاحة
        /// </summary>
        [HttpGet("actions")]
        public async Task<ActionResult<IEnumerable<string>>> GetActions()
        {
            var accountId = GetAccountId();

            var actions = await _context.ActivityLogs
                .Where(a => a.AccountId == accountId)
                .Select(a => a.Action)
                .Distinct()
                .OrderBy(a => a)
                .ToListAsync();

            return actions;
        }

        /// <summary>
        /// الحصول على قائمة أنواع الكيانات
        /// </summary>
        [HttpGet("entitytypes")]
        public async Task<ActionResult<IEnumerable<string>>> GetEntityTypes()
        {
            var accountId = GetAccountId();

            var entityTypes = await _context.ActivityLogs
                .Where(a => a.AccountId == accountId && !string.IsNullOrEmpty(a.EntityType))
                .Select(a => a.EntityType)
                .Distinct()
                .OrderBy(e => e)
                .ToListAsync();

            return entityTypes;
        }
    }

    public class ActivityLogsResponse
    {
        public List<ActivityLogDto> Logs { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class ActivityLogDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty;
        public int? EntityId { get; set; }
        public string? EntityName { get; set; }
        public string Description { get; set; } = string.Empty;
        public string? DescriptionEn { get; set; }
        public string? IpAddress { get; set; }
        public string? Browser { get; set; }
        public string? Platform { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ActivityLogDetailDto : ActivityLogDto
    {
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? Changes { get; set; }
        public string? UserAgent { get; set; }
        public string? Location { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateActivityLogDto
    {
        public string Action { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty;
        public int? EntityId { get; set; }
        public string? EntityName { get; set; }
        public string Description { get; set; } = string.Empty;
        public string? DescriptionEn { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? Changes { get; set; }
        public string? Browser { get; set; }
        public string? Platform { get; set; }
        public string? Location { get; set; }
        public string? Notes { get; set; }
    }
}
