using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Services;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UnitsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;

        public UnitsController(ApplicationDbContext context, IActivityLogService activityLog)
        {
            _context = context;
            _activityLog = activityLog;
        }

        // Helper method للحصول على AccountId من الهيدر
        private int GetAccountId()
        {
            if (Request.Headers.TryGetValue("X-Account-Id", out var accountIdHeader) && 
                int.TryParse(accountIdHeader, out var accountId))
            {
                return accountId;
            }
            return 1; // حساب افتراضي للتطوير
        }

        private int GetUserId()
        {
            if (Request.Headers.TryGetValue("X-User-Id", out var userIdHeader) && 
                int.TryParse(userIdHeader, out var userId))
            {
                return userId;
            }
            return 1;
        }

        /// <summary>
        /// الحصول على جميع الوحدات
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetUnits()
        {
            var accountId = GetAccountId();
            
            var units = await _context.Units
                .Where(u => u.IsActive && u.AccountId == accountId)
                .Include(u => u.BaseUnit)
                .OrderBy(u => u.Name)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.NameEn,
                    u.Symbol,
                    u.IsBase,
                    u.BaseUnitId,
                    BaseUnitName = u.BaseUnit != null ? u.BaseUnit.Name : null,
                    u.ConversionFactor,
                    u.IsActive,
                    u.CreatedAt
                })
                .ToListAsync();

            return Ok(units);
        }

        /// <summary>
        /// الحصول على وحدة بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetUnit(int id)
        {
            var unit = await _context.Units
                .Include(u => u.BaseUnit)
                .Where(u => u.Id == id)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.NameEn,
                    u.Symbol,
                    u.IsBase,
                    u.BaseUnitId,
                    BaseUnitName = u.BaseUnit != null ? u.BaseUnit.Name : null,
                    u.ConversionFactor,
                    u.IsActive,
                    u.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (unit == null)
            {
                return NotFound();
            }

            return Ok(unit);
        }

        // DTO لإنشاء وحدة
        public class CreateUnitDto
        {
            public string Name { get; set; } = string.Empty;
            public string? NameEn { get; set; }
            public string Symbol { get; set; } = string.Empty;
            public bool IsBase { get; set; } = true;
            public int? BaseUnitId { get; set; }
            public decimal ConversionFactor { get; set; } = 1;
        }

        /// <summary>
        /// إنشاء وحدة جديدة
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<object>> CreateUnit([FromBody] CreateUnitDto dto)
        {
            var accountId = GetAccountId();
            
            var unit = new Unit
            {
                AccountId = accountId,
                Name = dto.Name,
                NameEn = dto.NameEn,
                Symbol = dto.Symbol,
                IsBase = dto.IsBase,
                BaseUnitId = dto.BaseUnitId,
                ConversionFactor = dto.ConversionFactor,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Units.Add(unit);
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.CreateUnit, EntityTypes.Unit,
                unit.Id, unit.Name, $"تم إنشاء وحدة جديدة: {unit.Name} ({unit.Symbol})");

            return CreatedAtAction(nameof(GetUnit), new { id = unit.Id }, new
            {
                unit.Id,
                unit.Name,
                unit.NameEn,
                unit.Symbol,
                unit.IsBase,
                unit.BaseUnitId,
                unit.ConversionFactor,
                unit.IsActive,
                unit.CreatedAt
            });
        }

        // DTO لتحديث وحدة
        public class UpdateUnitDto
        {
            public int Id { get; set; }
            public string Name { get; set; } = string.Empty;
            public string? NameEn { get; set; }
            public string Symbol { get; set; } = string.Empty;
            public bool IsBase { get; set; } = true;
            public int? BaseUnitId { get; set; }
            public decimal ConversionFactor { get; set; } = 1;
            public bool IsActive { get; set; } = true;
        }

        /// <summary>
        /// تحديث وحدة
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUnit(int id, [FromBody] UpdateUnitDto dto)
        {
            if (id != dto.Id)
            {
                return BadRequest("معرف الوحدة غير متطابق");
            }

            var existingUnit = await _context.Units.FindAsync(id);
            if (existingUnit == null)
            {
                return NotFound("الوحدة غير موجودة");
            }

            // تحديث الحقول
            existingUnit.Name = dto.Name;
            existingUnit.NameEn = dto.NameEn;
            existingUnit.Symbol = dto.Symbol;
            existingUnit.IsBase = dto.IsBase;
            existingUnit.BaseUnitId = dto.BaseUnitId;
            existingUnit.ConversionFactor = dto.ConversionFactor;
            existingUnit.IsActive = dto.IsActive;

            try
            {
                await _context.SaveChangesAsync();
                
                // تسجيل النشاط
                await _activityLog.LogAsync(existingUnit.AccountId, GetUserId(), ActivityActions.UpdateUnit, EntityTypes.Unit,
                    existingUnit.Id, existingUnit.Name, $"تم تعديل الوحدة: {existingUnit.Name}");
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Units.Any(e => e.Id == id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        /// <summary>
        /// حذف وحدة (تعطيل)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUnit(int id)
        {
            var unit = await _context.Units.FindAsync(id);
            if (unit == null)
            {
                return NotFound();
            }

            unit.IsActive = false;
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(unit.AccountId, GetUserId(), ActivityActions.DeleteUnit, EntityTypes.Unit,
                unit.Id, unit.Name, $"تم حذف الوحدة: {unit.Name}");

            return NoContent();
        }
    }
}
