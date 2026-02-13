using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Services;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;
        private readonly ICustomerInputLimitsService _inputLimitsService;

        public CustomersController(
            ApplicationDbContext context,
            IActivityLogService activityLog,
            ICustomerInputLimitsService inputLimitsService)
        {
            _context = context;
            _activityLog = activityLog;
            _inputLimitsService = inputLimitsService;
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
        /// الحصول على جميع العملاء
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomers(
            [FromQuery] string? search)
        {
            try
            {
                var accountId = GetAccountId();
                
                var query = _context.Customers
                    .Where(c => c.AccountId == accountId && c.IsActive)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(search))
                {
                    query = query.Where(c => 
                        c.Name.Contains(search) || 
                        c.Code.Contains(search));
                }

                var customers = await query.OrderBy(c => c.Name).ToListAsync();
            
                return Ok(customers.Select(c => new CustomerDto
                {
                    Id = c.Id,
                    AccountId = c.AccountId,
                    Code = c.Code,
                    Name = c.Name,
                    Type = c.Type,
                    Address = c.Address,
                    Balance = c.Balance,
                    IsVIP = c.IsVIP,
                    TotalPurchases = c.TotalPurchases,
                    TotalPayments = c.TotalPayments,
                    InvoiceCount = c.InvoiceCount,
                    JoinDate = c.JoinDate,
                    LastPurchaseDate = c.LastPurchaseDate,
                    LastPaymentDate = c.LastPaymentDate,
                    Notes = c.Notes,
                    IsActive = c.IsActive,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                }));
            }
            catch (Exception ex)
            {
                var errorMsg = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "خطأ في جلب بيانات العملاء", error = errorMsg });
            }
        }

        /// <summary>
        /// الحصول على عميل بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<CustomerDto>> GetCustomer(int id)
        {
            try
            {
                var accountId = GetAccountId();
                var customer = await _context.Customers
                    .Include(c => c.PrimaryEmail)
                    .FirstOrDefaultAsync(c => c.Id == id && c.AccountId == accountId);
                    
                if (customer == null)
                {
                    return NotFound();
                }
                
                var customerDto = new CustomerDto
                {
                    Id = customer.Id,
                    AccountId = customer.AccountId,
                    Code = customer.Code,
                    Name = customer.Name,
                    PrimaryPhoneId = customer.PrimaryPhoneId,
                    SecondaryPhoneId = customer.SecondaryPhoneId,
                    PrimaryEmailId = customer.PrimaryEmailId,
                    PrimaryEmailAddress = customer.PrimaryEmail?.EmailAddress,
                    CountryId = customer.CountryId,
                    CountryName = null,
                    ProvinceId = customer.ProvinceId,
                    ProvinceName = null,
                    CityId = customer.CityId,
                    CityName = null,
                    Address = customer.Address,
                    Type = customer.Type,
                    Balance = customer.Balance,
                    JoinDate = customer.JoinDate,
                    LastPurchaseDate = customer.LastPurchaseDate,
                    LastPaymentDate = customer.LastPaymentDate,
                    TotalPurchases = customer.TotalPurchases,
                    TotalPayments = customer.TotalPayments,
                    InvoiceCount = customer.InvoiceCount,
                    Notes = customer.Notes,
                    IsActive = customer.IsActive,
                    IsVIP = customer.IsVIP,
                    CreatedAt = customer.CreatedAt,
                    UpdatedAt = customer.UpdatedAt,
                    Phones = new(),
                    Emails = new()
                };
                
                return Ok(customerDto);
            }
            catch
            {
                // Fallback for legacy schemas missing optional relations.
                var accountId = GetAccountId();
                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.Id == id && c.AccountId == accountId);

                if (customer == null)
                {
                    return NotFound();
                }

                string? primaryEmailAddress = null;
                if (customer.PrimaryEmailId.HasValue)
                {
                    var email = await _context.Emails
                        .FirstOrDefaultAsync(e => e.Id == customer.PrimaryEmailId.Value && e.AccountId == accountId);
                    primaryEmailAddress = email?.EmailAddress;
                }

                return Ok(new CustomerDto
                {
                    Id = customer.Id,
                    AccountId = customer.AccountId,
                    Code = customer.Code,
                    Name = customer.Name,
                    PrimaryPhoneId = customer.PrimaryPhoneId,
                    SecondaryPhoneId = customer.SecondaryPhoneId,
                    PrimaryEmailId = customer.PrimaryEmailId,
                    PrimaryEmailAddress = primaryEmailAddress,
                    CountryId = customer.CountryId,
                    CountryName = null,
                    ProvinceId = customer.ProvinceId,
                    ProvinceName = null,
                    CityId = customer.CityId,
                    CityName = null,
                    Address = customer.Address,
                    Type = customer.Type,
                    Balance = customer.Balance,
                    JoinDate = customer.JoinDate,
                    LastPurchaseDate = customer.LastPurchaseDate,
                    LastPaymentDate = customer.LastPaymentDate,
                    TotalPurchases = customer.TotalPurchases,
                    TotalPayments = customer.TotalPayments,
                    InvoiceCount = customer.InvoiceCount,
                    Notes = customer.Notes,
                    IsActive = customer.IsActive,
                    IsVIP = customer.IsVIP,
                    CreatedAt = customer.CreatedAt,
                    UpdatedAt = customer.UpdatedAt,
                    Phones = new(),
                    Emails = new()
                });
            }
        }

        /// <summary>
        /// إنشاء عميل جديد
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<CustomerDto>> CreateCustomer(CreateCustomerDto dto)
        {
            try
            {
                var accountId = GetAccountId();
                var limits = await _inputLimitsService.GetLimitsAsync(accountId);
                var customerName = (dto.Name ?? string.Empty).Trim();
                var primaryEmailAddress = dto.PrimaryEmailAddress?.Trim();

                if (string.IsNullOrWhiteSpace(customerName))
                {
                    return BadRequest(new { message = "اسم العميل مطلوب" });
                }

                if (customerName.Length > limits.CustomerNameMaxLength)
                {
                    return BadRequest(new { message = $"اسم العميل يتجاوز الحد المسموح ({limits.CustomerNameMaxLength})" });
                }

                if (!string.IsNullOrEmpty(dto.Address) && dto.Address.Length > limits.CustomerAddressMaxLength)
                {
                    return BadRequest(new { message = $"تفاصيل العنوان تتجاوز الحد المسموح ({limits.CustomerAddressMaxLength})" });
                }

                if (!string.IsNullOrEmpty(dto.Notes) && dto.Notes.Length > limits.CustomerNotesMaxLength)
                {
                    return BadRequest(new { message = $"الملاحظات تتجاوز الحد المسموح ({limits.CustomerNotesMaxLength})" });
                }

                if (!string.IsNullOrEmpty(primaryEmailAddress) && primaryEmailAddress.Length > limits.CustomerEmailMaxLength)
                {
                    return BadRequest(new { message = $"البريد الإلكتروني يتجاوز الحد المسموح ({limits.CustomerEmailMaxLength})" });
                }
                
                // توليد كود العميل تلقائياً
                var lastCustomer = await _context.Customers
                    .Where(c => c.AccountId == accountId)
                    .OrderByDescending(c => c.Id)
                    .FirstOrDefaultAsync();

                var nextNumber = (lastCustomer?.Id ?? 0) + 1;
                
                var customer = new Customer
                {
                    AccountId = accountId,
                    Code = string.IsNullOrEmpty(dto.Code) ? $"C{nextNumber:D4}" : dto.Code,
                    Name = customerName,
                    // Use text fields from the database schema instead of FK references
                    Address = dto.Address,
                    Type = dto.Type,
                    JoinDate = dto.JoinDate ?? DateTime.UtcNow,
                    Notes = dto.Notes,
                    IsVIP = dto.IsVIP,
                    InvoiceCount = 0,
                    TotalPurchases = 0,
                    TotalPayments = 0,
                    Balance = 0,
                    PrimaryEmailId = null, // لا تعيين بريد إلكتروني أساسي في البداية
                    CreatedAt = DateTime.UtcNow,
                    CreatedByUserId = GetUserId()
                };

                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();

                // معالجة البريد الإلكتروني الأساسي بعد إنشاء العميل
                if (!string.IsNullOrEmpty(primaryEmailAddress))
                {
                    try
                    {
                        // إنشاء بريد إلكتروني جديد في جدول Emails (المربوط بـ PrimaryEmailId)
                        var newEmail = new Email
                        {
                            AccountId = accountId,
                            EntityType = "Customer",
                            EntityId = customer.Id,
                            EmailAddress = primaryEmailAddress,
                            EmailType = "work",
                            IsPrimary = true,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            CreatedByUserId = GetUserId()
                        };
                        _context.Emails.Add(newEmail);
                        await _context.SaveChangesAsync();
                        
                        // تحديث العميل بتعيين البريد الإلكتروني الأساسي
                        customer.PrimaryEmailId = newEmail.Id;
                        _context.Customers.Update(customer);
                        await _context.SaveChangesAsync();
                    }
                    catch (Exception emailEx)
                    {
                        // Log email creation error but continue - customer was created successfully
                        Console.WriteLine($"Error creating email for customer: {emailEx.Message}");
                    }
                }


                // تسجيل النشاط (non-blocking, wrap in try-catch)
                try
                {
                    await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.CreateCustomer, EntityTypes.Customer,
                        customer.Id, customer.Name, $"تم إنشاء عميل جديد: {customer.Name} (الكود: {customer.Code})");
                }
                catch { /* Activity logging is non-critical */ }

                // Return created customer response (without eager loading to avoid lazy load issues)
                return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, new CustomerDto
                {
                    Id = customer.Id,
                    AccountId = customer.AccountId,
                    Code = customer.Code,
                    Name = customer.Name,
                    CountryId = customer.CountryId,
                    CountryName = null,
                    ProvinceId = customer.ProvinceId,
                    ProvinceName = null,
                    CityId = customer.CityId,
                    CityName = null,
                    Address = customer.Address,
                    Type = customer.Type,
                    Balance = customer.Balance,
                    JoinDate = customer.JoinDate,
                    Notes = customer.Notes,
                    IsActive = customer.IsActive,
                    IsVIP = customer.IsVIP,
                    InvoiceCount = customer.InvoiceCount,
                    TotalPurchases = customer.TotalPurchases,
                    TotalPayments = customer.TotalPayments,
                    PrimaryEmailId = customer.PrimaryEmailId,
                    PrimaryEmailAddress = primaryEmailAddress,
                    CreatedAt = customer.CreatedAt,
                    UpdatedAt = customer.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                var errorMsg = ex.InnerException?.Message ?? ex.Message;
                // Remove file paths from error message
                errorMsg = System.Text.RegularExpressions.Regex.Replace(errorMsg, @"C:\\[^'""]*\\", "");
                return StatusCode(500, new { message = "حدث خطأ أثناء إنشاء العميل", error = errorMsg });
            }
        }

        /// <summary>
        /// تحديث عميل
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCustomer(int id, UpdateCustomerDto dto)
        {
            try
            {
                var accountId = GetAccountId();
                var limits = await _inputLimitsService.GetLimitsAsync(accountId);
                var primaryEmailAddress = dto.PrimaryEmailAddress?.Trim();

                var existingCustomer = await _context.Customers
                    .Include(c => c.PrimaryPhone)
                    .Include(c => c.SecondaryPhone)
                    .Include(c => c.PrimaryEmail)
                    .FirstOrDefaultAsync(c => c.Id == id && c.AccountId == accountId);
                    
                if (existingCustomer == null)
                {
                    return NotFound();
                }

                if (dto.Name != null)
                {
                    var trimmedName = dto.Name.Trim();
                    if (string.IsNullOrWhiteSpace(trimmedName))
                    {
                        return BadRequest(new { message = "اسم العميل مطلوب" });
                    }

                    if (trimmedName.Length > limits.CustomerNameMaxLength)
                    {
                        return BadRequest(new { message = $"اسم العميل يتجاوز الحد المسموح ({limits.CustomerNameMaxLength})" });
                    }

                    existingCustomer.Name = trimmedName;
                }

                if (dto.Address != null && dto.Address.Length > limits.CustomerAddressMaxLength)
                {
                    return BadRequest(new { message = $"تفاصيل العنوان تتجاوز الحد المسموح ({limits.CustomerAddressMaxLength})" });
                }

                if (dto.Notes != null && dto.Notes.Length > limits.CustomerNotesMaxLength)
                {
                    return BadRequest(new { message = $"الملاحظات تتجاوز الحد المسموح ({limits.CustomerNotesMaxLength})" });
                }

                if (dto.PrimaryEmailAddress != null && !string.IsNullOrEmpty(primaryEmailAddress) && primaryEmailAddress.Length > limits.CustomerEmailMaxLength)
                {
                    return BadRequest(new { message = $"البريد الإلكتروني يتجاوز الحد المسموح ({limits.CustomerEmailMaxLength})" });
                }

                existingCustomer.CityId = dto.CityId ?? existingCustomer.CityId;
                existingCustomer.ProvinceId = dto.ProvinceId ?? existingCustomer.ProvinceId;
                existingCustomer.CountryId = dto.CountryId ?? existingCustomer.CountryId;
                existingCustomer.Address = dto.Address ?? existingCustomer.Address;
                existingCustomer.Type = dto.Type ?? existingCustomer.Type;
                existingCustomer.Notes = dto.Notes ?? existingCustomer.Notes;
                if (dto.IsVIP.HasValue)
                    existingCustomer.IsVIP = dto.IsVIP.Value;

                // معالجة تحديث البريد الإلكتروني الأساسي
                if (!string.IsNullOrEmpty(primaryEmailAddress))
                {
                    // البحث عن بريد إلكتروني موجود بهذا العنوان
                    var existingEmail = await _context.Emails
                        .Where(e => e.AccountId == accountId && e.EntityType == "Customer" && e.EntityId == id && e.EmailAddress == primaryEmailAddress && e.IsActive)
                        .FirstOrDefaultAsync();

                    if (existingEmail != null)
                    {
                        // استخدام البريد الإلكتروني الموجود
                        existingEmail.IsPrimary = true;
                        existingEmail.UpdatedAt = DateTime.UtcNow;
                        existingCustomer.PrimaryEmailId = existingEmail.Id;
                    }
                    else
                    {
                        // إنشاء بريد إلكتروني جديد وتعيينه كبريد أساسي
                        var newEmail = new Email
                        {
                            AccountId = accountId,
                            EntityType = "Customer",
                            EntityId = id,
                            EmailAddress = primaryEmailAddress,
                            EmailType = "work",
                            IsPrimary = true,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            CreatedByUserId = GetUserId()
                        };
                        _context.Emails.Add(newEmail);
                        await _context.SaveChangesAsync();
                        existingCustomer.PrimaryEmailId = newEmail.Id;
                    }

                    // إلغاء الوسم الأساسي عن أي بريد آخر للعميل
                    var otherPrimaryEmails = await _context.Emails
                        .Where(e => e.AccountId == accountId && e.EntityType == "Customer" && e.EntityId == id && e.Id != existingCustomer.PrimaryEmailId && e.IsPrimary)
                        .ToListAsync();
                    foreach (var email in otherPrimaryEmails)
                    {
                        email.IsPrimary = false;
                        email.UpdatedAt = DateTime.UtcNow;
                    }
                }
                else if (dto.PrimaryEmailAddress != null)
                {
                    // إزالة البريد الإلكتروني الأساسي إذا تم إرسال سلسلة فارغة/مسافات
                    existingCustomer.PrimaryEmailId = null;
                }
                else if (dto.PrimaryEmailId.HasValue)
                {
                    // التعامل مع حالة إرسال PrimaryEmailId مباشرة
                    if (dto.PrimaryEmailId.Value > 0)
                    {
                        // التحقق من وجود البريد الإلكتروني
                        var emailExists = await _context.Emails
                            .AnyAsync(e => e.Id == dto.PrimaryEmailId.Value && e.AccountId == accountId && e.EntityType == "Customer" && e.EntityId == id && e.IsActive);
                        
                        if (emailExists)
                        {
                            existingCustomer.PrimaryEmailId = dto.PrimaryEmailId.Value;
                        }
                        else
                        {
                            // البريد الإلكتروني غير موجود، لا تعدّل PrimaryEmailId
                            existingCustomer.PrimaryEmailId = null;
                        }
                    }
                    else
                    {
                        existingCustomer.PrimaryEmailId = null;
                    }
                }

                // Validate existing PrimaryEmailId before saving
                if (existingCustomer.PrimaryEmailId.HasValue && existingCustomer.PrimaryEmailId.Value > 0)
                {
                    // Check if the email still exists and is active
                    var emailStillExists = await _context.Emails
                        .AnyAsync(e => e.Id == existingCustomer.PrimaryEmailId.Value && e.AccountId == accountId && e.EntityType == "Customer" && e.EntityId == id && e.IsActive);
                    
                    if (!emailStillExists)
                    {
                        // Email no longer exists, clear the reference
                        existingCustomer.PrimaryEmailId = null;
                    }
                }

                existingCustomer.UpdatedAt = DateTime.UtcNow;
                existingCustomer.UpdatedByUserId = GetUserId();

                await _context.SaveChangesAsync();

                // تسجيل النشاط
                await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.UpdateCustomer, EntityTypes.Customer,
                    existingCustomer.Id, existingCustomer.Name, $"تم تعديل العميل: {existingCustomer.Name}");

                string? primaryEmailAddressResponse = null;
                if (existingCustomer.PrimaryEmailId.HasValue)
                {
                    var primaryEmail = await _context.Emails
                        .FirstOrDefaultAsync(e => e.Id == existingCustomer.PrimaryEmailId.Value && e.AccountId == accountId);
                    primaryEmailAddressResponse = primaryEmail?.EmailAddress;
                }

                return Ok(new CustomerDto
                {
                    Id = existingCustomer.Id,
                    AccountId = existingCustomer.AccountId,
                    Code = existingCustomer.Code,
                    Name = existingCustomer.Name,
                    CountryId = existingCustomer.CountryId,
                    CountryName = null,
                    ProvinceId = existingCustomer.ProvinceId,
                    ProvinceName = null,
                    CityId = existingCustomer.CityId,
                    CityName = null,
                    Address = existingCustomer.Address,
                    Type = existingCustomer.Type,
                    Balance = existingCustomer.Balance,
                    JoinDate = existingCustomer.JoinDate,
                    Notes = existingCustomer.Notes,
                    IsActive = existingCustomer.IsActive,
                    IsVIP = existingCustomer.IsVIP,
                    InvoiceCount = existingCustomer.InvoiceCount,
                    TotalPurchases = existingCustomer.TotalPurchases,
                    TotalPayments = existingCustomer.TotalPayments,
                    PrimaryEmailId = existingCustomer.PrimaryEmailId,
                    PrimaryEmailAddress = primaryEmailAddressResponse,
                    CreatedAt = existingCustomer.CreatedAt,
                    UpdatedAt = existingCustomer.UpdatedAt
                });
            }
            catch
            {
                return StatusCode(500, new { message = "حدث خطأ أثناء تحديث العميل" });
            }
        }

        /// <summary>
        /// حذف عميل (تعطيل)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            var accountId = GetAccountId();
            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == id && c.AccountId == accountId);
            if (customer == null)
            {
                return NotFound();
            }

            customer.IsActive = false;
            customer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.DeleteCustomer, EntityTypes.Customer,
                customer.Id, customer.Name, $"تم حذف العميل: {customer.Name}");

            return NoContent();
        }

        /// <summary>
        /// الحصول على رصيد العميل
        /// </summary>
        [HttpGet("{id}/balance")]
        public async Task<ActionResult<object>> GetCustomerBalance(int id)
        {
            var accountId = GetAccountId();
            var customer = await _context.Customers
                .Include(c => c.Invoices)
                .FirstOrDefaultAsync(c => c.Id == id && c.AccountId == accountId);

            if (customer == null)
            {
                return NotFound();
            }

            var totalInvoices = customer.Invoices
                .Where(i => i.Status != InvoiceStatus.Cancelled)
                .Sum(i => i.TotalAmount);

            var totalPaid = customer.Invoices
                .Where(i => i.Status != InvoiceStatus.Cancelled)
                .Sum(i => i.PaidAmount);

            return new
            {
                CustomerId = customer.Id,
                CustomerName = customer.Name,
                TotalInvoices = totalInvoices,
                TotalPaid = totalPaid,
                Balance = totalInvoices - totalPaid
            };
        }
    }
    
    // DTOs
    public class CustomerDto
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int? PrimaryPhoneId { get; set; }
        public int? SecondaryPhoneId { get; set; }
        public int? PrimaryEmailId { get; set; }
        public string? PrimaryEmailAddress { get; set; }
        public int? CountryId { get; set; }
        public string? CountryName { get; set; }
        public int? ProvinceId { get; set; }
        public string? ProvinceName { get; set; }
        public int? CityId { get; set; }
        public string? CityName { get; set; }
        public string? Address { get; set; }
        public CustomerType Type { get; set; }
        public decimal Balance { get; set; }
        public DateTime? JoinDate { get; set; }
        public DateTime? LastPurchaseDate { get; set; }
        public DateTime? LastPaymentDate { get; set; }
        public decimal? TotalPurchases { get; set; }
        public decimal? TotalPayments { get; set; }
        public int InvoiceCount { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; }
        public bool IsVIP { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<PhoneInfo> Phones { get; set; } = new();
        public List<EmailInfo> Emails { get; set; } = new();
    }
    
    public class PhoneInfo
    {
        public int Id { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string PhoneType { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
        public bool IsSecondary { get; set; }
        public bool IsActive { get; set; }
    }
    
    public class EmailInfo
    {
        public int Id { get; set; }
        public string EmailAddress { get; set; } = string.Empty;
        public string EmailType { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
        public bool IsActive { get; set; }
    }
    
    public class CreateCustomerDto
    {
        public string? Code { get; set; }
        public string Name { get; set; } = string.Empty;
        public int? CountryId { get; set; }
        public int? ProvinceId { get; set; }
        public int? CityId { get; set; }
        public string? Address { get; set; }
        public CustomerType Type { get; set; } = CustomerType.Individual;
        public DateTime? JoinDate { get; set; }
        public string? Notes { get; set; }
        public bool IsVIP { get; set; }
        public int? PrimaryEmailId { get; set; }
        public string? PrimaryEmailAddress { get; set; }
    }
    
    public class UpdateCustomerDto
    {
        public string? Name { get; set; }
        public int? CountryId { get; set; }
        public int? ProvinceId { get; set; }
        public int? CityId { get; set; }
        public string? Address { get; set; }
        public CustomerType? Type { get; set; }
        public string? Notes { get; set; }
        public bool? IsVIP { get; set; }
        public int? PrimaryEmailId { get; set; }
        public string? PrimaryEmailAddress { get; set; }
    }
}
