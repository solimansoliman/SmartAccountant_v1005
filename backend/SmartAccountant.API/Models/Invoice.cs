namespace SmartAccountant.API.Models
{
    /// <summary>
    /// الفاتورة - تابعة للحساب
    /// </summary>
    public class Invoice
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        public string InvoiceNumber { get; set; } = string.Empty;
        public InvoiceType InvoiceType { get; set; }
        public DateTime InvoiceDate { get; set; }
        public DateTime? DueDate { get; set; }
        public int? CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public int? UserId { get; set; }
        public User? User { get; set; }
        public decimal SubTotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount => TotalAmount - PaidAmount;
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
        public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
        public string? Notes { get; set; }
        public string? QrCode { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // من أنشأ/عدل الفاتورة
        public int? CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
        public int? UpdatedByUserId { get; set; }
        public User? UpdatedByUser { get; set; }

        // Navigation Properties
        public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }

    /// <summary>
    /// بند الفاتورة
    /// </summary>
    public class InvoiceItem
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public Invoice Invoice { get; set; } = null!;
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public int? UnitId { get; set; }
        public Unit? Unit { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxPercent { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal LineTotal { get; set; }
        public string? Notes { get; set; }
    }

    /// <summary>
    /// المدفوعات
    /// </summary>
    public class Payment
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        public string? PaymentNumber { get; set; }
        public string? PaymentType { get; set; }
        public int? InvoiceId { get; set; }
        public Invoice? Invoice { get; set; }
        public int? ExpenseId { get; set; }
        public int? CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public decimal Amount { get; set; }
        public int? CurrencyId { get; set; }
        public decimal ExchangeRate { get; set; } = 1;
        public DateTime PaymentDate { get; set; }
        public string PaymentMethod { get; set; } = "Cash";  // تغيير من enum إلى string ليتوافق مع قاعدة البيانات
        public string? ReferenceNumber { get; set; }
        public string? BankName { get; set; }
        public string? CheckNumber { get; set; }
        public DateTime? CheckDate { get; set; }
        public string? Description { get; set; }
        public string? AttachmentUrl { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public int? CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
    }

    public enum InvoiceType
    {
        Sales = 1,          // فاتورة مبيعات
        SalesReturn = 2,    // مرتجع مبيعات
        Quotation = 3       // عرض سعر
    }

    public enum InvoiceStatus
    {
        Draft = 1,      // مسودة
        Confirmed = 2,  // مؤكدة
        Paid = 3,       // مدفوعة
        PartialPaid = 4,// مدفوعة جزئياً
        Cancelled = 5,  // ملغاة
        Refunded = 6    // مستردة
    }

    public enum PaymentMethod
    {
        Cash = 1,       // نقدي
        Card = 2,       // بطاقة
        BankTransfer = 3, // تحويل بنكي
        Credit = 4,     // آجل
        Cheque = 5      // شيك
    }
}
