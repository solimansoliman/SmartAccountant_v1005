namespace SmartAccountant.API.Models
{
    /// <summary>
    /// العملات المتاحة في النظام
    /// </summary>
    public class Currency
    {
        public int Id { get; set; }
        
        /// <summary>
        /// كود العملة ISO (SAR, EGP, USD, EUR)
        /// </summary>
        public string Code { get; set; } = string.Empty;
        
        /// <summary>
        /// اسم العملة بالعربي
        /// </summary>
        public string Name { get; set; } = string.Empty;
        
        /// <summary>
        /// اسم العملة بالإنجليزي
        /// </summary>
        public string? NameEn { get; set; }
        
        /// <summary>
        /// رمز العملة (ر.س، ج.م، $، €)
        /// </summary>
        public string Symbol { get; set; } = string.Empty;
        
        /// <summary>
        /// اسم الوحدة الفرعية (هللة، قرش، سنت)
        /// </summary>
        public string? SubUnit { get; set; }
        
        /// <summary>
        /// عدد الخانات العشرية
        /// </summary>
        public int DecimalPlaces { get; set; } = 2;
        
        /// <summary>
        /// سعر الصرف مقابل العملة الأساسية
        /// </summary>
        public decimal ExchangeRate { get; set; } = 1;
        
        /// <summary>
        /// هل هي العملة الأساسية للنظام؟
        /// </summary>
        public bool IsDefault { get; set; } = false;
        
        /// <summary>
        /// الدولة
        /// </summary>
        public string? Country { get; set; }
        
        /// <summary>
        /// كود الدولة ISO
        /// </summary>
        public string? CountryCode { get; set; }
        
        /// <summary>
        /// علم الدولة (emoji أو رابط صورة)
        /// </summary>
        public string? Flag { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        // Navigation Properties
        public ICollection<Account> Accounts { get; set; } = new List<Account>();
    }
}
