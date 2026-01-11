namespace SmartAccountant.API.Models
{
    /// <summary>
    /// الحساب/الشركة - كل حساب يمثل شركة أو مؤسسة منفصلة
    /// </summary>
    public class Account
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? LogoUrl { get; set; }
        
        // ربط بالعملة
        public int? CurrencyId { get; set; }
        public Currency? Currency { get; set; }
        
        // رمز العملة للعرض السريع (احتياطي إذا لم يتم اختيار عملة)
        public string CurrencySymbol { get; set; } = "ج.م";
        
        public string? TaxNumber { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Subscription Info
        public DateTime? SubscriptionExpiry { get; set; }
        public AccountPlan Plan { get; set; } = AccountPlan.Trial;
        
        // ربط بجدول الخطط الجديد
        public int? PlanId { get; set; }
        public Plan? PlanDetails { get; set; }

        /// <summary>
        /// الحد الأقصى لعدد حروف الرسالة (0 = بدون حد)
        /// </summary>
        public int MaxMessageLength { get; set; } = 1000;

        /// <summary>
        /// الحد الأقصى لعدد حروف الإشعار (0 = بدون حد)
        /// </summary>
        public int MaxNotificationLength { get; set; } = 500;

        // Navigation Properties
        public ICollection<User> Users { get; set; } = new List<User>();
        public ICollection<Unit> Units { get; set; } = new List<Unit>();
        public ICollection<Product> Products { get; set; } = new List<Product>();
        public ICollection<ProductCategory> ProductCategories { get; set; } = new List<ProductCategory>();
        public ICollection<Customer> Customers { get; set; } = new List<Customer>();
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
        public ICollection<ExpenseCategory> ExpenseCategories { get; set; } = new List<ExpenseCategory>();
        public ICollection<Revenue> Revenues { get; set; } = new List<Revenue>();
        public ICollection<RevenueCategory> RevenueCategories { get; set; } = new List<RevenueCategory>();
        public ICollection<TransactionType> TransactionTypes { get; set; } = new List<TransactionType>();
        
        // الجداول الجديدة
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public ICollection<Message> Messages { get; set; } = new List<Message>();
        public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
        public ICollection<Role> Roles { get; set; } = new List<Role>();
        
        // الشعارات - يدعم تعدد الشعارات (رئيسي، ثانوي، أيقونة)
        public ICollection<Logo> Logos { get; set; } = new List<Logo>();
    }

    public enum AccountPlan
    {
        Trial = 0,
        Basic = 1,
        Professional = 2,
        Enterprise = 3
    }
}
