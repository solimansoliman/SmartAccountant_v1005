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
        private readonly ICustomerInputLimitsService _inputLimitsService;

        public InvoicesController(
            ApplicationDbContext context,
            IActivityLogService activityLog,
            ICustomerInputLimitsService inputLimitsService)
        {
            _context = context;
            _activityLog = activityLog;
            _inputLimitsService = inputLimitsService;
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

        private static InvoiceStatus ResolveInvoiceStatus(Invoice invoice)
        {
            if (invoice.PaidAmount >= invoice.TotalAmount && invoice.TotalAmount > 0)
            {
                return InvoiceStatus.Paid;
            }

            if (invoice.PaidAmount > 0)
            {
                return InvoiceStatus.PartialPaid;
            }

            if (invoice.Status == InvoiceStatus.Draft || invoice.Status == InvoiceStatus.Cancelled)
            {
                return invoice.Status;
            }

            return InvoiceStatus.Confirmed;
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

            IQueryable<Invoice> query = _context.Invoices
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

            try
            {
                return await query.OrderByDescending(i => i.InvoiceDate)
                    .ThenByDescending(i => i.Id)
                    .ToListAsync();
            }
            catch
            {
                // Fallback for legacy schemas missing optional relationship columns.
                var fallbackQuery = _context.Invoices
                    .Where(i => i.AccountId == accountId)
                    .AsQueryable();

                if (type.HasValue)
                    fallbackQuery = fallbackQuery.Where(i => i.InvoiceType == type.Value);

                if (status.HasValue)
                    fallbackQuery = fallbackQuery.Where(i => i.Status == status.Value);

                if (fromDate.HasValue)
                    fallbackQuery = fallbackQuery.Where(i => i.InvoiceDate >= fromDate.Value);

                if (toDate.HasValue)
                    fallbackQuery = fallbackQuery.Where(i => i.InvoiceDate <= toDate.Value);

                if (customerId.HasValue)
                    fallbackQuery = fallbackQuery.Where(i => i.CustomerId == customerId.Value);

                return await fallbackQuery
                    .OrderByDescending(i => i.InvoiceDate)
                    .ThenByDescending(i => i.Id)
                    .ToListAsync();
            }
        }

        /// <summary>
        /// الحصول على فاتورة بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Invoice>> GetInvoice(int id)
        {
            var accountId = GetAccountId();

            try
            {
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
            catch
            {
                // Fallback for legacy schemas missing optional relationship columns.
                var fallbackInvoice = await _context.Invoices
                    .Include(i => i.Customer)
                    .Include(i => i.Items)
                    .FirstOrDefaultAsync(i => i.Id == id && i.AccountId == accountId);

                if (fallbackInvoice == null)
                {
                    return NotFound();
                }

                return fallbackInvoice;
            }
        }

        /// <summary>
        /// إنشاء فاتورة جديدة
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Invoice>> CreateInvoice([FromBody] CreateInvoiceDto dto)
        {
            var accountId = GetAccountId();
            var limits = await _inputLimitsService.GetLimitsAsync(accountId);

            if (!string.IsNullOrEmpty(dto.Notes) && dto.Notes.Length > limits.InvoiceNotesMaxLength)
            {
                return BadRequest(new { message = $"ملاحظات الفاتورة تتجاوز الحد المسموح ({limits.InvoiceNotesMaxLength})" });
            }
            
            // فلترة البنود ذات ProductId صحيح فقط
            var validItems = dto.Items.Where(i => i.ProductId > 0).ToList();

            if (!validItems.Any())
            {
                return BadRequest(new { message = "الفاتورة يجب أن تحتوي على بند منتج واحد على الأقل" });
            }

            int? customerId = null;
            if (dto.CustomerId > 0)
            {
                customerId = dto.CustomerId;
                var customerExists = await _context.Customers
                    .AnyAsync(c => c.Id == customerId.Value && c.AccountId == accountId && c.IsActive);
                if (!customerExists)
                {
                    return BadRequest(new { message = "العميل المحدد غير موجود ضمن الحساب الحالي" });
                }
            }

            var productIds = validItems.Select(i => i.ProductId).Distinct().ToList();
            var productsById = await _context.Products
                .Where(p => p.AccountId == accountId && productIds.Contains(p.Id) && p.IsActive)
                .ToDictionaryAsync(p => p.Id);

            if (productsById.Count != productIds.Count)
            {
                return BadRequest(new { message = "يوجد منتج واحد أو أكثر غير موجود ضمن الحساب الحالي" });
            }

            var unitIds = validItems
                .Where(i => i.UnitId.HasValue && i.UnitId.Value > 0)
                .Select(i => i.UnitId!.Value)
                .Distinct()
                .ToList();

            if (unitIds.Any())
            {
                var unitsCount = await _context.Units
                    .CountAsync(u => u.AccountId == accountId && u.IsActive && unitIds.Contains(u.Id));

                if (unitsCount != unitIds.Count)
                {
                    return BadRequest(new { message = "يوجد وحدة واحدة أو أكثر غير موجودة ضمن الحساب الحالي" });
                }
            }
            
            // تحويل الـ DTO إلى Invoice
            var invoice = new Invoice
            {
                AccountId = accountId,
                InvoiceType = dto.InvoiceType,
                CustomerId = customerId,
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
                    ProductName = string.IsNullOrWhiteSpace(i.ProductName) ? productsById[i.ProductId].Name ?? string.Empty : i.ProductName,
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
                    var product = productsById[item.ProductId];
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
            var limits = await _inputLimitsService.GetLimitsAsync(accountId);

            if (!string.IsNullOrEmpty(dto.Notes) && dto.Notes.Length > limits.InvoiceNotesMaxLength)
            {
                return BadRequest(new { message = $"ملاحظات الفاتورة تتجاوز الحد المسموح ({limits.InvoiceNotesMaxLength})" });
            }

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
                    var productExists = await _context.Products.AnyAsync(p => p.Id == item.ProductId && p.AccountId == accountId && p.IsActive);
                    if (!productExists)
                    {
                        return BadRequest($"المنتج برقم {item.ProductId} غير موجود ضمن الحساب الحالي");
                    }
                }

                if (item.UnitId.HasValue && item.UnitId.Value > 0)
                {
                    var unitExists = await _context.Units.AnyAsync(u => u.Id == item.UnitId.Value && u.AccountId == accountId && u.IsActive);
                    if (!unitExists)
                    {
                        return BadRequest($"الوحدة برقم {item.UnitId.Value} غير موجودة ضمن الحساب الحالي");
                    }
                }
            }

            int? customerId = null;
            if (dto.CustomerId > 0)
            {
                customerId = dto.CustomerId;
                var customerExists = await _context.Customers
                    .AnyAsync(c => c.Id == customerId.Value && c.AccountId == accountId && c.IsActive);
                if (!customerExists)
                {
                    return BadRequest(new { message = "العميل المحدد غير موجود ضمن الحساب الحالي" });
                }
            }

            // تحديث بيانات الفاتورة
            invoice.InvoiceType = dto.InvoiceType;
            invoice.CustomerId = customerId;
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
                    var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId && p.AccountId == accountId);
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
                var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId && p.AccountId == accountId);
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
                var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == invoice.CustomerId.Value && c.AccountId == accountId);
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
                    var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId && p.AccountId == accountId);
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
                    var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == invoice.CustomerId.Value && c.AccountId == accountId);
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

            if (payment.Amount <= 0)
            {
                return BadRequest("قيمة الدفعة يجب أن تكون أكبر من صفر");
            }

            if (invoice.PaidAmount + payment.Amount > invoice.TotalAmount)
            {
                return BadRequest("قيمة الدفعة تتجاوز المبلغ المتبقي في الفاتورة");
            }

            if (invoice.CustomerId.HasValue)
            {
                payment.CustomerId ??= invoice.CustomerId;
            }

            if (payment.CustomerId.HasValue)
            {
                if (invoice.CustomerId.HasValue && payment.CustomerId.Value != invoice.CustomerId.Value)
                {
                    return BadRequest("العميل في الدفعة لا يطابق عميل الفاتورة");
                }

                var customerExists = await _context.Customers
                    .AnyAsync(c => c.Id == payment.CustomerId.Value && c.AccountId == accountId);
                if (!customerExists)
                {
                    return BadRequest("العميل المحدد غير موجود ضمن الحساب الحالي");
                }
            }

            payment.InvoiceId = id;
            payment.AccountId = accountId;
            payment.CreatedAt = DateTime.UtcNow;

            _context.Payments.Add(payment);

            // تحديث المبلغ المدفوع
            invoice.PaidAmount += payment.Amount;
            
            // تحديث حالة الفاتورة
            invoice.Status = ResolveInvoiceStatus(invoice);

            // تحديث رصيد العميل
            if (invoice.CustomerId.HasValue)
            {
                var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == invoice.CustomerId.Value && c.AccountId == accountId);
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

            var payment = invoice.Payments?.FirstOrDefault(p => p.Id == paymentId && p.AccountId == accountId);
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
            invoice.Status = ResolveInvoiceStatus(invoice);

            // تحديث رصيد العميل (إعادة المبلغ)
            if (invoice.CustomerId.HasValue)
            {
                var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == invoice.CustomerId.Value && c.AccountId == accountId);
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
                    var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId && p.AccountId == accountId);
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
                    var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == invoice.CustomerId.Value && c.AccountId == accountId);
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

            // Legacy schemas may miss cascade constraints, so remove dependents explicitly.
            var invoiceItems = await _context.InvoiceItems
                .Where(ii => ii.InvoiceId == invoice.Id)
                .ToListAsync();
            if (invoiceItems.Count > 0)
            {
                _context.InvoiceItems.RemoveRange(invoiceItems);
            }

            var linkedPayments = await _context.Payments
                .Where(p => p.InvoiceId == invoice.Id && p.AccountId == accountId)
                .ToListAsync();
            if (linkedPayments.Count > 0)
            {
                _context.Payments.RemoveRange(linkedPayments);
            }

            _context.Invoices.Remove(invoice);
            await _context.SaveChangesAsync();

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId(), ActivityActions.DeleteInvoice, EntityTypes.Invoice,
                invoice.Id, invoice.InvoiceNumber, $"تم حذف الفاتورة: {invoice.InvoiceNumber}");

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

        /// <summary>
        /// الحصول على صورة QR Code للفاتورة
        /// </summary>
        [HttpGet("{id}/qrcode")]
        public async Task<IActionResult> GetInvoiceQrCode(int id)
        {
            try
            {
                var accountId = GetAccountId();
                var invoice = await _context.Invoices
                    .FirstOrDefaultAsync(i => i.Id == id && i.AccountId == accountId);

                if (invoice == null)
                    return NotFound(new { message = "الفاتورة غير موجودة" });

                var qrCodeService = new QrCodeService(HttpContext.RequestServices.GetRequiredService<IConfiguration>(),
                    HttpContext.RequestServices.GetRequiredService<ILogger<QrCodeService>>());
                var qrCodeImage = qrCodeService.GenerateInvoiceQrCode(id, invoice.InvoiceNumber);

                return File(qrCodeImage, "image/png", $"invoice-{id}-qr.png");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "خطأ في إنشاء QR Code", error = ex.Message });
            }
        }

        /// <summary>
        /// الحصول على رابط QR Code (بدون الصورة)
        /// </summary>
        [HttpGet("{id}/qr-url")]
        public async Task<IActionResult> GetInvoiceQrUrl(int id)
        {
            try
            {
                var accountId = GetAccountId();
                var invoice = await _context.Invoices
                    .FirstOrDefaultAsync(i => i.Id == id && i.AccountId == accountId);

                if (invoice == null)
                    return NotFound(new { message = "الفاتورة غير موجودة" });

                var qrCodeService = new QrCodeService(HttpContext.RequestServices.GetRequiredService<IConfiguration>(),
                    HttpContext.RequestServices.GetRequiredService<ILogger<QrCodeService>>());
                var qrUrl = qrCodeService.GetQrUrl(id, invoice.InvoiceNumber);

                return Ok(new { qrUrl, invoiceId = id, invoiceNumber = invoice.InvoiceNumber });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "خطأ في إنشاء رابط QR", error = ex.Message });
            }
        }

        /// <summary>
        /// التحقق من صحة الفاتورة عند مسح QR Code
        /// </summary>
        [HttpGet("{id}/verify")]
        public async Task<IActionResult> VerifyInvoice(int id, [FromQuery] string @ref)
        {
            try
            {
                if (string.IsNullOrEmpty(@ref))
                    return BadRequest(new { message = "رمز التحقق مفقود" });

                var invoice = await _context.Invoices
                    .Include(i => i.Customer)
                    .Include(i => i.Account)
                    .FirstOrDefaultAsync(i => i.Id == id);

                if (invoice == null)
                    return NotFound(new { message = "الفاتورة غير موجودة" });

                var qrCodeService = new QrCodeService(HttpContext.RequestServices.GetRequiredService<IConfiguration>(),
                    HttpContext.RequestServices.GetRequiredService<ILogger<QrCodeService>>());

                if (!qrCodeService.VerifyHash(id, invoice.InvoiceNumber, @ref))
                    return BadRequest(new { message = "فاتورة غير صحيحة أو منتهية الصلاحية" });

                // تسجيل الوصول
                await _activityLog.LogAsync(
                    GetAccountId(),
                    GetUserId(),
                    "QR_SCAN",
                    "Invoice",
                    id,
                    invoice.InvoiceNumber,
                    $"تم مسح QR Code للفاتورة"
                );

                return Ok(new
                {
                    verified = true,
                    invoiceId = id,
                    invoiceNumber = invoice.InvoiceNumber,
                    customerName = invoice.Customer?.Name,
                    amount = invoice.TotalAmount,
                    taxAmount = invoice.TaxAmount,
                    finalAmount = invoice.TotalAmount + invoice.TaxAmount,
                    createdDate = invoice.CreatedAt,
                    status = invoice.Status.ToString(),
                    paidAmount = invoice.PaidAmount,
                    notes = invoice.Notes
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "خطأ في التحقق من الفاتورة", error = ex.Message });
            }
        }
    }
}
