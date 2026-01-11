using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PaymentsController(ApplicationDbContext context)
        {
            _context = context;
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

        /// <summary>
        /// الحصول على جميع المدفوعات
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<PaymentsResponse>> GetPayments(
            [FromQuery] int? customerId = null,
            [FromQuery] int? invoiceId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var accountId = GetAccountId();

            var query = _context.Payments
                .Include(p => p.Customer)
                .Include(p => p.Invoice)
                .Where(p => p.AccountId == accountId)
                .AsQueryable();

            if (customerId.HasValue)
                query = query.Where(p => p.CustomerId == customerId);

            if (invoiceId.HasValue)
                query = query.Where(p => p.InvoiceId == invoiceId);

            if (fromDate.HasValue)
                query = query.Where(p => p.PaymentDate >= fromDate);

            if (toDate.HasValue)
                query = query.Where(p => p.PaymentDate <= toDate);

            var totalCount = await query.CountAsync();
            var totalAmount = await query.SumAsync(p => p.Amount);

            var payments = await query
                .OrderByDescending(p => p.PaymentDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PaymentDto
                {
                    Id = p.Id,
                    PaymentNumber = p.PaymentNumber,
                    PaymentType = p.PaymentType,
                    InvoiceId = p.InvoiceId,
                    InvoiceNumber = p.Invoice != null ? p.Invoice.InvoiceNumber : null,
                    CustomerId = p.CustomerId,
                    CustomerName = p.Customer != null ? p.Customer.Name : null,
                    Amount = p.Amount,
                    PaymentDate = p.PaymentDate,
                    PaymentMethod = p.PaymentMethod.ToString(),
                    ReferenceNumber = p.ReferenceNumber,
                    BankName = p.BankName,
                    CheckNumber = p.CheckNumber,
                    CheckDate = p.CheckDate,
                    Description = p.Description,
                    Status = p.Status,
                    Notes = p.Notes,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            return new PaymentsResponse
            {
                Payments = payments,
                TotalCount = totalCount,
                TotalAmount = totalAmount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        /// <summary>
        /// الحصول على مدفوعة بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<PaymentDto>> GetPayment(int id)
        {
            var accountId = GetAccountId();
            var payment = await _context.Payments
                .Include(p => p.Customer)
                .Include(p => p.Invoice)
                .FirstOrDefaultAsync(p => p.Id == id && p.AccountId == accountId);

            if (payment == null)
            {
                return NotFound();
            }

            return new PaymentDto
            {
                Id = payment.Id,
                PaymentNumber = payment.PaymentNumber,
                PaymentType = payment.PaymentType,
                InvoiceId = payment.InvoiceId,
                InvoiceNumber = payment.Invoice?.InvoiceNumber,
                CustomerId = payment.CustomerId,
                CustomerName = payment.Customer?.Name,
                Amount = payment.Amount,
                PaymentDate = payment.PaymentDate,
                PaymentMethod = payment.PaymentMethod.ToString(),
                ReferenceNumber = payment.ReferenceNumber,
                BankName = payment.BankName,
                CheckNumber = payment.CheckNumber,
                CheckDate = payment.CheckDate,
                Description = payment.Description,
                Status = payment.Status,
                Notes = payment.Notes,
                CreatedAt = payment.CreatedAt
            };
        }

        /// <summary>
        /// إنشاء مدفوعة جديدة
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<PaymentDto>> CreatePayment(CreatePaymentDto dto)
        {
            var accountId = GetAccountId();

            // توليد رقم المدفوعة
            var lastPayment = await _context.Payments
                .Where(p => p.AccountId == accountId)
                .OrderByDescending(p => p.Id)
                .FirstOrDefaultAsync();

            var nextNumber = (lastPayment?.Id ?? 0) + 1;

            var payment = new Payment
            {
                AccountId = accountId,
                PaymentNumber = string.IsNullOrEmpty(dto.PaymentNumber) ? $"PAY-{nextNumber:D6}" : dto.PaymentNumber,
                PaymentType = dto.PaymentType ?? "Receipt",
                InvoiceId = dto.InvoiceId,
                CustomerId = dto.CustomerId,
                Amount = dto.Amount,
                PaymentDate = dto.PaymentDate ?? DateTime.UtcNow,
                PaymentMethod = dto.PaymentMethod ?? "Cash",
                ReferenceNumber = dto.ReferenceNumber,
                BankName = dto.BankName,
                CheckNumber = dto.CheckNumber,
                CheckDate = dto.CheckDate,
                Description = dto.Description,
                Status = dto.Status ?? "Completed",
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow
            };

            _context.Payments.Add(payment);

            // تحديث المبلغ المدفوع في الفاتورة
            if (dto.InvoiceId.HasValue)
            {
                var invoice = await _context.Invoices.FindAsync(dto.InvoiceId.Value);
                if (invoice != null && invoice.AccountId == accountId)
                {
                    invoice.PaidAmount += dto.Amount;
                    if (invoice.PaidAmount >= invoice.TotalAmount)
                    {
                        invoice.Status = InvoiceStatus.Paid;
                    }
                    else if (invoice.PaidAmount > 0)
                    {
                        invoice.Status = InvoiceStatus.PartialPaid;
                    }
                }
            }

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, new PaymentDto
            {
                Id = payment.Id,
                PaymentNumber = payment.PaymentNumber,
                PaymentType = payment.PaymentType,
                InvoiceId = payment.InvoiceId,
                CustomerId = payment.CustomerId,
                Amount = payment.Amount,
                PaymentDate = payment.PaymentDate,
                PaymentMethod = payment.PaymentMethod.ToString(),
                Status = payment.Status,
                CreatedAt = payment.CreatedAt
            });
        }

        /// <summary>
        /// تحديث مدفوعة
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePayment(int id, UpdatePaymentDto dto)
        {
            var accountId = GetAccountId();
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.Id == id && p.AccountId == accountId);

            if (payment == null)
            {
                return NotFound();
            }

            // تحديث المدفوعة
            if (dto.PaymentType != null) payment.PaymentType = dto.PaymentType;
            if (dto.Amount.HasValue) payment.Amount = dto.Amount.Value;
            if (dto.PaymentDate.HasValue) payment.PaymentDate = dto.PaymentDate.Value;
            if (dto.PaymentMethod != null) payment.PaymentMethod = dto.PaymentMethod;
            if (dto.ReferenceNumber != null) payment.ReferenceNumber = dto.ReferenceNumber;
            if (dto.BankName != null) payment.BankName = dto.BankName;
            if (dto.CheckNumber != null) payment.CheckNumber = dto.CheckNumber;
            if (dto.CheckDate.HasValue) payment.CheckDate = dto.CheckDate;
            if (dto.Description != null) payment.Description = dto.Description;
            if (dto.Status != null) payment.Status = dto.Status;
            if (dto.Notes != null) payment.Notes = dto.Notes;
            payment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// حذف مدفوعة
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePayment(int id)
        {
            var accountId = GetAccountId();
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.Id == id && p.AccountId == accountId);

            if (payment == null)
            {
                return NotFound();
            }

            // إعادة المبلغ من الفاتورة إذا كانت مرتبطة
            if (payment.InvoiceId.HasValue)
            {
                var invoice = await _context.Invoices.FindAsync(payment.InvoiceId.Value);
                if (invoice != null)
                {
                    invoice.PaidAmount -= payment.Amount;
                    if (invoice.PaidAmount <= 0)
                    {
                        invoice.Status = InvoiceStatus.Draft;
                        invoice.PaidAmount = 0;
                    }
                    else if (invoice.PaidAmount < invoice.TotalAmount)
                    {
                        invoice.Status = InvoiceStatus.PartialPaid;
                    }
                }
            }

            _context.Payments.Remove(payment);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// الحصول على مدفوعات عميل معين
        /// </summary>
        [HttpGet("customer/{customerId}")]
        public async Task<ActionResult<IEnumerable<PaymentDto>>> GetCustomerPayments(
            int customerId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var accountId = GetAccountId();

            var payments = await _context.Payments
                .Include(p => p.Invoice)
                .Where(p => p.AccountId == accountId && p.CustomerId == customerId)
                .OrderByDescending(p => p.PaymentDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PaymentDto
                {
                    Id = p.Id,
                    PaymentNumber = p.PaymentNumber,
                    PaymentType = p.PaymentType,
                    InvoiceId = p.InvoiceId,
                    InvoiceNumber = p.Invoice != null ? p.Invoice.InvoiceNumber : null,
                    CustomerId = p.CustomerId,
                    Amount = p.Amount,
                    PaymentDate = p.PaymentDate,
                    PaymentMethod = p.PaymentMethod.ToString(),
                    ReferenceNumber = p.ReferenceNumber,
                    Status = p.Status,
                    Notes = p.Notes,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            return payments;
        }

        /// <summary>
        /// الحصول على مدفوعات فاتورة معينة
        /// </summary>
        [HttpGet("invoice/{invoiceId}")]
        public async Task<ActionResult<IEnumerable<PaymentDto>>> GetInvoicePayments(int invoiceId)
        {
            var accountId = GetAccountId();

            var payments = await _context.Payments
                .Include(p => p.Customer)
                .Where(p => p.AccountId == accountId && p.InvoiceId == invoiceId)
                .OrderByDescending(p => p.PaymentDate)
                .Select(p => new PaymentDto
                {
                    Id = p.Id,
                    PaymentNumber = p.PaymentNumber,
                    PaymentType = p.PaymentType,
                    InvoiceId = p.InvoiceId,
                    CustomerId = p.CustomerId,
                    CustomerName = p.Customer != null ? p.Customer.Name : null,
                    Amount = p.Amount,
                    PaymentDate = p.PaymentDate,
                    PaymentMethod = p.PaymentMethod.ToString(),
                    ReferenceNumber = p.ReferenceNumber,
                    Status = p.Status,
                    Notes = p.Notes,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            return payments;
        }

        /// <summary>
        /// ملخص المدفوعات
        /// </summary>
        [HttpGet("summary")]
        public async Task<ActionResult<PaymentsSummary>> GetPaymentsSummary(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var accountId = GetAccountId();

            var query = _context.Payments
                .Where(p => p.AccountId == accountId);

            if (fromDate.HasValue)
                query = query.Where(p => p.PaymentDate >= fromDate);

            if (toDate.HasValue)
                query = query.Where(p => p.PaymentDate <= toDate);

            var payments = await query.ToListAsync();

            return new PaymentsSummary
            {
                TotalPayments = payments.Count,
                TotalAmount = payments.Sum(p => p.Amount),
                CashAmount = payments.Where(p => p.PaymentMethod == "Cash").Sum(p => p.Amount),
                BankTransferAmount = payments.Where(p => p.PaymentMethod == "BankTransfer").Sum(p => p.Amount),
                CheckAmount = payments.Where(p => p.PaymentMethod == "Cheque").Sum(p => p.Amount),
                CardAmount = payments.Where(p => p.PaymentMethod == "Card").Sum(p => p.Amount),
                ByMethod = payments
                    .GroupBy(p => p.PaymentMethod ?? "Cash")
                    .Select(g => new PaymentMethodSummary
                    {
                        Method = g.Key,
                        Count = g.Count(),
                        Amount = g.Sum(p => p.Amount)
                    })
                    .ToList()
            };
        }
    }

    // DTOs
    public class PaymentDto
    {
        public int Id { get; set; }
        public string? PaymentNumber { get; set; }
        public string? PaymentType { get; set; }
        public int? InvoiceId { get; set; }
        public string? InvoiceNumber { get; set; }
        public int? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string PaymentMethod { get; set; } = "Cash";
        public string? ReferenceNumber { get; set; }
        public string? BankName { get; set; }
        public string? CheckNumber { get; set; }
        public DateTime? CheckDate { get; set; }
        public string? Description { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePaymentDto
    {
        public string? PaymentNumber { get; set; }
        public string? PaymentType { get; set; }
        public int? InvoiceId { get; set; }
        public int? CustomerId { get; set; }
        public decimal Amount { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string PaymentMethod { get; set; } = "Cash";
        public string? ReferenceNumber { get; set; }
        public string? BankName { get; set; }
        public string? CheckNumber { get; set; }
        public DateTime? CheckDate { get; set; }
        public string? Description { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdatePaymentDto
    {
        public string? PaymentType { get; set; }
        public decimal? Amount { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? PaymentMethod { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? BankName { get; set; }
        public string? CheckNumber { get; set; }
        public DateTime? CheckDate { get; set; }
        public string? Description { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
    }

    public class PaymentsResponse
    {
        public List<PaymentDto> Payments { get; set; } = new();
        public int TotalCount { get; set; }
        public decimal TotalAmount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class PaymentsSummary
    {
        public int TotalPayments { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal CashAmount { get; set; }
        public decimal BankTransferAmount { get; set; }
        public decimal CheckAmount { get; set; }
        public decimal CardAmount { get; set; }
        public List<PaymentMethodSummary> ByMethod { get; set; } = new();
    }

    public class PaymentMethodSummary
    {
        public string Method { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal Amount { get; set; }
    }
}
