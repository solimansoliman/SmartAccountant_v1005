using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    /// <summary>
    /// إدارة خطط الاشتراك
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class PlansController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PlansController> _logger;

        public PlansController(ApplicationDbContext context, ILogger<PlansController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// الحصول على جميع الخطط النشطة
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PlanDto>>> GetPlans([FromQuery] bool includeInactive = false)
        {
            try
            {
                var query = _context.Plans.AsQueryable();
                
                if (!includeInactive)
                {
                    query = query.Where(p => p.IsActive);
                }
                
                var plans = await query
                    .OrderBy(p => p.SortOrder)
                    .Select(p => MapToDto(p))
                    .ToListAsync();

                return Ok(plans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting plans");
                return StatusCode(500, new { message = "حدث خطأ أثناء جلب الخطط" });
            }
        }

        /// <summary>
        /// الحصول على خطة بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<PlanDto>> GetPlan(int id)
        {
            try
            {
                var plan = await _context.Plans.FindAsync(id);
                if (plan == null)
                {
                    return NotFound(new { message = "الخطة غير موجودة" });
                }

                return Ok(MapToDto(plan));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting plan {PlanId}", id);
                return StatusCode(500, new { message = "حدث خطأ أثناء جلب الخطة" });
            }
        }

        /// <summary>
        /// إنشاء خطة جديدة (للمدراء فقط)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<PlanDto>> CreatePlan([FromBody] CreatePlanDto dto)
        {
            try
            {
                var plan = new Plan
                {
                    Name = dto.Name,
                    NameEn = dto.NameEn,
                    Description = dto.Description,
                    Price = dto.Price,
                    YearlyPrice = dto.YearlyPrice,
                    Currency = dto.Currency ?? "ج.م",
                    Color = dto.Color ?? "blue",
                    Icon = dto.Icon ?? "Zap",
                    IsPopular = dto.IsPopular,
                    SortOrder = dto.SortOrder,
                    IsActive = dto.IsActive,
                    MaxUsers = dto.MaxUsers,
                    MaxInvoices = dto.MaxInvoices,
                    MaxCustomers = dto.MaxCustomers,
                    MaxProducts = dto.MaxProducts,
                    HasBasicReports = dto.HasBasicReports,
                    HasAdvancedReports = dto.HasAdvancedReports,
                    HasEmailSupport = dto.HasEmailSupport,
                    HasPrioritySupport = dto.HasPrioritySupport,
                    HasDedicatedManager = dto.HasDedicatedManager,
                    HasBackup = dto.HasBackup,
                    BackupFrequency = dto.BackupFrequency,
                    HasCustomInvoices = dto.HasCustomInvoices,
                    HasMultiCurrency = dto.HasMultiCurrency,
                    HasApiAccess = dto.HasApiAccess,
                    HasWhiteLabel = dto.HasWhiteLabel,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Plans.Add(plan);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created new plan: {PlanName}", plan.Name);

                return CreatedAtAction(nameof(GetPlan), new { id = plan.Id }, MapToDto(plan));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating plan");
                return StatusCode(500, new { message = "حدث خطأ أثناء إنشاء الخطة" });
            }
        }

        /// <summary>
        /// تحديث خطة
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult> UpdatePlan(int id, [FromBody] UpdatePlanDto dto)
        {
            try
            {
                var plan = await _context.Plans.FindAsync(id);
                if (plan == null)
                {
                    return NotFound(new { message = "الخطة غير موجودة" });
                }

                // Update only provided fields
                if (dto.Name != null) plan.Name = dto.Name;
                if (dto.NameEn != null) plan.NameEn = dto.NameEn;
                if (dto.Description != null) plan.Description = dto.Description;
                if (dto.Price.HasValue) plan.Price = dto.Price.Value;
                if (dto.YearlyPrice.HasValue) plan.YearlyPrice = dto.YearlyPrice.Value;
                if (dto.Currency != null) plan.Currency = dto.Currency;
                if (dto.Color != null) plan.Color = dto.Color;
                if (dto.Icon != null) plan.Icon = dto.Icon;
                if (dto.IsPopular.HasValue) plan.IsPopular = dto.IsPopular.Value;
                if (dto.SortOrder.HasValue) plan.SortOrder = dto.SortOrder.Value;
                if (dto.IsActive.HasValue) plan.IsActive = dto.IsActive.Value;
                if (dto.MaxUsers.HasValue) plan.MaxUsers = dto.MaxUsers.Value;
                if (dto.MaxInvoices.HasValue) plan.MaxInvoices = dto.MaxInvoices.Value;
                if (dto.MaxCustomers.HasValue) plan.MaxCustomers = dto.MaxCustomers.Value;
                if (dto.MaxProducts.HasValue) plan.MaxProducts = dto.MaxProducts.Value;
                if (dto.HasBasicReports.HasValue) plan.HasBasicReports = dto.HasBasicReports.Value;
                if (dto.HasAdvancedReports.HasValue) plan.HasAdvancedReports = dto.HasAdvancedReports.Value;
                if (dto.HasEmailSupport.HasValue) plan.HasEmailSupport = dto.HasEmailSupport.Value;
                if (dto.HasPrioritySupport.HasValue) plan.HasPrioritySupport = dto.HasPrioritySupport.Value;
                if (dto.HasDedicatedManager.HasValue) plan.HasDedicatedManager = dto.HasDedicatedManager.Value;
                if (dto.HasBackup.HasValue) plan.HasBackup = dto.HasBackup.Value;
                if (dto.BackupFrequency != null) plan.BackupFrequency = dto.BackupFrequency;
                if (dto.HasCustomInvoices.HasValue) plan.HasCustomInvoices = dto.HasCustomInvoices.Value;
                if (dto.HasMultiCurrency.HasValue) plan.HasMultiCurrency = dto.HasMultiCurrency.Value;
                if (dto.HasApiAccess.HasValue) plan.HasApiAccess = dto.HasApiAccess.Value;
                if (dto.HasWhiteLabel.HasValue) plan.HasWhiteLabel = dto.HasWhiteLabel.Value;

                plan.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Updated plan: {PlanId}", id);

                return Ok(MapToDto(plan));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating plan {PlanId}", id);
                return StatusCode(500, new { message = "حدث خطأ أثناء تحديث الخطة" });
            }
        }

        /// <summary>
        /// حذف خطة
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeletePlan(int id)
        {
            try
            {
                var plan = await _context.Plans.FindAsync(id);
                if (plan == null)
                {
                    return NotFound(new { message = "الخطة غير موجودة" });
                }

                // Check if any accounts are using this plan
                var accountsCount = await _context.Accounts.CountAsync(a => a.PlanId == id);
                if (accountsCount > 0)
                {
                    return BadRequest(new { message = $"لا يمكن حذف الخطة لأنها مستخدمة من قبل {accountsCount} حساب" });
                }

                _context.Plans.Remove(plan);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Deleted plan: {PlanId}", id);

                return Ok(new { message = "تم حذف الخطة بنجاح" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting plan {PlanId}", id);
                return StatusCode(500, new { message = "حدث خطأ أثناء حذف الخطة" });
            }
        }

        /// <summary>
        /// تفعيل/تعطيل خطة
        /// </summary>
        [HttpPut("{id}/toggle-status")]
        public async Task<ActionResult> TogglePlanStatus(int id)
        {
            try
            {
                var plan = await _context.Plans.FindAsync(id);
                if (plan == null)
                {
                    return NotFound(new { message = "الخطة غير موجودة" });
                }

                plan.IsActive = !plan.IsActive;
                plan.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Toggled plan status: {PlanId}, IsActive: {IsActive}", id, plan.IsActive);

                return Ok(new { message = plan.IsActive ? "تم تفعيل الخطة" : "تم تعطيل الخطة", isActive = plan.IsActive });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling plan status {PlanId}", id);
                return StatusCode(500, new { message = "حدث خطأ أثناء تغيير حالة الخطة" });
            }
        }

        // Helper method to map Plan to DTO
        private static PlanDto MapToDto(Plan p)
        {
            return new PlanDto
            {
                Id = p.Id,
                Name = p.Name,
                NameEn = p.NameEn,
                Description = p.Description,
                Price = p.Price,
                YearlyPrice = p.YearlyPrice,
                Currency = p.Currency,
                Color = p.Color,
                Icon = p.Icon,
                IsPopular = p.IsPopular,
                SortOrder = p.SortOrder,
                IsActive = p.IsActive,
                MaxUsers = p.MaxUsers,
                MaxInvoices = p.MaxInvoices,
                MaxCustomers = p.MaxCustomers,
                MaxProducts = p.MaxProducts,
                HasBasicReports = p.HasBasicReports,
                HasAdvancedReports = p.HasAdvancedReports,
                HasEmailSupport = p.HasEmailSupport,
                HasPrioritySupport = p.HasPrioritySupport,
                HasDedicatedManager = p.HasDedicatedManager,
                HasBackup = p.HasBackup,
                BackupFrequency = p.BackupFrequency,
                HasCustomInvoices = p.HasCustomInvoices,
                HasMultiCurrency = p.HasMultiCurrency,
                HasApiAccess = p.HasApiAccess,
                HasWhiteLabel = p.HasWhiteLabel,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            };
        }
    }

    // DTOs
    public class PlanDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public decimal? YearlyPrice { get; set; }
        public string Currency { get; set; } = "ج.م";
        public string Color { get; set; } = "blue";
        public string Icon { get; set; } = "Zap";
        public bool IsPopular { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public int MaxUsers { get; set; }
        public int MaxInvoices { get; set; }
        public int MaxCustomers { get; set; }
        public int MaxProducts { get; set; }
        public bool HasBasicReports { get; set; }
        public bool HasAdvancedReports { get; set; }
        public bool HasEmailSupport { get; set; }
        public bool HasPrioritySupport { get; set; }
        public bool HasDedicatedManager { get; set; }
        public bool HasBackup { get; set; }
        public string? BackupFrequency { get; set; }
        public bool HasCustomInvoices { get; set; }
        public bool HasMultiCurrency { get; set; }
        public bool HasApiAccess { get; set; }
        public bool HasWhiteLabel { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreatePlanDto
    {
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public decimal? YearlyPrice { get; set; }
        public string? Currency { get; set; }
        public string? Color { get; set; }
        public string? Icon { get; set; }
        public bool IsPopular { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        public int MaxUsers { get; set; } = 1;
        public int MaxInvoices { get; set; } = 50;
        public int MaxCustomers { get; set; } = 25;
        public int MaxProducts { get; set; } = 50;
        public bool HasBasicReports { get; set; } = true;
        public bool HasAdvancedReports { get; set; }
        public bool HasEmailSupport { get; set; } = true;
        public bool HasPrioritySupport { get; set; }
        public bool HasDedicatedManager { get; set; }
        public bool HasBackup { get; set; }
        public string? BackupFrequency { get; set; }
        public bool HasCustomInvoices { get; set; }
        public bool HasMultiCurrency { get; set; }
        public bool HasApiAccess { get; set; }
        public bool HasWhiteLabel { get; set; }
    }

    public class UpdatePlanDto
    {
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Description { get; set; }
        public decimal? Price { get; set; }
        public decimal? YearlyPrice { get; set; }
        public string? Currency { get; set; }
        public string? Color { get; set; }
        public string? Icon { get; set; }
        public bool? IsPopular { get; set; }
        public int? SortOrder { get; set; }
        public bool? IsActive { get; set; }
        public int? MaxUsers { get; set; }
        public int? MaxInvoices { get; set; }
        public int? MaxCustomers { get; set; }
        public int? MaxProducts { get; set; }
        public bool? HasBasicReports { get; set; }
        public bool? HasAdvancedReports { get; set; }
        public bool? HasEmailSupport { get; set; }
        public bool? HasPrioritySupport { get; set; }
        public bool? HasDedicatedManager { get; set; }
        public bool? HasBackup { get; set; }
        public string? BackupFrequency { get; set; }
        public bool? HasCustomInvoices { get; set; }
        public bool? HasMultiCurrency { get; set; }
        public bool? HasApiAccess { get; set; }
        public bool? HasWhiteLabel { get; set; }
    }
}
