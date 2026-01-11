namespace SmartAccountant.API.Models
{
    /// <summary>
    /// نوع المعاملة المالية - تابع للحساب
    /// يحدد إذا كانت المعاملة مصروفات أو مشتريات أو إيرادات أخرى
    /// </summary>
    public class TransactionType
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        /// <summary>
        /// اسم النوع بالعربي
        /// </summary>
        public string Name { get; set; } = string.Empty;
        
        /// <summary>
        /// اسم النوع بالإنجليزي
        /// </summary>
        public string? NameEn { get; set; }
        
        /// <summary>
        /// كود النوع (EXPENSE, PURCHASE, OTHER_INCOME)
        /// </summary>
        public string Code { get; set; } = string.Empty;
        
        /// <summary>
        /// وصف النوع
        /// </summary>
        public string? Description { get; set; }
        
        /// <summary>
        /// لون النوع للعرض في الواجهة (مثل: #dc2626 للأحمر)
        /// </summary>
        public string? Color { get; set; }
        
        /// <summary>
        /// أيقونة النوع (مثل: TrendingDown, ShoppingCart, TrendingUp)
        /// </summary>
        public string? Icon { get; set; }
        
        /// <summary>
        /// هل هذا النوع مفعل؟
        /// </summary>
        public bool IsActive { get; set; } = true;
        
        /// <summary>
        /// هل هذا النوع من الأنواع الأساسية التي لا يمكن حذفها؟
        /// </summary>
        public bool IsSystem { get; set; } = false;
        
        /// <summary>
        /// ترتيب العرض
        /// </summary>
        public int DisplayOrder { get; set; } = 0;
        
        // من أنشأ السجل
        public int? CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation Properties
        public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    }
    
    /// <summary>
    /// أكواد أنواع المعاملات الافتراضية
    /// </summary>
    public static class TransactionTypeCodes
    {
        public const string Expense = "OP_EXPENSE";
        public const string Purchase = "CASH_PURCHASE";
        public const string OtherIncome = "OTHER_REV";
        
        // أكواد إضافية
        public const string Salary = "SALARY";
        public const string Rent = "RENT";
        public const string CreditPurchase = "CREDIT_PURCHASE";
        public const string CashSale = "CASH_SALE";
        public const string CreditSale = "CREDIT_SALE";
    }
}
