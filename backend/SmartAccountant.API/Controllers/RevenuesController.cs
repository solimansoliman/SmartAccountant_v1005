using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RevenuesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public RevenuesController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// الحصول على جميع الإيرادات
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Revenue>>> GetRevenues(
            [FromQuery] int? categoryId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var query = _context.Revenues
                .Include(r => r.Category)
                .AsQueryable();

            if (categoryId.HasValue)
                query = query.Where(r => r.CategoryId == categoryId.Value);

            if (fromDate.HasValue)
                query = query.Where(r => r.RevenueDate >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(r => r.RevenueDate <= toDate.Value);

            return await query.OrderByDescending(r => r.RevenueDate).ToListAsync();
        }

        /// <summary>
        /// الحصول على إيراد بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Revenue>> GetRevenue(int id)
        {
            var revenue = await _context.Revenues
                .Include(r => r.Category)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (revenue == null)
            {
                return NotFound();
            }

            return revenue;
        }

        /// <summary>
        /// إنشاء إيراد جديد
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Revenue>> CreateRevenue(Revenue revenue)
        {
            // توليد رقم الإيراد
            var lastRevenue = await _context.Revenues
                .OrderByDescending(r => r.Id)
                .FirstOrDefaultAsync();

            var nextNumber = (lastRevenue?.Id ?? 0) + 1;
            revenue.RevenueNumber = $"REV-{DateTime.UtcNow:yyyyMM}-{nextNumber:D6}";
            revenue.NetAmount = revenue.Amount + revenue.TaxAmount;
            revenue.CreatedAt = DateTime.UtcNow;

            _context.Revenues.Add(revenue);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRevenue), new { id = revenue.Id }, revenue);
        }

        /// <summary>
        /// تحديث إيراد
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRevenue(int id, Revenue revenue)
        {
            if (id != revenue.Id)
            {
                return BadRequest();
            }

            revenue.NetAmount = revenue.Amount + revenue.TaxAmount;
            revenue.UpdatedAt = DateTime.UtcNow;
            _context.Entry(revenue).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Revenues.Any(r => r.Id == id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        /// <summary>
        /// حذف إيراد
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRevenue(int id)
        {
            var revenue = await _context.Revenues.FindAsync(id);
            if (revenue == null)
            {
                return NotFound();
            }

            revenue.DeletedAt = DateTime.UtcNow;
            revenue.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// الحصول على تصنيفات الإيرادات
        /// </summary>
        [HttpGet("categories")]
        public async Task<ActionResult<IEnumerable<RevenueCategory>>> GetCategories()
        {
            return await _context.RevenueCategories
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        /// <summary>
        /// إنشاء تصنيف إيرادات
        /// </summary>
        [HttpPost("categories")]
        public async Task<ActionResult<RevenueCategory>> CreateCategory(RevenueCategory category)
        {
            _context.RevenueCategories.Add(category);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCategories), category);
        }

        /// <summary>
        /// ملخص الإيرادات
        /// </summary>
        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetRevenuesSummary(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var revenues = await _context.Revenues
                .Include(r => r.Category)
                .Where(r => r.RevenueDate >= fromDate
                    && r.RevenueDate <= toDate
                    && r.DeletedAt == null)
                .ToListAsync();

            var byCategory = revenues
                .GroupBy(r => r.Category?.Name ?? "غير مصنف")
                .Select(g => new
                {
                    Category = g.Key,
                    Count = g.Count(),
                    Total = g.Sum(r => r.NetAmount)
                })
                .OrderByDescending(c => c.Total)
                .ToList();

            return new
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalRevenues = revenues.Sum(r => r.NetAmount),
                TotalTax = revenues.Sum(r => r.TaxAmount),
                Count = revenues.Count,
                ByCategory = byCategory
            };
        }
    }
}
