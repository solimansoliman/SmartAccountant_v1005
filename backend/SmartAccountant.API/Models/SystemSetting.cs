namespace SmartAccountant.API.Models
{
    /// <summary>
    /// إعدادات النظام - للتحكم في خيارات التطبيق
    /// </summary>
    public class SystemSetting
    {
        public int Id { get; set; }
        
        /// <summary>
        /// معرف الحساب - NULL يعني إعداد عام للنظام كله
        /// </summary>
        public int? AccountId { get; set; }
        public Account? Account { get; set; }
        
        /// <summary>
        /// مفتاح الإعداد (مثل: showDemoLogin, showAdminLogin)
        /// </summary>
        public string SettingKey { get; set; } = string.Empty;
        
        /// <summary>
        /// قيمة الإعداد (يمكن أن تكون string, bool, int, json)
        /// </summary>
        public string SettingValue { get; set; } = string.Empty;
        
        /// <summary>
        /// نوع القيمة: string, bool, int, json
        /// </summary>
        public string SettingType { get; set; } = "string";
        
        /// <summary>
        /// وصف الإعداد
        /// </summary>
        public string? Description { get; set; }
        
        /// <summary>
        /// هل الإعداد متاح للعرض للمستخدم العادي
        /// </summary>
        public bool IsPublic { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
