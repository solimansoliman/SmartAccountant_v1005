namespace SmartAccountant.API.Models
{
    /// <summary>
    /// إشعارات المستخدمين
    /// </summary>
    public class Notification
    {
        public int Id { get; set; }
        
        // ربط بالحساب والمستخدم
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        
        /// <summary>
        /// عنوان الإشعار
        /// </summary>
        public string Title { get; set; } = string.Empty;
        
        /// <summary>
        /// محتوى الإشعار (عربي)
        /// </summary>
        public string Body { get; set; } = string.Empty;
        
        /// <summary>
        /// محتوى الإشعار (إنجليزي)
        /// </summary>
        public string? BodyEn { get; set; }
        
        /// <summary>
        /// العنوان بالإنجليزي
        /// </summary>
        public string? TitleEn { get; set; }
        
        /// <summary>
        /// نوع الإشعار
        /// </summary>
        public NotificationType Type { get; set; } = NotificationType.Info;
        
        /// <summary>
        /// الأولوية
        /// </summary>
        public int Priority { get; set; } = 1;
        
        /// <summary>
        /// رابط الإجراء
        /// </summary>
        public string? ActionUrl { get; set; }
        
        /// <summary>
        /// نص الإجراء
        /// </summary>
        public string? ActionText { get; set; }
        
        /// <summary>
        /// نوع الكيان المرتبط
        /// </summary>
        public string? EntityType { get; set; }
        
        /// <summary>
        /// معرف الكيان المرتبط
        /// </summary>
        public int? EntityId { get; set; }
        
        /// <summary>
        /// أيقونة الإشعار
        /// </summary>
        public string? Icon { get; set; }
        
        /// <summary>
        /// هل تم قراءة الإشعار؟
        /// </summary>
        public bool IsRead { get; set; } = false;
        
        /// <summary>
        /// تاريخ القراءة
        /// </summary>
        public DateTime? ReadAt { get; set; }
        
        /// <summary>
        /// تاريخ الإنشاء
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// تاريخ انتهاء الصلاحية (إشعارات مؤقتة)
        /// </summary>
        public DateTime? ExpiresAt { get; set; }
        
        /// <summary>
        /// هل تم إخفاء الإشعار؟
        /// </summary>
        public bool IsDismissed { get; set; } = false;
        
        /// <summary>
        /// تاريخ الإخفاء
        /// </summary>
        public DateTime? DismissedAt { get; set; }
        
        /// <summary>
        /// ملاحظات
        /// </summary>
        public string? Notes { get; set; }
    }

    public enum NotificationType
    {
        Info = 1,       // معلومات
        Success = 2,    // نجاح
        Warning = 3,    // تحذير
        Error = 4,      // خطأ
        Invoice = 5,    // فاتورة
        Payment = 6,    // دفعة
        Stock = 7,      // مخزون
        System = 8      // نظام
    }
}
