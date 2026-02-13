namespace SmartAccountant.API.Models
{
    /// <summary>
    /// العميل - تابع للحساب
    /// </summary>
    public class Customer
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        
        // FK للهواتف والإيميلات
        public int? PrimaryPhoneId { get; set; }
        public PhoneNumber? PrimaryPhone { get; set; }
        
        public int? SecondaryPhoneId { get; set; }
        public PhoneNumber? SecondaryPhone { get; set; }
        
        public int? PrimaryEmailId { get; set; }
        public Email? PrimaryEmail { get; set; }
        
        // البيانات الجغرافية
        public int? CountryId { get; set; }
        public Country? Country { get; set; }
        
        public int? ProvinceId { get; set; }
        public Province? Province { get; set; }
        
        public int? CityId { get; set; }
        public City? City { get; set; }
        
        // العنوان - نص يتم إنشاؤه من البيانات الجغرافية
        public string? Address { get; set; }
        
        public CustomerType Type { get; set; } = CustomerType.Individual;
        public decimal Balance { get; set; }
        public int? PriceListId { get; set; }
        public int? CurrencyId { get; set; }
        public DateTime? JoinDate { get; set; }
        public DateTime? LastPurchaseDate { get; set; }
        public DateTime? LastPaymentDate { get; set; }
        public decimal? TotalPurchases { get; set; } = 0;
        public decimal? TotalPayments { get; set; } = 0;
        public int InvoiceCount { get; set; } = 0;
        public string? Notes { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsVIP { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? DeletedAt { get; set; }
        
        // من أنشأ/عدل السجل
        public int? CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
        public int? UpdatedByUserId { get; set; }
        public User? UpdatedByUser { get; set; }

        // Navigation Properties
        public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
        public ICollection<CustomerPhone> Phones { get; set; } = new List<CustomerPhone>();
        public ICollection<CustomerEmail> Emails { get; set; } = new List<CustomerEmail>();
    }

    public enum CustomerType
    {
        Individual = 1,  // فرد
        Company = 2,     // شركة
        Government = 3   // جهة حكومية
    }
}
