namespace SmartAccountant.API.Models
{
    /// <summary>
    /// المصروف - تابع للحساب
    /// </summary>
    public class Expense
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        // ربط بنوع المعاملة (مصروفات، مشتريات، إيرادات أخرى)
        public int? TransactionTypeId { get; set; }
        public TransactionType? TransactionType { get; set; }
        
        public string ExpenseNumber { get; set; } = string.Empty;
        public DateTime ExpenseDate { get; set; }
        public int? CategoryId { get; set; }
        public ExpenseCategory? Category { get; set; }
        public decimal Amount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal NetAmount { get; set; }
        public int? CurrencyId { get; set; }
        public decimal ExchangeRate { get; set; } = 1;
        public DateTime? DueDate { get; set; }
        public string? Payee { get; set; }
        public string? PayeeType { get; set; }
        public int? PayeeId { get; set; }
        public string? PaymentMethod { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? Description { get; set; }
        public string? AttachmentUrl { get; set; }
        public string Status { get; set; } = "Pending";
        public bool IsRecurring { get; set; }
        public string? RecurrencePattern { get; set; }
        public DateTime? NextRecurrenceDate { get; set; }
        public string? Notes { get; set; }
        public string? InternalNotes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? DeletedAt { get; set; }
        
        // من أنشأ/عدل السجل
        public int? CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
        public int? ApprovedByUserId { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public int? RejectedByUserId { get; set; }
        public DateTime? RejectedAt { get; set; }
        public string? RejectionReason { get; set; }
    }

    /// <summary>
    /// تصنيف المصروفات - تابع للحساب
    /// </summary>
    public class ExpenseCategory
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }
        public string? Code { get; set; }
        public int? ParentCategoryId { get; set; }
        public ExpenseCategory? ParentCategory { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<ExpenseCategory> ChildCategories { get; set; } = new List<ExpenseCategory>();
        public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    }

    public enum ExpenseStatus
    {
        Pending = 1,    // قيد الانتظار
        Approved = 2,   // معتمد
        Paid = 3,       // مدفوع
        Cancelled = 4   // ملغي
    }
}
