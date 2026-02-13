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
            try
            {
                var accountId = GetAccountId();
                await DefaultUnitsSeeder.EnsureForAccountAsync(_context, accountId, GetUserId());
                
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
            catch
            {
                return Ok(new List<object>());
            }
        }

        /// <summary>
        /// الحصول على وحدة بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetUnit(int id)
        {
            var accountId = GetAccountId();
            var unit = await _context.Units
                .Include(u => u.BaseUnit)
                .Where(u => u.Id == id && u.AccountId == accountId)
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
            var userId = GetUserId();

            var name = dto.Name?.Trim() ?? string.Empty;
            var symbol = dto.Symbol?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(name))
                return BadRequest("اسم الوحدة مطلوب");

            if (string.IsNullOrWhiteSpace(symbol))
                return BadRequest("رمز الوحدة مطلوب");

            var hasDuplicate = await _context.Units
                .AnyAsync(u => u.AccountId == accountId && u.IsActive &&
                    u.Name != null && u.Name.ToLower() == name.ToLower());

            if (hasDuplicate)
                return Conflict("يوجد بالفعل وحدة بنفس الاسم ضمن نفس الحساب");

            int? baseUnitId = dto.IsBase ? null : dto.BaseUnitId;
            if (!dto.IsBase)
            {
                if (!baseUnitId.HasValue)
                    return BadRequest("الوحدة الفرعية تتطلب تحديد وحدة أساس");

                var baseUnitExists = await _context.Units.AnyAsync(u =>
                    u.Id == baseUnitId.Value &&
                    u.AccountId == accountId &&
                    u.IsActive);

                if (!baseUnitExists)
                    return BadRequest("وحدة الأساس غير موجودة ضمن نفس الحساب");
            }
            
            var unit = new Unit
            {
                AccountId = accountId,
                Name = name,
                NameEn = dto.NameEn,
                Symbol = symbol,
                IsBase = dto.IsBase,
                BaseUnitId = baseUnitId,
                ConversionFactor = dto.IsBase ? 1 : (dto.ConversionFactor <= 0 ? 1 : dto.ConversionFactor),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = userId
            };

            _context.Units.Add(unit);
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, userId, ActivityActions.CreateUnit, EntityTypes.Unit,
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
            var accountId = GetAccountId();

            if (id != dto.Id)
            {
                return BadRequest("معرف الوحدة غير متطابق");
            }

            var existingUnit = await _context.Units
                .FirstOrDefaultAsync(u => u.Id == id && u.AccountId == accountId);
            if (existingUnit == null)
            {
                return NotFound("الوحدة غير موجودة");
            }

            var name = dto.Name?.Trim() ?? string.Empty;
            var symbol = dto.Symbol?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(name))
                return BadRequest("اسم الوحدة مطلوب");

            if (string.IsNullOrWhiteSpace(symbol))
                return BadRequest("رمز الوحدة مطلوب");

            var duplicateName = await _context.Units
                .AnyAsync(u => u.AccountId == accountId && u.Id != id && u.IsActive &&
                    u.Name != null && u.Name.ToLower() == name.ToLower());

            if (duplicateName)
                return Conflict("يوجد بالفعل وحدة بنفس الاسم ضمن نفس الحساب");

            int? baseUnitId = dto.IsBase ? null : dto.BaseUnitId;
            if (!dto.IsBase)
            {
                if (!baseUnitId.HasValue)
                    return BadRequest("الوحدة الفرعية تتطلب تحديد وحدة أساس");

                if (baseUnitId.Value == id)
                    return BadRequest("لا يمكن أن تكون الوحدة الأساسية هي نفس الوحدة");

                var baseUnitExists = await _context.Units.AnyAsync(u =>
                    u.Id == baseUnitId.Value &&
                    u.AccountId == accountId &&
                    u.IsActive);

                if (!baseUnitExists)
                    return BadRequest("وحدة الأساس غير موجودة ضمن نفس الحساب");
            }

            // تحديث الحقول
            existingUnit.Name = name;
            existingUnit.NameEn = dto.NameEn;
            existingUnit.Symbol = symbol;
            existingUnit.IsBase = dto.IsBase;
            existingUnit.BaseUnitId = baseUnitId;
            existingUnit.ConversionFactor = dto.IsBase ? 1 : (dto.ConversionFactor <= 0 ? 1 : dto.ConversionFactor);
            existingUnit.IsActive = dto.IsActive;
            existingUnit.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
                
                // تسجيل النشاط
                await _activityLog.LogAsync(existingUnit.AccountId, GetUserId(), ActivityActions.UpdateUnit, EntityTypes.Unit,
                    existingUnit.Id, existingUnit.Name, $"تم تعديل الوحدة: {existingUnit.Name}");
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Units.Any(e => e.Id == id && e.AccountId == accountId))
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
            var accountId = GetAccountId();
            var unit = await _context.Units.FirstOrDefaultAsync(u => u.Id == id && u.AccountId == accountId);
            if (unit == null)
            {
                return NotFound();
            }

            var isUsedByProducts = await _context.Products
                .AnyAsync(p => p.AccountId == accountId && p.UnitId == id && p.IsActive);
            var isUsedByProductUnits = await _context.ProductUnits
                .AnyAsync(pu => pu.UnitId == id && pu.Product != null && pu.Product.AccountId == accountId);
            var isUsedByInvoiceItems = await _context.InvoiceItems
                .AnyAsync(ii => ii.UnitId == id && ii.Invoice != null && ii.Invoice.AccountId == accountId);
            var hasDerivedUnits = await _context.Units
                .AnyAsync(u => u.AccountId == accountId && u.BaseUnitId == id && u.IsActive);

            if (isUsedByProducts || isUsedByProductUnits || isUsedByInvoiceItems || hasDerivedUnits)
            {
                return BadRequest("لا يمكن حذف الوحدة لأنها مستخدمة في بيانات أخرى");
            }

            unit.IsActive = false;
            unit.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(unit.AccountId, GetUserId(), ActivityActions.DeleteUnit, EntityTypes.Unit,
                unit.Id, unit.Name, $"تم حذف الوحدة: {unit.Name}");

            return NoContent();
        }
    }
}
