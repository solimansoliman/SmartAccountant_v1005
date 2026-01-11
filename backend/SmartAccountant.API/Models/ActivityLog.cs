namespace SmartAccountant.API.Models
{
    /// <summary>
    /// سجل نشاطات المستخدمين - للإحصائيات والتتبع
    /// </summary>
    public class ActivityLog
    {
        public int Id { get; set; }
        
        // ربط بالحساب والمستخدم
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        public int UserId { get; set; }
        public User? User { get; set; }
        
        /// <summary>
        /// نوع النشاط/الإجراء
        /// </summary>
        public string Action { get; set; } = string.Empty;
        
        /// <summary>
        /// الكيان المتأثر (Product, Invoice, Customer, etc.)
        /// </summary>
        public string EntityType { get; set; } = string.Empty;
        
        /// <summary>
        /// معرف الكيان
        /// </summary>
        public int? EntityId { get; set; }
        
        /// <summary>
        /// اسم الكيان للعرض
        /// </summary>
        public string? EntityName { get; set; }
        
        /// <summary>
        /// وصف النشاط
        /// </summary>
        public string Description { get; set; } = string.Empty;
        
        /// <summary>
        /// وصف النشاط بالإنجليزية
        /// </summary>
        public string? DescriptionEn { get; set; }
        
        /// <summary>
        /// القيم القديمة JSON (للتعديلات)
        /// </summary>
        public string? OldValues { get; set; }
        
        /// <summary>
        /// القيم الجديدة JSON
        /// </summary>
        public string? NewValues { get; set; }
        
        /// <summary>
        /// التغييرات
        /// </summary>
        public string? Changes { get; set; }
        
        /// <summary>
        /// عنوان IP
        /// </summary>
        public string? IpAddress { get; set; }
        
        /// <summary>
        /// معلومات المتصفح/الجهاز
        /// </summary>
        public string? UserAgent { get; set; }
        
        /// <summary>
        /// المتصفح
        /// </summary>
        public string? Browser { get; set; }
        
        /// <summary>
        /// المنصة
        /// </summary>
        public string? Platform { get; set; }
        
        /// <summary>
        /// الموقع
        /// </summary>
        public string? Location { get; set; }
        
        /// <summary>
        /// ملاحظات
        /// </summary>
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
