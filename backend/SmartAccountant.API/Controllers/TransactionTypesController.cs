using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TransactionTypesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<TransactionTypesController> _logger;

        public TransactionTypesController(ApplicationDbContext context, ILogger<TransactionTypesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// الحصول على جميع أنواع المعاملات للحساب
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TransactionTypeDto>>> GetTransactionTypes([FromQuery] int accountId = 1)
        {
            var types = await _context.TransactionTypes
                .Where(t => t.AccountId == accountId && t.IsActive)
                .OrderBy(t => t.DisplayOrder)
                .Select(t => new TransactionTypeDto
                {
                    Id = t.Id,
                    AccountId = t.AccountId,
                    Name = t.Name,
                    NameEn = t.NameEn,
                    Code = t.Code,
                    Description = t.Description,
                    Color = t.Color,
                    Icon = t.Icon,
                    IsSystem = t.IsSystem,
                    DisplayOrder = t.DisplayOrder,
                    IsActive = t.IsActive,
                    ExpenseCount = t.Expenses.Count
                })
                .ToListAsync();

            return Ok(types);
        }

        /// <summary>
        /// الحصول على نوع معاملة محدد
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<TransactionTypeDto>> GetTransactionType(int id)
        {
            var type = await _context.TransactionTypes
                .Where(t => t.Id == id)
                .Select(t => new TransactionTypeDto
                {
                    Id = t.Id,
                    AccountId = t.AccountId,
                    Name = t.Name,
                    NameEn = t.NameEn,
                    Code = t.Code,
                    Description = t.Description,
                    Color = t.Color,
                    Icon = t.Icon,
                    IsSystem = t.IsSystem,
                    DisplayOrder = t.DisplayOrder,
                    IsActive = t.IsActive,
                    ExpenseCount = t.Expenses.Count
                })
                .FirstOrDefaultAsync();

            if (type == null)
            {
                return NotFound(new { message = "نوع المعاملة غير موجود" });
            }

            return Ok(type);
        }

        /// <summary>
        /// إنشاء نوع معاملة جديد
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<TransactionTypeDto>> CreateTransactionType([FromBody] CreateTransactionTypeDto dto)
        {
            // التحقق من عدم تكرار الكود
            var exists = await _context.TransactionTypes
                .AnyAsync(t => t.AccountId == dto.AccountId && t.Code == dto.Code);

            if (exists)
            {
                return BadRequest(new { message = "كود النوع مستخدم مسبقاً" });
            }

            var type = new TransactionType
            {
                AccountId = dto.AccountId,
                Name = dto.Name,
                NameEn = dto.NameEn,
                Code = dto.Code,
                Description = dto.Description,
                Color = dto.Color ?? "#6b7280",
                Icon = dto.Icon ?? "Circle",
                IsSystem = false,
                DisplayOrder = dto.DisplayOrder,
                IsActive = true,
                CreatedByUserId = dto.CreatedByUserId,
                CreatedAt = DateTime.UtcNow
            };

            _context.TransactionTypes.Add(type);
            await _context.SaveChangesAsync();

            _logger.LogInformation("تم إنشاء نوع معاملة جديد: {Name} ({Code})", type.Name, type.Code);

            return CreatedAtAction(nameof(GetTransactionType), new { id = type.Id }, new TransactionTypeDto
            {
                Id = type.Id,
                AccountId = type.AccountId,
                Name = type.Name,
                NameEn = type.NameEn,
                Code = type.Code,
                Description = type.Description,
                Color = type.Color,
                Icon = type.Icon,
                IsSystem = type.IsSystem,
                DisplayOrder = type.DisplayOrder,
                IsActive = type.IsActive,
                ExpenseCount = 0
            });
        }

        /// <summary>
        /// تعديل نوع معاملة
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTransactionType(int id, [FromBody] UpdateTransactionTypeDto dto)
        {
            var type = await _context.TransactionTypes.FindAsync(id);

            if (type == null)
            {
                return NotFound(new { message = "نوع المعاملة غير موجود" });
            }

            // لا يمكن تعديل كود الأنواع الأساسية
            if (type.IsSystem && dto.Code != type.Code)
            {
                return BadRequest(new { message = "لا يمكن تغيير كود نوع المعاملة الأساسي" });
            }

            type.Name = dto.Name ?? type.Name;
            type.NameEn = dto.NameEn ?? type.NameEn;
            type.Code = dto.Code ?? type.Code;
            type.Description = dto.Description ?? type.Description;
            type.Color = dto.Color ?? type.Color;
            type.Icon = dto.Icon ?? type.Icon;
            type.DisplayOrder = dto.DisplayOrder ?? type.DisplayOrder;
            type.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("تم تعديل نوع معاملة: {Name} ({Id})", type.Name, type.Id);

            return NoContent();
        }

        /// <summary>
        /// حذف نوع معاملة (Soft Delete)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransactionType(int id)
        {
            var type = await _context.TransactionTypes
                .Include(t => t.Expenses)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (type == null)
            {
                return NotFound(new { message = "نوع المعاملة غير موجود" });
            }

            // لا يمكن حذف الأنواع الأساسية
            if (type.IsSystem)
            {
                return BadRequest(new { message = "لا يمكن حذف نوع المعاملة الأساسي" });
            }

            // لا يمكن الحذف إذا كان هناك معاملات مرتبطة
            if (type.Expenses.Any())
            {
                return BadRequest(new { message = $"لا يمكن الحذف. يوجد {type.Expenses.Count} معاملة مرتبطة بهذا النوع" });
            }

            type.IsActive = false;
            type.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("تم حذف نوع معاملة: {Name} ({Id})", type.Name, type.Id);

            return NoContent();
        }

        /// <summary>
        /// إنشاء الأنواع الافتراضية لحساب جديد
        /// </summary>
        [HttpPost("seed/{accountId}")]
        public async Task<ActionResult<IEnumerable<TransactionTypeDto>>> SeedTransactionTypes(int accountId, [FromQuery] int? userId = null)
        {
            // التحقق من عدم وجود أنواع للحساب
            var exists = await _context.TransactionTypes.AnyAsync(t => t.AccountId == accountId);
            if (exists)
            {
                return BadRequest(new { message = "الأنواع الافتراضية موجودة مسبقاً لهذا الحساب" });
            }

            var defaultTypes = new List<TransactionType>
            {
                new TransactionType
                {
                    AccountId = accountId,
                    Name = "مصروفات",
                    NameEn = "Expenses",
                    Code = TransactionTypeCodes.Expense,
                    Description = "المصروفات العامة",
                    Color = "#dc2626",
                    Icon = "TrendingDown",
                    IsSystem = true,
                    DisplayOrder = 1,
                    IsActive = true,
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                },
                new TransactionType
                {
                    AccountId = accountId,
                    Name = "مشتريات",
                    NameEn = "Purchases",
                    Code = TransactionTypeCodes.Purchase,
                    Description = "مشتريات البضاعة والمواد",
                    Color = "#2563eb",
                    Icon = "ShoppingCart",
                    IsSystem = true,
                    DisplayOrder = 2,
                    IsActive = true,
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                },
                new TransactionType
                {
                    AccountId = accountId,
                    Name = "إيرادات أخرى",
                    NameEn = "Other Income",
                    Code = TransactionTypeCodes.OtherIncome,
                    Description = "إيرادات غير البيع",
                    Color = "#059669",
                    Icon = "TrendingUp",
                    IsSystem = true,
                    DisplayOrder = 3,
                    IsActive = true,
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                }
            };

            _context.TransactionTypes.AddRange(defaultTypes);
            await _context.SaveChangesAsync();

            return Ok(defaultTypes.Select(t => new TransactionTypeDto
            {
                Id = t.Id,
                AccountId = t.AccountId,
                Name = t.Name,
                NameEn = t.NameEn,
                Code = t.Code,
                Description = t.Description,
                Color = t.Color,
                Icon = t.Icon,
                IsSystem = t.IsSystem,
                DisplayOrder = t.DisplayOrder,
                IsActive = t.IsActive,
                ExpenseCount = 0
            }));
        }

        /// <summary>
        /// إعادة تعيين أنواع المعاملات بالبيانات الصحيحة
        /// </summary>
        [HttpPost("reset/{accountId}")]
        public async Task<ActionResult<IEnumerable<TransactionTypeDto>>> ResetTransactionTypes(int accountId, [FromQuery] int? userId = null)
        {
            // حذف الأنواع الحالية (تحديث المصروفات أولاً)
            var existingTypes = await _context.TransactionTypes
                .Where(t => t.AccountId == accountId)
                .ToListAsync();

            if (existingTypes.Any())
            {
                // تحديث المصروفات لإزالة الارتباط
                var expenses = await _context.Expenses
                    .Where(e => e.AccountId == accountId && e.TransactionTypeId != null)
                    .ToListAsync();
                
                foreach (var expense in expenses)
                {
                    expense.TransactionTypeId = null;
                }
                await _context.SaveChangesAsync();

                // حذف الأنواع القديمة
                _context.TransactionTypes.RemoveRange(existingTypes);
                await _context.SaveChangesAsync();
            }

            // إضافة الأنواع الجديدة بالأسماء الصحيحة
            var newTypes = new List<TransactionType>
            {
                new TransactionType
                {
                    AccountId = accountId,
                    Name = "مصروفات عامة",
                    NameEn = "General Expenses",
                    Code = TransactionTypeCodes.Expense,
                    Description = "المصروفات العامة مثل الكهرباء والإيجار والرواتب",
                    Color = "#dc2626",
                    Icon = "TrendingDown",
                    IsSystem = true,
                    DisplayOrder = 1,
                    IsActive = true,
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                },
                new TransactionType
                {
                    AccountId = accountId,
                    Name = "مشتريات",
                    NameEn = "Purchases",
                    Code = TransactionTypeCodes.Purchase,
                    Description = "مشتريات البضاعة والمواد الخام",
                    Color = "#2563eb",
                    Icon = "ShoppingCart",
                    IsSystem = true,
                    DisplayOrder = 2,
                    IsActive = true,
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                },
                new TransactionType
                {
                    AccountId = accountId,
                    Name = "إيرادات أخرى",
                    NameEn = "Other Income",
                    Code = TransactionTypeCodes.OtherIncome,
                    Description = "إيرادات غير البيع مثل بيع الكراتين",
                    Color = "#059669",
                    Icon = "TrendingUp",
                    IsSystem = true,
                    DisplayOrder = 3,
                    IsActive = true,
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                }
            };

            _context.TransactionTypes.AddRange(newTypes);
            await _context.SaveChangesAsync();

            // تحديث المصروفات بالأنواع الجديدة بناءً على Notes
            var expensesToUpdate = await _context.Expenses
                .Where(e => e.AccountId == accountId)
                .ToListAsync();

            var expenseType = newTypes.First(t => t.Code == TransactionTypeCodes.Expense);
            var purchaseType = newTypes.First(t => t.Code == TransactionTypeCodes.Purchase);
            var otherIncomeType = newTypes.First(t => t.Code == TransactionTypeCodes.OtherIncome);

            foreach (var expense in expensesToUpdate)
            {
                if (expense.Notes?.Contains("إيرادات") == true || expense.ExpenseNumber?.StartsWith("INC") == true)
                {
                    expense.TransactionTypeId = otherIncomeType.Id;
                }
                else if (expense.Notes?.Contains("مشتريات") == true || expense.ExpenseNumber?.StartsWith("PUR") == true)
                {
                    expense.TransactionTypeId = purchaseType.Id;
                }
                else
                {
                    expense.TransactionTypeId = expenseType.Id;
                }
            }
            await _context.SaveChangesAsync();

            _logger.LogInformation("تم إعادة تعيين أنواع المعاملات للحساب: {AccountId}", accountId);

            return Ok(newTypes.Select(t => new TransactionTypeDto
            {
                Id = t.Id,
                AccountId = t.AccountId,
                Name = t.Name,
                NameEn = t.NameEn,
                Code = t.Code,
                Description = t.Description,
                Color = t.Color,
                Icon = t.Icon,
                IsSystem = t.IsSystem,
                DisplayOrder = t.DisplayOrder,
                IsActive = t.IsActive,
                ExpenseCount = 0
            }));
        }
    }

    // DTOs
    public class TransactionTypeDto
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Color { get; set; }
        public string? Icon { get; set; }
        public bool IsSystem { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public int ExpenseCount { get; set; }
    }

    public class CreateTransactionTypeDto
    {
        public int AccountId { get; set; } = 1;
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Color { get; set; }
        public string? Icon { get; set; }
        public int DisplayOrder { get; set; } = 0;
        public int? CreatedByUserId { get; set; }
    }

    public class UpdateTransactionTypeDto
    {
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Code { get; set; }
        public string? Description { get; set; }
        public string? Color { get; set; }
        public string? Icon { get; set; }
        public int? DisplayOrder { get; set; }
    }
}
