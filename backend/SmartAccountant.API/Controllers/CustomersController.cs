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

        public CustomersController(ApplicationDbContext context, IActivityLogService activityLog)
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
        /// الحصول على جميع العملاء
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomers(
            [FromQuery] string? search)
        {
            var accountId = GetAccountId();
            
            var query = _context.Customers
                .Include(c => c.PrimaryPhone)
                .Include(c => c.SecondaryPhone)
                .Include(c => c.PrimaryEmail)
                .Where(c => c.AccountId == accountId && c.IsActive)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(c => 
                    c.Name.Contains(search) || 
                    c.Code.Contains(search) || 
                    (c.PrimaryPhone != null && c.PrimaryPhone.Phone.Contains(search)));
            }

            var customers = await query.OrderBy(c => c.Name).ToListAsync();
            
            return customers.Select(c => new CustomerDto
            {
                Id = c.Id,
                AccountId = c.AccountId,
                Code = c.Code,
                Name = c.Name,
                NameEn = c.NameEn,
                ContactPerson = c.ContactPerson,
                Phone = c.PrimaryPhone?.Phone,
                Phone2 = c.SecondaryPhone?.Phone,
                Email = c.PrimaryEmail?.EmailAddress,
                PrimaryPhoneId = c.PrimaryPhoneId,
                SecondaryPhoneId = c.SecondaryPhoneId,
                PrimaryEmailId = c.PrimaryEmailId,
                Address = c.Address,
                City = c.City,
                TaxNumber = c.TaxNumber,
                Type = c.Type,
                CreditLimit = c.CreditLimit,
                Balance = c.Balance,
                Notes = c.Notes,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt
            }).ToList();
        }

        /// <summary>
        /// الحصول على عميل بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<CustomerDto>> GetCustomer(int id)
        {
            var accountId = GetAccountId();
            var customer = await _context.Customers
                .Include(c => c.PrimaryPhone)
                .Include(c => c.SecondaryPhone)
                .Include(c => c.PrimaryEmail)
                .FirstOrDefaultAsync(c => c.Id == id && c.AccountId == accountId);
                
            if (customer == null)
            {
                return NotFound();
            }
            
            return new CustomerDto
            {
                Id = customer.Id,
                AccountId = customer.AccountId,
                Code = customer.Code,
                Name = customer.Name,
                NameEn = customer.NameEn,
                ContactPerson = customer.ContactPerson,
                Phone = customer.PrimaryPhone?.Phone,
                Phone2 = customer.SecondaryPhone?.Phone,
                Email = customer.PrimaryEmail?.EmailAddress,
                PrimaryPhoneId = customer.PrimaryPhoneId,
                SecondaryPhoneId = customer.SecondaryPhoneId,
                PrimaryEmailId = customer.PrimaryEmailId,
                Address = customer.Address,
                City = customer.City,
                TaxNumber = customer.TaxNumber,
                Type = customer.Type,
                CreditLimit = customer.CreditLimit,
                Balance = customer.Balance,
                Notes = customer.Notes,
                IsActive = customer.IsActive,
                CreatedAt = customer.CreatedAt
            };
        }

        /// <summary>
        /// إنشاء عميل جديد
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<CustomerDto>> CreateCustomer(CreateCustomerDto dto)
        {
            var accountId = GetAccountId();
            
            // إنشاء سجل هاتف أساسي إذا تم تقديمه
            PhoneNumber? primaryPhone = null;
            if (!string.IsNullOrEmpty(dto.Phone))
            {
                primaryPhone = new PhoneNumber
                {
                    AccountId = accountId,
                    EntityType = "Customer",
                    EntityId = 0, // سيتم تحديثه بعد إنشاء العميل
                    Phone = dto.Phone,
                    PhoneType = "mobile",
                    IsPrimary = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.PhoneNumbers.Add(primaryPhone);
                await _context.SaveChangesAsync();
            }
            
            // إنشاء سجل هاتف ثانوي إذا تم تقديمه
            PhoneNumber? secondaryPhone = null;
            if (!string.IsNullOrEmpty(dto.Phone2))
            {
                secondaryPhone = new PhoneNumber
                {
                    AccountId = accountId,
                    EntityType = "Customer",
                    EntityId = 0,
                    Phone = dto.Phone2,
                    PhoneType = "mobile",
                    IsPrimary = false,
                    CreatedAt = DateTime.UtcNow
                };
                _context.PhoneNumbers.Add(secondaryPhone);
                await _context.SaveChangesAsync();
            }
            
            // إنشاء سجل إيميل إذا تم تقديمه
            Email? primaryEmail = null;
            if (!string.IsNullOrEmpty(dto.Email))
            {
                primaryEmail = new Email
                {
                    AccountId = accountId,
                    EntityType = "Customer",
                    EntityId = 0,
                    EmailAddress = dto.Email,
                    EmailType = "work",
                    IsPrimary = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Emails.Add(primaryEmail);
                await _context.SaveChangesAsync();
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
                Name = dto.Name,
                NameEn = dto.NameEn,
                ContactPerson = dto.ContactPerson,
                PrimaryPhoneId = primaryPhone?.Id,
                SecondaryPhoneId = secondaryPhone?.Id,
                PrimaryEmailId = primaryEmail?.Id,
                Address = dto.Address,
                City = dto.City,
                TaxNumber = dto.TaxNumber,
                Type = dto.Type,
                CreditLimit = dto.CreditLimit,
                Notes = dto.Notes,
                InvoiceCount = 0,
                TotalPurchases = 0,
                TotalPayments = 0,
                Balance = 0,
                JoinDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();
            
            // تحديث EntityId في الهواتف والإيميلات
            if (primaryPhone != null)
            {
                primaryPhone.EntityId = customer.Id;
            }
            if (secondaryPhone != null)
            {
                secondaryPhone.EntityId = customer.Id;
            }
            if (primaryEmail != null)
            {
                primaryEmail.EntityId = customer.Id;
            }
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.CreateCustomer, EntityTypes.Customer,
                customer.Id, customer.Name, $"تم إنشاء عميل جديد: {customer.Name} (الكود: {customer.Code})");

            return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, new CustomerDto
            {
                Id = customer.Id,
                AccountId = customer.AccountId,
                Code = customer.Code,
                Name = customer.Name,
                Phone = primaryPhone?.Phone,
                Phone2 = secondaryPhone?.Phone,
                Email = primaryEmail?.EmailAddress,
                Notes = customer.Notes,
                IsActive = customer.IsActive,
                CreatedAt = customer.CreatedAt
            });
        }

        /// <summary>
        /// تحديث عميل
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCustomer(int id, UpdateCustomerDto dto)
        {
            var accountId = GetAccountId();

            var existingCustomer = await _context.Customers
                .Include(c => c.PrimaryPhone)
                .Include(c => c.SecondaryPhone)
                .Include(c => c.PrimaryEmail)
                .FirstOrDefaultAsync(c => c.Id == id && c.AccountId == accountId);
                
            if (existingCustomer == null)
            {
                return NotFound();
            }

            // تحديث الهاتف الأساسي
            if (dto.Phone != null)
            {
                if (existingCustomer.PrimaryPhone != null)
                {
                    existingCustomer.PrimaryPhone.Phone = dto.Phone;
                    existingCustomer.PrimaryPhone.UpdatedAt = DateTime.UtcNow;
                }
                else if (!string.IsNullOrEmpty(dto.Phone))
                {
                    var newPhone = new PhoneNumber
                    {
                        AccountId = accountId,
                        EntityType = "Customer",
                        EntityId = id,
                        Phone = dto.Phone,
                        PhoneType = "mobile",
                        IsPrimary = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.PhoneNumbers.Add(newPhone);
                    await _context.SaveChangesAsync();
                    existingCustomer.PrimaryPhoneId = newPhone.Id;
                }
            }
            
            // تحديث الهاتف الثانوي
            if (dto.Phone2 != null)
            {
                if (existingCustomer.SecondaryPhone != null)
                {
                    existingCustomer.SecondaryPhone.Phone = dto.Phone2;
                    existingCustomer.SecondaryPhone.UpdatedAt = DateTime.UtcNow;
                }
                else if (!string.IsNullOrEmpty(dto.Phone2))
                {
                    var newPhone = new PhoneNumber
                    {
                        AccountId = accountId,
                        EntityType = "Customer",
                        EntityId = id,
                        Phone = dto.Phone2,
                        PhoneType = "mobile",
                        IsPrimary = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.PhoneNumbers.Add(newPhone);
                    await _context.SaveChangesAsync();
                    existingCustomer.SecondaryPhoneId = newPhone.Id;
                }
            }
            
            // تحديث الإيميل
            if (dto.Email != null)
            {
                if (existingCustomer.PrimaryEmail != null)
                {
                    existingCustomer.PrimaryEmail.EmailAddress = dto.Email;
                    existingCustomer.PrimaryEmail.UpdatedAt = DateTime.UtcNow;
                }
                else if (!string.IsNullOrEmpty(dto.Email))
                {
                    var newEmail = new Email
                    {
                        AccountId = accountId,
                        EntityType = "Customer",
                        EntityId = id,
                        EmailAddress = dto.Email,
                        EmailType = "work",
                        IsPrimary = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Emails.Add(newEmail);
                    await _context.SaveChangesAsync();
                    existingCustomer.PrimaryEmailId = newEmail.Id;
                }
            }

            existingCustomer.Name = dto.Name ?? existingCustomer.Name;
            existingCustomer.NameEn = dto.NameEn ?? existingCustomer.NameEn;
            existingCustomer.Address = dto.Address ?? existingCustomer.Address;
            existingCustomer.City = dto.City ?? existingCustomer.City;
            existingCustomer.TaxNumber = dto.TaxNumber ?? existingCustomer.TaxNumber;
            existingCustomer.Type = dto.Type ?? existingCustomer.Type;
            existingCustomer.CreditLimit = dto.CreditLimit ?? existingCustomer.CreditLimit;
            existingCustomer.Notes = dto.Notes ?? existingCustomer.Notes;
            existingCustomer.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.UpdateCustomer, EntityTypes.Customer,
                existingCustomer.Id, existingCustomer.Name, $"تم تعديل العميل: {existingCustomer.Name}");

            return NoContent();
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

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.DeleteCustomer, EntityTypes.Customer,
                customer.Id, customer.Name, $"تم حذف العميل: {customer.Name}");

            customer.IsActive = false;
            customer.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

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
                Balance = totalInvoices - totalPaid,
                CreditLimit = customer.CreditLimit,
                AvailableCredit = customer.CreditLimit - (totalInvoices - totalPaid)
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
        public string? NameEn { get; set; }
        public string? ContactPerson { get; set; }
        public string? Phone { get; set; }
        public string? Phone2 { get; set; }
        public string? Email { get; set; }
        public int? PrimaryPhoneId { get; set; }
        public int? SecondaryPhoneId { get; set; }
        public int? PrimaryEmailId { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? TaxNumber { get; set; }
        public CustomerType Type { get; set; }
        public decimal CreditLimit { get; set; }
        public decimal Balance { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
    
    public class CreateCustomerDto
    {
        public string? Code { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }
        public string? ContactPerson { get; set; }
        public string? Phone { get; set; }
        public string? Phone2 { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? TaxNumber { get; set; }
        public CustomerType Type { get; set; } = CustomerType.Individual;
        public decimal CreditLimit { get; set; }
        public string? Notes { get; set; }
    }
    
    public class UpdateCustomerDto
    {
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Phone { get; set; }
        public string? Phone2 { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? TaxNumber { get; set; }
        public CustomerType? Type { get; set; }
        public decimal? CreditLimit { get; set; }
        public string? Notes { get; set; }
    }
}
