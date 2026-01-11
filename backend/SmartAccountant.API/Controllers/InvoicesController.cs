using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Models.DTOs;
using SmartAccountant.API.Services;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InvoicesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;

        public InvoicesController(ApplicationDbContext context, IActivityLogService activityLog)
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
        /// الحصول على جميع الفواتير
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Invoice>>> GetInvoices(
            [FromQuery] InvoiceType? type,
            [FromQuery] InvoiceStatus? status,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int? customerId)
        {
            var accountId = GetAccountId();
            var query = _context.Invoices
                .Include(i => i.Customer)
                .Include(i => i.Items)
                .Where(i => i.AccountId == accountId)
                .AsQueryable();

            if (type.HasValue)
                query = query.Where(i => i.InvoiceType == type.Value);

            if (status.HasValue)
                query = query.Where(i => i.Status == status.Value);

            if (fromDate.HasValue)
                query = query.Where(i => i.InvoiceDate >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(i => i.InvoiceDate <= toDate.Value);

            if (customerId.HasValue)
                query = query.Where(i => i.CustomerId == customerId.Value);

            return await query.OrderByDescending(i => i.InvoiceDate)
                .ThenByDescending(i => i.Id)
                .ToListAsync();
        }

        /// <summary>
        /// الحصول على فاتورة بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Invoice>> GetInvoice(int id)
        {
            var accountId = GetAccountId();
            var invoice = await _context.Invoices
                .Include(i => i.Customer)
                .Include(i => i.User)
                .Include(i => i.Items)
                .ThenInclude(l => l.Product)
                .Include(i => i.Items)
                .ThenInclude(l => l.Unit)
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.Id == id && i.AccountId == accountId);

            if (invoice == null)
            {
                return NotFound();
            }

            return invoice;
        }

        /// <summary>
        /// إنشاء فاتورة جديدة
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Invoice>> CreateInvoice([FromBody] CreateInvoiceDto dto)
        {
            var accountId = GetAccountId();
            
            // فلترة البنود ذات ProductId صحيح فقط
            var validItems = dto.Items.Where(i => i.ProductId > 0).ToList();
            
            // تحويل الـ DTO إلى Invoice
            var invoice = new Invoice
            {
                AccountId = accountId,
                InvoiceType = dto.InvoiceType,
                CustomerId = dto.CustomerId,
                InvoiceDate = dto.InvoiceDate,
                DueDate = dto.DueDate,
                Notes = dto.Notes,
                DiscountPercent = dto.DiscountPercent,
                DiscountAmount = dto.DiscountAmount,
                PaymentMethod = dto.PaymentMethod,
                PaidAmount = dto.PaidAmount, // المبلغ المدفوع
                Status = InvoiceStatus.Draft,
                Items = validItems.Select(i => new InvoiceItem
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    UnitId = i.UnitId,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    DiscountPercent = i.DiscountPercent,
                    DiscountAmount = i.DiscountAmount,
                    TaxPercent = i.TaxPercent
                }).ToList()
            };

            // حساب إجماليات البنود
            decimal subTotal = 0;
            decimal taxTotal = 0;
            decimal discountTotal = 0;

            foreach (var item in invoice.Items)
            {
                // حفظ اسم المنتج
                if (string.IsNullOrEmpty(item.ProductName))
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    item.ProductName = product?.Name ?? "";
                }

                var lineSubTotal = item.Quantity * item.UnitPrice;
                
                // حساب الخصم
                if (item.DiscountPercent > 0)
                {
                    item.DiscountAmount = lineSubTotal * (item.DiscountPercent / 100);
                }
                var lineAfterDiscount = lineSubTotal - item.DiscountAmount;
                
                // حساب الضريبة
                item.TaxAmount = lineAfterDiscount * (item.TaxPercent / 100);
                item.LineTotal = lineAfterDiscount + item.TaxAmount;

                subTotal += lineSubTotal;
                discountTotal += item.DiscountAmount;
                taxTotal += item.TaxAmount;
            }

            invoice.SubTotal = subTotal;
            
            // حساب خصم الفاتورة الإضافي
            if (invoice.DiscountPercent > 0)
            {
                invoice.DiscountAmount = (subTotal - discountTotal) * (invoice.DiscountPercent / 100) + discountTotal;
            }
            else
            {
                invoice.DiscountAmount = discountTotal;
            }
            
            invoice.TaxAmount = taxTotal;
            invoice.TotalAmount = subTotal - invoice.DiscountAmount + taxTotal;
            invoice.CreatedAt = DateTime.UtcNow;

            // توليد رقم الفاتورة بصيغة: سنة-شهر-رقم تسلسلي (مثل: 2026-01-000010)
            // الرقم التسلسلي يبدأ من 1 في كل شهر جديد
            var currentYear = DateTime.UtcNow.Year;
            var currentMonth = DateTime.UtcNow.Month;
            var monthPrefix = $"{currentYear}-{currentMonth:D2}-";
            
            var lastInvoiceThisMonth = await _context.Invoices
                .Where(i => i.AccountId == accountId && i.InvoiceNumber.StartsWith(monthPrefix))
                .OrderByDescending(i => i.InvoiceNumber)
                .FirstOrDefaultAsync();

            int nextNumber = 1;
            if (lastInvoiceThisMonth != null && lastInvoiceThisMonth.InvoiceNumber.Length >= 14)
            {
                // استخراج الرقم التسلسلي من آخر فاتورة (آخر 6 أرقام)
                var lastNumberStr = lastInvoiceThisMonth.InvoiceNumber.Substring(8);
                if (int.TryParse(lastNumberStr, out int lastNumber))
                {
                    nextNumber = lastNumber + 1;
                }
            }
            
            invoice.InvoiceNumber = $"{monthPrefix}{nextNumber:D6}";

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            var invoiceTypeName = invoice.InvoiceType == InvoiceType.Sales ? "مبيعات" : "مرتجعات";
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.CreateInvoice, EntityTypes.Invoice,
                invoice.Id, invoice.InvoiceNumber, $"تم إنشاء فاتورة {invoiceTypeName}: {invoice.InvoiceNumber} - الإجمالي: {invoice.TotalAmount:N2}");

            return CreatedAtAction(nameof(GetInvoice), new { id = invoice.Id }, invoice);
        }

        /// <summary>
        /// تحديث فاتورة
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateInvoice(int id, [FromBody] CreateInvoiceDto dto)
        {
            var accountId = GetAccountId();
            var invoice = await _context.Invoices
                .Include(i => i.Items)
                .FirstOrDefaultAsync(i => i.Id == id && i.AccountId == accountId);

            if (invoice == null)
            {
                return NotFound();
            }

            // لا يمكن تعديل فاتورة مؤكدة أو مدفوعة
            if (invoice.Status != InvoiceStatus.Draft)
            {
                return BadRequest("لا يمكن تعديل هذه الفاتورة في حالتها الحالية");
            }

            // التحقق من صحة ProductId لكل بند
            foreach (var item in dto.Items)
            {
                if (item.ProductId > 0)
                {
                    var productExists = await _context.Products.AnyAsync(p => p.Id == item.ProductId);
                    if (!productExists)
                    {
                        return BadRequest($"المنتج برقم {item.ProductId} غير موجود");
                    }
                }
            }

            // تحديث بيانات الفاتورة
            invoice.InvoiceType = dto.InvoiceType;
            invoice.CustomerId = dto.CustomerId;
            invoice.InvoiceDate = dto.InvoiceDate;
            invoice.DueDate = dto.DueDate;
            invoice.Notes = dto.Notes;
            invoice.DiscountPercent = dto.DiscountPercent;
            invoice.PaymentMethod = dto.PaymentMethod;
            invoice.PaidAmount = dto.PaidAmount; // تحديث المبلغ المدفوع
            invoice.UpdatedAt = DateTime.UtcNow;

            // حذف البنود القديمة
            _context.InvoiceItems.RemoveRange(invoice.Items);

            // فلترة البنود ذات ProductId صحيح فقط
            var validItems = dto.Items.Where(i => i.ProductId > 0).ToList();

            // إضافة البنود الجديدة
            invoice.Items = validItems.Select(i => new InvoiceItem
            {
                ProductId = i.ProductId,
                ProductName = i.ProductName,
                UnitId = i.UnitId,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                DiscountPercent = i.DiscountPercent,
                DiscountAmount = i.DiscountAmount,
                TaxPercent = i.TaxPercent
            }).ToList();

            // حساب إجماليات البنود
            decimal subTotal = 0;
            decimal taxTotal = 0;
            decimal discountTotal = 0;

            foreach (var item in invoice.Items)
            {
                if (string.IsNullOrEmpty(item.ProductName))
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    item.ProductName = product?.Name ?? "";
                }

                var lineSubTotal = item.Quantity * item.UnitPrice;
                
                if (item.DiscountPercent > 0)
                {
                    item.DiscountAmount = lineSubTotal * (item.DiscountPercent / 100);
                }
                var lineAfterDiscount = lineSubTotal - item.DiscountAmount;
                
                item.TaxAmount = lineAfterDiscount * (item.TaxPercent / 100);
                item.LineTotal = lineAfterDiscount + item.TaxAmount;

                subTotal += lineSubTotal;
                discountTotal += item.DiscountAmount;
                taxTotal += item.TaxAmount;
            }

            invoice.SubTotal = subTotal;
            
            if (invoice.DiscountPercent > 0)
            {
                invoice.DiscountAmount = (subTotal - discountTotal) * (invoice.DiscountPercent / 100) + discountTotal;
            }
            else
            {
                invoice.DiscountAmount = discountTotal;
            }
            
            invoice.TaxAmount = taxTotal;
            invoice.TotalAmount = subTotal - invoice.DiscountAmount + taxTotal;

            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.UpdateInvoice, EntityTypes.Invoice,
                invoice.Id, invoice.InvoiceNumber, $"تم تعديل الفاتورة: {invoice.InvoiceNumber}");

            return Ok(invoice);
        }

        /// <summary>
        /// تأكيد فاتورة
        /// </summary>
        [HttpPost("{id}/confirm")]
        public async Task<IActionResult> ConfirmInvoice(int id)
        {
            var accountId = GetAccountId();
            var invoice = await _context.Invoices
                .Include(i => i.Items)
                .FirstOrDefaultAsync(i => i.Id == id && i.AccountId == accountId);

            if (invoice == null)
            {
                return NotFound();
            }

            if (invoice.Status != InvoiceStatus.Draft)
            {
                return BadRequest("لا يمكن تأكيد هذه الفاتورة في حالتها الحالية");
            }

            // تحديث المخزون
            foreach (var item in invoice.Items)
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null)
                {
                    if (invoice.InvoiceType == InvoiceType.Sales)
                    {
                        product.StockQuantity -= item.Quantity;
                    }
                    else if (invoice.InvoiceType == InvoiceType.SalesReturn)
                    {
                        product.StockQuantity += item.Quantity;
                    }
                }
            }

            // تحديث رصيد العميل
            if (invoice.CustomerId.HasValue && invoice.PaymentMethod == PaymentMethod.Credit)
            {
                var customer = await _context.Customers.FindAsync(invoice.CustomerId.Value);
                if (customer != null)
                {
                    if (invoice.InvoiceType == InvoiceType.Sales)
                    {
                        customer.Balance += invoice.TotalAmount;
                    }
                    else if (invoice.InvoiceType == InvoiceType.SalesReturn)
                    {
                        customer.Balance -= invoice.TotalAmount;
                    }
                }
            }

            invoice.Status = InvoiceStatus.Confirmed;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), "تأكيد فاتورة", EntityTypes.Invoice,
                invoice.Id, invoice.InvoiceNumber, $"تم تأكيد الفاتورة: {invoice.InvoiceNumber} - الإجمالي: {invoice.TotalAmount:N2}");

            return NoContent();
        }

        /// <summary>
        /// إلغاء تأكيد فاتورة (تحويلها لمسودة)
        /// </summary>
        [HttpPost("{id}/unconfirm")]
        public async Task<IActionResult> UnconfirmInvoice(int id)
        {
            var accountId = GetAccountId();
            var invoice = await _context.Invoices
                .Include(i => i.Items)
                .FirstOrDefaultAsync(i => i.Id == id && i.AccountId == accountId);

            if (invoice == null)
            {
                return NotFound();
            }

            // التحقق من حالة الفاتورة
            if (invoice.Status == InvoiceStatus.Draft)
            {
                return BadRequest("الفاتورة مسودة بالفعل");
            }

            if (invoice.Status == InvoiceStatus.Cancelled)
            {
                return BadRequest("لا يمكن إلغاء تأكيد فاتورة ملغاة");
            }

            // التحقق من وجود دفعات
            if (invoice.PaidAmount > 0)
            {
                return BadRequest("لا يمكن إلغاء تأكيد فاتورة عليها دفعات. قم بحذف الدفعات أولاً");
            }

            // إعادة المخزون إذا كانت الفاتورة مؤكدة
            if (invoice.Status == InvoiceStatus.Confirmed || invoice.Status == InvoiceStatus.Paid || invoice.Status == InvoiceStatus.PartialPaid)
            {
                foreach (var item in invoice.Items)
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product != null)
                    {
                        if (invoice.InvoiceType == InvoiceType.Sales)
                        {
                            product.StockQuantity += item.Quantity; // إعادة الكمية للمخزون
                        }
                        else if (invoice.InvoiceType == InvoiceType.SalesReturn)
                        {
                            product.StockQuantity -= item.Quantity;
                        }
                    }
                }

                // إعادة رصيد العميل إذا كانت آجلة
                if (invoice.CustomerId.HasValue && invoice.PaymentMethod == PaymentMethod.Credit)
                {
                    var customer = await _context.Customers.FindAsync(invoice.CustomerId.Value);
                    if (customer != null)
                    {
                        if (invoice.InvoiceType == InvoiceType.Sales)
                        {
                            customer.Balance -= invoice.TotalAmount;
                        }
                        else if (invoice.InvoiceType == InvoiceType.SalesReturn)
                        {
                            customer.Balance += invoice.TotalAmount;
                        }
                    }
                }
            }

            invoice.Status = InvoiceStatus.Draft;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), "إلغاء تأكيد فاتورة", EntityTypes.Invoice,
                invoice.Id, invoice.InvoiceNumber, $"تم إلغاء تأكيد الفاتورة: {invoice.InvoiceNumber} وتحويلها لمسودة");

            return NoContent();
        }

        /// <summary>
        /// إضافة دفعة للفاتورة
        /// </summary>
        [HttpPost("{id}/payments")]
        public async Task<ActionResult<Payment>> AddPayment(int id, Payment payment)
        {
            var accountId = GetAccountId();
            var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == id && i.AccountId == accountId);
            if (invoice == null)
            {
                return NotFound();
            }

            if (invoice.Status == InvoiceStatus.Cancelled)
            {
                return BadRequest("لا يمكن إضافة دفعة لفاتورة ملغاة");
            }

            payment.InvoiceId = id;
            payment.CreatedAt = DateTime.UtcNow;

            _context.Payments.Add(payment);

            // تحديث المبلغ المدفوع
            invoice.PaidAmount += payment.Amount;
            
            // تحديث حالة الفاتورة
            if (invoice.PaidAmount >= invoice.TotalAmount)
            {
                invoice.Status = InvoiceStatus.Paid;
            }
            else if (invoice.PaidAmount > 0)
            {
                invoice.Status = InvoiceStatus.PartialPaid;
            }

            // تحديث رصيد العميل
            if (invoice.CustomerId.HasValue)
            {
                var customer = await _context.Customers.FindAsync(invoice.CustomerId.Value);
                if (customer != null)
                {
                    customer.Balance -= payment.Amount;
                }
            }

            invoice.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.CreatePayment, EntityTypes.Payment,
                payment.Id, invoice.InvoiceNumber, $"تم إضافة دفعة {payment.Amount:N2} للفاتورة: {invoice.InvoiceNumber}");

            return CreatedAtAction(nameof(GetInvoice), new { id = id }, payment);
        }

        /// <summary>
        /// حذف دفعة من الفاتورة
        /// </summary>
        [HttpDelete("{invoiceId}/payments/{paymentId}")]
        public async Task<IActionResult> DeletePayment(int invoiceId, int paymentId)
        {
            var accountId = GetAccountId();
            var invoice = await _context.Invoices
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.Id == invoiceId && i.AccountId == accountId);

            if (invoice == null)
            {
                return NotFound("الفاتورة غير موجودة");
            }

            var payment = invoice.Payments?.FirstOrDefault(p => p.Id == paymentId);
            if (payment == null)
            {
                return NotFound("الدفعة غير موجودة");
            }

            // حفظ مبلغ الدفعة قبل الحذف
            var paymentAmount = payment.Amount;

            // حذف الدفعة
            _context.Payments.Remove(payment);

            // تحديث المبلغ المدفوع
            invoice.PaidAmount -= paymentAmount;
            if (invoice.PaidAmount < 0) invoice.PaidAmount = 0;

            // تحديث حالة الفاتورة
            if (invoice.PaidAmount >= invoice.TotalAmount)
            {
                invoice.Status = InvoiceStatus.Paid;
            }
            else if (invoice.PaidAmount > 0)
            {
                invoice.Status = InvoiceStatus.PartialPaid;
            }
            else
            {
                invoice.Status = InvoiceStatus.Confirmed;
            }

            // تحديث رصيد العميل (إعادة المبلغ)
            if (invoice.CustomerId.HasValue)
            {
                var customer = await _context.Customers.FindAsync(invoice.CustomerId.Value);
                if (customer != null)
                {
                    customer.Balance += paymentAmount;
                }
            }

            invoice.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), "حذف دفعة", EntityTypes.Payment,
                paymentId, invoice.InvoiceNumber, $"تم حذف دفعة {paymentAmount:N2} من الفاتورة: {invoice.InvoiceNumber}");

            return NoContent();
        }

        /// <summary>
        /// إلغاء فاتورة
        /// </summary>
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> CancelInvoice(int id)
        {
            var accountId = GetAccountId();
            var invoice = await _context.Invoices
                .Include(i => i.Items)
                .FirstOrDefaultAsync(i => i.Id == id && i.AccountId == accountId);

            if (invoice == null)
            {
                return NotFound();
            }

            if (invoice.Status == InvoiceStatus.Cancelled)
            {
                return BadRequest("الفاتورة ملغاة مسبقاً");
            }

            // إعادة المخزون إذا كانت مؤكدة
            if (invoice.Status != InvoiceStatus.Draft)
            {
                foreach (var item in invoice.Items)
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product != null)
                    {
                        if (invoice.InvoiceType == InvoiceType.Sales)
                        {
                            product.StockQuantity += item.Quantity;
                        }
                    }
                }

                // إعادة رصيد العميل
                if (invoice.CustomerId.HasValue)
                {
                    var customer = await _context.Customers.FindAsync(invoice.CustomerId.Value);
                    if (customer != null)
                    {
                        customer.Balance -= (invoice.TotalAmount - invoice.PaidAmount);
                    }
                }
            }

            invoice.Status = InvoiceStatus.Cancelled;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), "إلغاء فاتورة", EntityTypes.Invoice,
                invoice.Id, invoice.InvoiceNumber, $"تم إلغاء الفاتورة: {invoice.InvoiceNumber}");

            return NoContent();
        }

        /// <summary>
        /// حذف فاتورة (مسودة فقط)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInvoice(int id)
        {
            var accountId = GetAccountId();
            var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == id && i.AccountId == accountId);
            if (invoice == null)
            {
                return NotFound();
            }

            if (invoice.Status != InvoiceStatus.Draft)
            {
                return BadRequest("لا يمكن حذف فاتورة مؤكدة، يمكنك إلغاؤها فقط");
            }

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.DeleteInvoice, EntityTypes.Invoice,
                invoice.Id, invoice.InvoiceNumber, $"تم حذف الفاتورة: {invoice.InvoiceNumber}");

            _context.Invoices.Remove(invoice);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// ملخص المبيعات
        /// </summary>
        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetSalesSummary(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var accountId = GetAccountId();
            var invoices = await _context.Invoices
                .Where(i => i.AccountId == accountId
                    && i.InvoiceType == InvoiceType.Sales
                    && i.InvoiceDate >= fromDate
                    && i.InvoiceDate <= toDate
                    && i.Status != InvoiceStatus.Cancelled)
                .ToListAsync();

            var dailySales = invoices
                .GroupBy(i => i.InvoiceDate.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    Count = g.Count(),
                    Total = g.Sum(i => i.TotalAmount)
                })
                .OrderBy(d => d.Date)
                .ToList();

            return new
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalInvoices = invoices.Count,
                TotalSales = invoices.Sum(i => i.TotalAmount),
                TotalTax = invoices.Sum(i => i.TaxAmount),
                TotalDiscount = invoices.Sum(i => i.DiscountAmount),
                TotalPaid = invoices.Sum(i => i.PaidAmount),
                TotalUnpaid = invoices.Sum(i => i.TotalAmount - i.PaidAmount),
                DailySales = dailySales
            };
        }
    }
}
