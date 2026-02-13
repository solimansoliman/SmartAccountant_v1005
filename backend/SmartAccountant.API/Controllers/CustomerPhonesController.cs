using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Models.DTOs;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomerPhonesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<CustomerPhonesController> _logger;

        public CustomerPhonesController(ApplicationDbContext context, ILogger<CustomerPhonesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// الحصول على جميع هواتف عميل معين
        /// </summary>
        [HttpGet("customer/{customerId}")]
        public async Task<ActionResult<IEnumerable<CustomerPhoneDto>>> GetCustomerPhones(int customerId)
        {
            try
            {
                var phones = await _context.CustomerPhones
                    .Where(p => p.CustomerId == customerId && p.IsActive)
                    .OrderByDescending(p => p.IsPrimary)
                    .ThenByDescending(p => p.CreatedAt)
                    .ToListAsync();

                var phoneDtos = phones.Select(p => new CustomerPhoneDto
                {
                    Id = p.Id,
                    CustomerId = p.CustomerId,
                    PhoneNumber = p.PhoneNumber,
                    PhoneType = p.PhoneType,
                    IsPrimary = p.IsPrimary,
                    IsSecondary = p.IsSecondary,
                    Notes = p.Notes,
                    IsActive = p.IsActive,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt
                }).ToList();

                return Ok(phoneDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError($"خطأ في الحصول على هواتف العميل {customerId}: {ex.Message}");
                return StatusCode(500, new { error = "خطأ في الحصول على البيانات" });
            }
        }

        /// <summary>
        /// الحصول على هاتف محدد
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<CustomerPhoneDto>> GetCustomerPhone(int id)
        {
            try
            {
                var phone = await _context.CustomerPhones.FindAsync(id);
                if (phone == null)
                    return NotFound(new { error = "الهاتف غير موجود" });

                var phoneDto = new CustomerPhoneDto
                {
                    Id = phone.Id,
                    CustomerId = phone.CustomerId,
                    PhoneNumber = phone.PhoneNumber,
                    PhoneType = phone.PhoneType,
                    IsPrimary = phone.IsPrimary,
                    IsSecondary = phone.IsSecondary,
                    Notes = phone.Notes,
                    IsActive = phone.IsActive,
                    CreatedAt = phone.CreatedAt,
                    UpdatedAt = phone.UpdatedAt
                };

                return Ok(phoneDto);
            }
            catch (Exception ex)
            {
                _logger.LogError($"خطأ في الحصول على الهاتف: {ex.Message}");
                return StatusCode(500, new { error = "خطأ في الحصول على البيانات" });
            }
        }

        /// <summary>
        /// إضافة هاتف جديد لعميل
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<CustomerPhoneDto>> CreateCustomerPhone([FromBody] CreateCustomerPhoneDto dto)
        {
            try
            {
                // تحقق من وجود العميل
                var customer = await _context.Customers.FindAsync(dto.CustomerId);
                if (customer == null)
                    return NotFound(new { error = "العميل غير موجود" });

                // إذا كان الهاتف أساسي، أزل الأساسي السابق
                if (dto.IsPrimary)
                {
                    var primaryPhone = await _context.CustomerPhones
                        .FirstOrDefaultAsync(p => p.CustomerId == dto.CustomerId && p.IsPrimary);
                    if (primaryPhone != null)
                    {
                        primaryPhone.IsPrimary = false;
                    }
                }

                var phone = new CustomerPhone
                {
                    CustomerId = dto.CustomerId,
                    PhoneNumber = dto.PhoneNumber,
                    PhoneType = dto.PhoneType,
                    IsPrimary = dto.IsPrimary,
                    IsSecondary = dto.IsSecondary,
                    Notes = dto.Notes,
                    IsActive = dto.IsActive,
                    CreatedAt = DateTime.UtcNow
                };

                _context.CustomerPhones.Add(phone);
                await _context.SaveChangesAsync();

                var phoneDto = new CustomerPhoneDto
                {
                    Id = phone.Id,
                    CustomerId = phone.CustomerId,
                    PhoneNumber = phone.PhoneNumber,
                    PhoneType = phone.PhoneType,
                    IsPrimary = phone.IsPrimary,
                    IsSecondary = phone.IsSecondary,
                    Notes = phone.Notes,
                    IsActive = phone.IsActive,
                    CreatedAt = phone.CreatedAt,
                    UpdatedAt = phone.UpdatedAt
                };

                return CreatedAtAction("GetCustomerPhone", new { id = phone.Id }, phoneDto);
            }
            catch (Exception ex)
            {
                _logger.LogError($"خطأ في إضافة هاتف جديد: {ex.Message}");
                return StatusCode(500, new { error = "خطأ في حفظ البيانات" });
            }
        }

        /// <summary>
        /// تحديث هاتف عميل
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCustomerPhone(int id, [FromBody] UpdateCustomerPhoneDto dto)
        {
            try
            {
                var phone = await _context.CustomerPhones.FindAsync(id);
                if (phone == null)
                    return NotFound(new { error = "الهاتف غير موجود" });

                // إذا كان الهاتف أساسي، أزل الأساسي السابق
                if (dto.IsPrimary && !phone.IsPrimary)
                {
                    var primaryPhone = await _context.CustomerPhones
                        .FirstOrDefaultAsync(p => p.CustomerId == phone.CustomerId && p.IsPrimary);
                    if (primaryPhone != null)
                    {
                        primaryPhone.IsPrimary = false;
                    }
                }

                phone.PhoneNumber = dto.PhoneNumber;
                phone.PhoneType = dto.PhoneType;
                phone.IsPrimary = dto.IsPrimary;
                phone.IsSecondary = dto.IsSecondary;
                phone.Notes = dto.Notes;
                phone.IsActive = dto.IsActive;
                phone.UpdatedAt = DateTime.UtcNow;

                _context.CustomerPhones.Update(phone);
                await _context.SaveChangesAsync();

                return Ok(new { message = "تم تحديث الهاتف بنجاح" });
            }
            catch (Exception ex)
            {
                _logger.LogError($"خطأ في تحديث الهاتف: {ex.Message}");
                return StatusCode(500, new { error = "خطأ في حفظ البيانات" });
            }
        }

        /// <summary>
        /// حذف هاتف (soft delete)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomerPhone(int id)
        {
            try
            {
                // التحقق من X-Account-Id
                if (!Request.Headers.TryGetValue("X-Account-Id", out var accountIdStr) || !int.TryParse(accountIdStr, out var accountId))
                {
                    return BadRequest(new { error = "معرّف الحساب مفقود أو غير صالح" });
                }

                var phone = await _context.CustomerPhones.FindAsync(id);
                if (phone == null)
                    return NotFound(new { error = "الهاتف غير موجود" });

                // التحقق من أن الهاتف تابع للـ Customer الصحيح
                var customer = await _context.Customers.FindAsync(phone.CustomerId);
                if (customer == null || customer.AccountId != accountId)
                    return Forbid(); // 403 - غير مصرح

                phone.IsActive = false;
                phone.UpdatedAt = DateTime.UtcNow;

                _context.CustomerPhones.Update(phone);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"تم حذف الهاتف {id} للعميل {phone.CustomerId}");
                return Ok(new { message = "تم حذف الهاتف بنجاح" });
            }
            catch (Exception ex)
            {
                _logger.LogError($"خطأ في حذف الهاتف: {ex.Message}");
                return StatusCode(500, new { error = "خطأ في حذف البيانات" });
            }
        }

        /// <summary>
        /// تعيين هاتف كأساسي
        /// </summary>
        [HttpPost("{id}/set-primary")]
        public async Task<IActionResult> SetPrimaryPhone(int id)
        {
            try
            {
                var phone = await _context.CustomerPhones.FindAsync(id);
                if (phone == null)
                    return NotFound(new { error = "الهاتف غير موجود" });

                // أزل الأساسي السابق
                var primaryPhone = await _context.CustomerPhones
                    .FirstOrDefaultAsync(p => p.CustomerId == phone.CustomerId && p.IsPrimary);
                if (primaryPhone != null)
                {
                    primaryPhone.IsPrimary = false;
                }

                phone.IsPrimary = true;
                phone.UpdatedAt = DateTime.UtcNow;

                _context.CustomerPhones.Update(phone);
                await _context.SaveChangesAsync();

                return Ok(new { message = "تم تعيين الهاتف كأساسي" });
            }
            catch (Exception ex)
            {
                _logger.LogError($"خطأ في تعيين الهاتف الأساسي: {ex.Message}");
                return StatusCode(500, new { error = "خطأ في حفظ البيانات" });
            }
        }

        /// <summary>
        /// البحث عن عميل برقم هاتف
        /// </summary>
        [HttpGet("search/phone")]
        public async Task<ActionResult<IEnumerable<dynamic>>> SearchByPhone([FromQuery] string phone)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(phone))
                    return BadRequest(new { error = "رقم الهاتف مطلوب" });

                var results = await _context.CustomerPhones
                    .Where(p => p.PhoneNumber.Contains(phone) && p.IsActive)
                    .Include(p => p.Customer)
                    .Select(p => new
                    {
                        p.Id,
                        p.CustomerId,
                        CustomerName = p.Customer!.Name,
                        p.PhoneNumber,
                        p.PhoneType,
                        p.IsPrimary
                    })
                    .ToListAsync();

                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError($"خطأ في البحث عن الهاتف: {ex.Message}");
                return StatusCode(500, new { error = "خطأ في البحث" });
            }
        }
    }
}
