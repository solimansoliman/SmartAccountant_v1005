using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Services;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExpensesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;

        public ExpensesController(ApplicationDbContext context, IActivityLogService activityLog)
        {
            _context = context;
            _activityLog = activityLog;
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
        /// الحصول على جميع المصروفات
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetExpenses(
            [FromQuery] int? categoryId,
            [FromQuery] int? transactionTypeId,
            [FromQuery] string? transactionTypeCode,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string? status)
        {
            var accountId = GetAccountId();
            var query = _context.Expenses.Where(e => e.AccountId == accountId).AsQueryable();

            if (categoryId.HasValue)
                query = query.Where(e => e.CategoryId == categoryId.Value);

            if (transactionTypeId.HasValue)
                query = query.Where(e => e.TransactionTypeId == transactionTypeId.Value);

            if (!string.IsNullOrEmpty(transactionTypeCode))
            {
                var typeId = await _context.TransactionTypes
                    .Where(t => t.Code == transactionTypeCode)
                    .Select(t => t.Id)
                    .FirstOrDefaultAsync();
                if (typeId > 0)
                    query = query.Where(e => e.TransactionTypeId == typeId);
            }

            if (fromDate.HasValue)
                query = query.Where(e => e.ExpenseDate >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(e => e.ExpenseDate <= toDate.Value);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(e => e.Status == status);

            var expenses = await query
                .Include(e => e.TransactionType)
                .OrderByDescending(e => e.ExpenseDate)
                .ToListAsync();
            
            // Get category names separately
            var categoryIds = expenses.Select(e => e.CategoryId).Distinct().ToList();
            var categories = await _context.ExpenseCategories
                .Where(c => categoryIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Name);
            
            return expenses.Select(e => new {
                e.Id,
                e.AccountId,
                e.ExpenseNumber,
                e.ExpenseDate,
                e.CategoryId,
                CategoryName = e.CategoryId.HasValue && categories.ContainsKey(e.CategoryId.Value) ? categories[e.CategoryId.Value] : null,
                e.TransactionTypeId,
                TransactionTypeCode = e.TransactionType?.Code,
                TransactionTypeName = e.TransactionType?.Name,
                TransactionTypeColor = e.TransactionType?.Color,
                e.Amount,
                e.TaxAmount,
                e.NetAmount,
                TotalAmount = e.NetAmount,
                e.PaymentMethod,
                e.ReferenceNumber,
                e.Description,
                Notes = e.Description, // للتوافق مع الـ Frontend
                e.AttachmentUrl,
                e.Status,
                e.CreatedAt,
                e.UpdatedAt
            }).ToList<object>();
        }

        /// <summary>
        /// الحصول على مصروف بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetExpense(int id)
        {
            var accountId = GetAccountId();
            var expense = await _context.Expenses
                .Include(e => e.Category)
                .FirstOrDefaultAsync(e => e.Id == id && e.AccountId == accountId);

            if (expense == null)
            {
                return NotFound();
            }

            return new {
                expense.Id,
                expense.AccountId,
                expense.ExpenseNumber,
                expense.ExpenseDate,
                expense.CategoryId,
                CategoryName = expense.Category?.Name,
                expense.Amount,
                expense.TaxAmount,
                expense.NetAmount,
                expense.PaymentMethod,
                expense.ReferenceNumber,
                expense.Description,
                expense.AttachmentUrl,
                expense.Status,
                expense.CreatedAt,
                expense.UpdatedAt
            };
        }

        // DTO لإنشاء مصروف
        public class CreateExpenseDto
        {
            public int AccountId { get; set; } = 1;
            public DateTime ExpenseDate { get; set; }
            public int? CategoryId { get; set; }
            public int? TransactionTypeId { get; set; }
            public string? TransactionTypeCode { get; set; }
            public decimal Amount { get; set; }
            public decimal TaxAmount { get; set; }
            public string? PaymentMethod { get; set; }
            public string? ReferenceNumber { get; set; }
            public string? Description { get; set; }
            public string? Notes { get; set; }
            public string? AttachmentUrl { get; set; }
            public string Status { get; set; } = "Pending";
        }

        /// <summary>
        /// إنشاء مصروف جديد
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<object>> CreateExpense([FromBody] CreateExpenseDto dto)
        {
            var accountId = GetAccountId();
            
            // التحقق من صحة CategoryId إذا تم تحديده
            if (dto.CategoryId.HasValue && dto.CategoryId.Value > 0)
            {
                var categoryExists = await _context.ExpenseCategories.AnyAsync(c => c.Id == dto.CategoryId.Value);
                if (!categoryExists)
                {
                    dto.CategoryId = null; // تجاهل الفئة غير الموجودة
                }
            }
            else
            {
                dto.CategoryId = null;
            }

            // تحديد TransactionTypeId
            int? transactionTypeId = dto.TransactionTypeId;
            if (!transactionTypeId.HasValue && !string.IsNullOrEmpty(dto.TransactionTypeCode))
            {
                transactionTypeId = await _context.TransactionTypes
                    .Where(t => t.AccountId == accountId && t.Code == dto.TransactionTypeCode)
                    .Select(t => t.Id)
                    .FirstOrDefaultAsync();
            }

            // إذا لم يتم تحديد النوع، استخدم النوع الافتراضي (مصروفات)
            if (!transactionTypeId.HasValue || transactionTypeId == 0)
            {
                transactionTypeId = await _context.TransactionTypes
                    .Where(t => t.AccountId == accountId && t.Code == TransactionTypeCodes.Expense)
                    .Select(t => t.Id)
                    .FirstOrDefaultAsync();
            }

            // توليد رقم المصروف
            var lastExpense = await _context.Expenses
                .Where(e => e.AccountId == accountId)
                .OrderByDescending(e => e.Id)
                .FirstOrDefaultAsync();

            var nextNumber = (lastExpense?.Id ?? 0) + 1;
            
            var expense = new Expense
            {
                AccountId = accountId,
                ExpenseNumber = $"EXP-{DateTime.UtcNow:yyyyMM}-{nextNumber:D6}",
                ExpenseDate = dto.ExpenseDate,
                CategoryId = dto.CategoryId,
                TransactionTypeId = transactionTypeId,
                Amount = dto.Amount,
                TaxAmount = dto.TaxAmount,
                NetAmount = dto.Amount + dto.TaxAmount,
                PaymentMethod = dto.PaymentMethod,
                ReferenceNumber = dto.ReferenceNumber,
                Description = dto.Description ?? dto.Notes,
                AttachmentUrl = dto.AttachmentUrl,
                Status = dto.Status ?? "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.CreateExpense, EntityTypes.Expense,
                expense.Id, expense.ExpenseNumber, $"تم إنشاء مصروف جديد: {expense.ExpenseNumber} - المبلغ: {expense.NetAmount:N2}");

            // جلب معلومات النوع للرد
            var transactionType = transactionTypeId.HasValue 
                ? await _context.TransactionTypes.FindAsync(transactionTypeId.Value)
                : null;

            return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, new {
                expense.Id,
                expense.ExpenseNumber,
                expense.ExpenseDate,
                expense.TransactionTypeId,
                TransactionTypeCode = transactionType?.Code,
                TransactionTypeName = transactionType?.Name,
                expense.Amount,
                expense.NetAmount,
                TotalAmount = expense.NetAmount,
                expense.Status
            });
        }

        // DTO لتحديث مصروف
        public class UpdateExpenseDto
        {
            public int Id { get; set; }
            public DateTime ExpenseDate { get; set; }
            public int CategoryId { get; set; }
            public decimal Amount { get; set; }
            public decimal TaxAmount { get; set; }
            public string? PaymentMethod { get; set; }
            public string? ReferenceNumber { get; set; }
            public string? Description { get; set; }
            public string? AttachmentUrl { get; set; }
            public string Status { get; set; } = "Pending";
        }

        /// <summary>
        /// تحديث مصروف
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateExpense(int id, [FromBody] UpdateExpenseDto dto)
        {
            if (id != dto.Id)
            {
                return BadRequest("معرف المصروف غير متطابق");
            }

            var accountId = GetAccountId();
            var expense = await _context.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.AccountId == accountId);
            if (expense == null)
            {
                return NotFound();
            }

            expense.ExpenseDate = dto.ExpenseDate;
            expense.CategoryId = dto.CategoryId;
            expense.Amount = dto.Amount;
            expense.TaxAmount = dto.TaxAmount;
            expense.NetAmount = dto.Amount + dto.TaxAmount;
            expense.PaymentMethod = dto.PaymentMethod;
            expense.ReferenceNumber = dto.ReferenceNumber;
            expense.Description = dto.Description;
            expense.AttachmentUrl = dto.AttachmentUrl;
            expense.Status = dto.Status;
            expense.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.UpdateExpense, EntityTypes.Expense,
                expense.Id, expense.ExpenseNumber, $"تم تعديل المصروف: {expense.ExpenseNumber}");

            return NoContent();
        }

        /// <summary>
        /// اعتماد مصروف
        /// </summary>
        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveExpense(int id)
        {
            var accountId = GetAccountId();
            var expense = await _context.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.AccountId == accountId);
            if (expense == null)
            {
                return NotFound();
            }

            expense.Status = "Approved";
            expense.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), "اعتماد مصروف", EntityTypes.Expense,
                expense.Id, expense.ExpenseNumber, $"تم اعتماد المصروف: {expense.ExpenseNumber}");

            return NoContent();
        }

        /// <summary>
        /// حذف مصروف
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExpense(int id)
        {
            var accountId = GetAccountId();
            var expense = await _context.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.AccountId == accountId);
            if (expense == null)
            {
                return NotFound();
            }

            if (expense.Status == "Paid")
            {
                return BadRequest("لا يمكن حذف مصروف مدفوع");
            }

            expense.Status = "Cancelled";
            expense.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.DeleteExpense, EntityTypes.Expense,
                expense.Id, expense.ExpenseNumber, $"تم إلغاء المصروف: {expense.ExpenseNumber}");

            return NoContent();
        }

        /// <summary>
        /// الحصول على تصنيفات المصروفات
        /// </summary>
        [HttpGet("categories")]
        public async Task<ActionResult<IEnumerable<object>>> GetCategories()
        {
            var categories = await _context.ExpenseCategories
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .ToListAsync();
                
            return categories.Select(c => new {
                c.Id,
                c.Name,
                c.NameEn,
                c.Code,
                c.IsActive
            }).ToList<object>();
        }

        /// <summary>
        /// إنشاء تصنيف مصروفات
        /// </summary>
        [HttpPost("categories")]
        public async Task<ActionResult<object>> CreateCategory([FromBody] ExpenseCategory category)
        {
            category.AccountId = 1; // Default account
            _context.ExpenseCategories.Add(category);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCategories), new {
                category.Id,
                category.Name,
                category.NameEn,
                category.Code,
                category.IsActive
            });
        }

        /// <summary>
        /// ملخص المصروفات
        /// </summary>
        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetExpensesSummary(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var expenses = await _context.Expenses
                .Include(e => e.Category)
                .Where(e => e.ExpenseDate >= fromDate
                    && e.ExpenseDate <= toDate
                    && e.Status != "Cancelled")
                .ToListAsync();

            var byCategory = expenses
                .GroupBy(e => e.Category?.Name ?? "غير مصنف")
                .Select(g => new
                {
                    Category = g.Key,
                    Count = g.Count(),
                    Total = g.Sum(e => e.NetAmount)
                })
                .OrderByDescending(c => c.Total)
                .ToList();

            var byMonth = expenses
                .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Total = g.Sum(e => e.NetAmount)
                })
                .OrderBy(m => m.Year).ThenBy(m => m.Month)
                .ToList();

            return new
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalExpenses = expenses.Sum(e => e.NetAmount),
                TotalTax = expenses.Sum(e => e.TaxAmount),
                Count = expenses.Count,
                ByCategory = byCategory,
                ByMonth = byMonth
            };
        }
    }
}
