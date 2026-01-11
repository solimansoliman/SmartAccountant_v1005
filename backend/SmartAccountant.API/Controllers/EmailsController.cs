using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmailsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public EmailsController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// الحصول على جميع الإيميلات
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? entityType = null, [FromQuery] int? entityId = null)
        {
            var query = _context.Emails.Where(e => e.IsActive);
            
            if (!string.IsNullOrEmpty(entityType))
                query = query.Where(e => e.EntityType == entityType);
                
            if (entityId.HasValue)
                query = query.Where(e => e.EntityId == entityId.Value);

            var emails = await query
                .OrderByDescending(e => e.IsPrimary)
                .ThenBy(e => e.Id)
                .ToListAsync();

            return Ok(new { success = true, count = emails.Count, data = emails });
        }

        /// <summary>
        /// الحصول على إيميلات عميل معين
        /// </summary>
        [HttpGet("customer/{customerId}")]
        public async Task<IActionResult> GetByCustomer(int customerId)
        {
            var emails = await _context.Emails
                .Where(e => e.EntityType == "Customer" && e.EntityId == customerId && e.IsActive)
                .OrderByDescending(e => e.IsPrimary)
                .ToListAsync();

            return Ok(new { success = true, count = emails.Count, data = emails });
        }

        /// <summary>
        /// الحصول على إيميلات حساب معين
        /// </summary>
        [HttpGet("account/{accountId}")]
        public async Task<IActionResult> GetByAccount(int accountId)
        {
            var emails = await _context.Emails
                .Where(e => e.EntityType == "Account" && e.EntityId == accountId && e.IsActive)
                .OrderByDescending(e => e.IsPrimary)
                .ToListAsync();

            return Ok(new { success = true, count = emails.Count, data = emails });
        }

        /// <summary>
        /// الحصول على إيميل بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var email = await _context.Emails.FindAsync(id);
            if (email == null)
                return NotFound(new { success = false, message = "البريد الإلكتروني غير موجود" });

            return Ok(new { success = true, data = email });
        }

        /// <summary>
        /// إضافة إيميل جديد
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] EmailCreateDto dto)
        {
            var email = new Email
            {
                AccountId = dto.AccountId,
                EntityType = dto.EntityType,
                EntityId = dto.EntityId,
                EmailAddress = dto.EmailAddress,
                EmailType = dto.EmailType ?? "work",
                Label = dto.Label,
                IsPrimary = dto.IsPrimary,
                CanReceiveInvoices = dto.CanReceiveInvoices,
                CanReceiveMarketing = dto.CanReceiveMarketing,
                CanReceiveNotifications = dto.CanReceiveNotifications,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = dto.CreatedByUserId
            };

            // إذا كان أساسي، إلغاء الأساسي من الإيميلات الأخرى
            if (email.IsPrimary)
            {
                var existingPrimary = await _context.Emails
                    .Where(e => e.EntityType == email.EntityType && e.EntityId == email.EntityId && e.IsPrimary)
                    .ToListAsync();
                    
                foreach (var e in existingPrimary)
                    e.IsPrimary = false;
            }

            _context.Emails.Add(email);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = email.Id }, 
                new { success = true, message = "تم إضافة البريد الإلكتروني بنجاح", data = email });
        }

        /// <summary>
        /// تحديث إيميل
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] EmailUpdateDto dto)
        {
            var email = await _context.Emails.FindAsync(id);
            if (email == null)
                return NotFound(new { success = false, message = "البريد الإلكتروني غير موجود" });

            email.EmailAddress = dto.EmailAddress ?? email.EmailAddress;
            email.EmailType = dto.EmailType ?? email.EmailType;
            email.Label = dto.Label ?? email.Label;
            email.IsPrimary = dto.IsPrimary ?? email.IsPrimary;
            email.CanReceiveInvoices = dto.CanReceiveInvoices ?? email.CanReceiveInvoices;
            email.CanReceiveMarketing = dto.CanReceiveMarketing ?? email.CanReceiveMarketing;
            email.CanReceiveNotifications = dto.CanReceiveNotifications ?? email.CanReceiveNotifications;
            email.Notes = dto.Notes ?? email.Notes;
            email.UpdatedAt = DateTime.UtcNow;

            // إذا كان أساسي، إلغاء الأساسي من الإيميلات الأخرى
            if (email.IsPrimary)
            {
                var existingPrimary = await _context.Emails
                    .Where(e => e.EntityType == email.EntityType && e.EntityId == email.EntityId && e.IsPrimary && e.Id != id)
                    .ToListAsync();
                    
                foreach (var e in existingPrimary)
                    e.IsPrimary = false;
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم تحديث البريد الإلكتروني بنجاح", data = email });
        }

        /// <summary>
        /// حذف إيميل
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var email = await _context.Emails.FindAsync(id);
            if (email == null)
                return NotFound(new { success = false, message = "البريد الإلكتروني غير موجود" });

            email.IsActive = false;
            email.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "تم حذف البريد الإلكتروني بنجاح" });
        }
    }

    // DTOs
    public class EmailCreateDto
    {
        public int AccountId { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public string EmailAddress { get; set; } = string.Empty;
        public string? EmailType { get; set; }
        public string? Label { get; set; }
        public bool IsPrimary { get; set; }
        public bool CanReceiveInvoices { get; set; } = true;
        public bool CanReceiveMarketing { get; set; }
        public bool CanReceiveNotifications { get; set; } = true;
        public string? Notes { get; set; }
        public int? CreatedByUserId { get; set; }
    }

    public class EmailUpdateDto
    {
        public string? EmailAddress { get; set; }
        public string? EmailType { get; set; }
        public string? Label { get; set; }
        public bool? IsPrimary { get; set; }
        public bool? CanReceiveInvoices { get; set; }
        public bool? CanReceiveMarketing { get; set; }
        public bool? CanReceiveNotifications { get; set; }
        public string? Notes { get; set; }
    }
}
