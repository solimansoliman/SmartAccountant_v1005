namespace SmartAccountant.API.Models
{
    /// <summary>
    /// الإيراد - تابع للحساب
    /// </summary>
    public class Revenue
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        public string RevenueNumber { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public RevenueCategory Category { get; set; } = null!;
        public decimal Amount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal NetAmount { get; set; }
        public int? CurrencyId { get; set; }
        public decimal ExchangeRate { get; set; } = 1;
        public DateTime RevenueDate { get; set; }
        public string? Description { get; set; }
        public string? Payer { get; set; }
        public string? PayerType { get; set; }
        public int? PayerId { get; set; }
        public string PaymentMethod { get; set; } = "Cash";
        public string? ReferenceNumber { get; set; }
        public int? InvoiceId { get; set; }
        public string? AttachmentUrl { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? DeletedAt { get; set; }
        
        // من أنشأ السجل
        public int? CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
    }

    /// <summary>
    /// تصنيف الإيرادات - تابع للحساب
    /// </summary>
    public class RevenueCategory
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }
        public string? Code { get; set; }
        public int? ParentCategoryId { get; set; }
        public RevenueCategory? ParentCategory { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<RevenueCategory> ChildCategories { get; set; } = new List<RevenueCategory>();
        public ICollection<Revenue> Revenues { get; set; } = new List<Revenue>();
    }

    public enum RevenueStatus
    {
        Pending = 1,    // قيد الانتظار
        Confirmed = 2,  // مؤكد
        Cancelled = 3   // ملغي
    }
}
