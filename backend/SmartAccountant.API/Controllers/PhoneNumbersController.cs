using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PhoneNumbersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PhoneNumbersController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// الحصول على جميع أرقام الهواتف
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? entityType = null, [FromQuery] int? entityId = null)
        {
            var query = _context.PhoneNumbers.Where(p => p.IsActive);
            
            if (!string.IsNullOrEmpty(entityType))
                query = query.Where(p => p.EntityType == entityType);
                
            if (entityId.HasValue)
                query = query.Where(p => p.EntityId == entityId.Value);

            var phones = await query
                .OrderByDescending(p => p.IsPrimary)
                .ThenBy(p => p.Id)
                .ToListAsync();

            return Ok(new { success = true, count = phones.Count, data = phones });
        }

        /// <summary>
        /// الحصول على أرقام هواتف عميل معين
        /// </summary>
        [HttpGet("customer/{customerId}")]
        public async Task<IActionResult> GetByCustomer(int customerId)
        {
            var phones = await _context.PhoneNumbers
                .Where(p => p.EntityType == "Customer" && p.EntityId == customerId && p.IsActive)
                .OrderByDescending(p => p.IsPrimary)
                .ToListAsync();

            return Ok(new { success = true, count = phones.Count, data = phones });
        }

        /// <summary>
        /// الحصول على أرقام هواتف حساب معين
        /// </summary>
        [HttpGet("account/{accountId}")]
        public async Task<IActionResult> GetByAccount(int accountId)
        {
            var phones = await _context.PhoneNumbers
                .Where(p => p.EntityType == "Account" && p.EntityId == accountId && p.IsActive)
                .OrderByDescending(p => p.IsPrimary)
                .ToListAsync();

            return Ok(new { success = true, count = phones.Count, data = phones });
        }

        /// <summary>
        /// الحصول على رقم هاتف بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var phone = await _context.PhoneNumbers.FindAsync(id);
            if (phone == null)
                return NotFound(new { success = false, message = "رقم الهاتف غير موجود" });

            return Ok(new { success = true, data = phone });
        }

        /// <summary>
        /// إضافة رقم هاتف جديد
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PhoneNumberCreateDto dto)
        {
            var phone = new PhoneNumber
            {
                AccountId = dto.AccountId,
                EntityType = dto.EntityType,
                EntityId = dto.EntityId,
                Phone = dto.Phone,
                CountryCode = dto.CountryCode,
                PhoneType = dto.PhoneType ?? "mobile",
                Label = dto.Label,
                IsPrimary = dto.IsPrimary,
                IsWhatsApp = dto.IsWhatsApp,
                IsTelegram = dto.IsTelegram,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = dto.CreatedByUserId
            };

            // إذا كان أساسي، إلغاء الأساسي من الأرقام الأخرى
            if (phone.IsPrimary)
            {
                var existingPrimary = await _context.PhoneNumbers
                    .Where(p => p.EntityType == phone.EntityType && p.EntityId == phone.EntityId && p.IsPrimary)
                    .ToListAsync();
                    
                foreach (var p in existingPrimary)
                    p.IsPrimary = false;
            }

            _context.PhoneNumbers.Add(phone);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = phone.Id }, 
                new { success = true, message = "تم إضافة رقم الهاتف بنجاح", data = phone });
        }

        /// <summary>
        /// تحديث رقم هاتف
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] PhoneNumberUpdateDto dto)
        {
            var phone = await _context.PhoneNumbers.FindAsync(id);
            if (phone == null)
                return NotFound(new { success = false, message = "رقم الهاتف غير موجود" });

            phone.Phone = dto.Phone ?? phone.Phone;
            phone.CountryCode = dto.CountryCode ?? phone.CountryCode;
            phone.PhoneType = dto.PhoneType ?? phone.PhoneType;
            phone.Label = dto.Label ?? phone.Label;
            phone.IsPrimary = dto.IsPrimary ?? phone.IsPrimary;
            phone.IsWhatsApp = dto.IsWhatsApp ?? phone.IsWhatsApp;
            phone.IsTelegram = dto.IsTelegram ?? phone.IsTelegram;
            phone.Notes = dto.Notes ?? phone.Notes;
            phone.UpdatedAt = DateTime.UtcNow;

            // إذا كان أساسي، إلغاء الأساسي من الأرقام الأخرى
            if (phone.IsPrimary)
            {
                var existingPrimary = await _context.PhoneNumbers
                    .Where(p => p.EntityType == phone.EntityType && p.EntityId == phone.EntityId && p.IsPrimary && p.Id != id)
                    .ToListAsync();
                    
                foreach (var p in existingPrimary)
                    p.IsPrimary = false;
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "تم تحديث رقم الهاتف بنجاح", data = phone });
        }

        /// <summary>
        /// حذف رقم هاتف
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var phone = await _context.PhoneNumbers.FindAsync(id);
            if (phone == null)
                return NotFound(new { success = false, message = "رقم الهاتف غير موجود" });

            phone.IsActive = false;
            phone.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "تم حذف رقم الهاتف بنجاح" });
        }
    }

    // DTOs
    public class PhoneNumberCreateDto
    {
        public int AccountId { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string? CountryCode { get; set; }
        public string? PhoneType { get; set; }
        public string? Label { get; set; }
        public bool IsPrimary { get; set; }
        public bool IsWhatsApp { get; set; }
        public bool IsTelegram { get; set; }
        public string? Notes { get; set; }
        public int? CreatedByUserId { get; set; }
    }

    public class PhoneNumberUpdateDto
    {
        public string? Phone { get; set; }
        public string? CountryCode { get; set; }
        public string? PhoneType { get; set; }
        public string? Label { get; set; }
        public bool? IsPrimary { get; set; }
        public bool? IsWhatsApp { get; set; }
        public bool? IsTelegram { get; set; }
        public string? Notes { get; set; }
    }
}
