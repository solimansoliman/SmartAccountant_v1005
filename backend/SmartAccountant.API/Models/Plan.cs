using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartAccountant.API.Models
{
    /// <summary>
    /// نموذج خطة الاشتراك
    /// </summary>
    [Table("Plans")]
    public class Plan
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// اسم الخطة بالعربي
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// اسم الخطة بالإنجليزي
        /// </summary>
        [MaxLength(100)]
        public string? NameEn { get; set; }

        /// <summary>
        /// وصف الخطة
        /// </summary>
        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// السعر الشهري
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; } = 0;

        /// <summary>
        /// السعر السنوي
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? YearlyPrice { get; set; }

        /// <summary>
        /// العملة
        /// </summary>
        [MaxLength(10)]
        public string Currency { get; set; } = "ج.م";

        /// <summary>
        /// لون الخطة للعرض
        /// </summary>
        [MaxLength(50)]
        public string Color { get; set; } = "blue";

        /// <summary>
        /// اسم الأيقونة
        /// </summary>
        [MaxLength(50)]
        public string Icon { get; set; } = "Zap";

        /// <summary>
        /// هل هي الأكثر شعبية
        /// </summary>
        public bool IsPopular { get; set; } = false;

        /// <summary>
        /// ترتيب العرض
        /// </summary>
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// هل الخطة نشطة
        /// </summary>
        public bool IsActive { get; set; } = true;

        // ============ الحدود ============

        /// <summary>
        /// الحد الأقصى للمستخدمين (-1 = غير محدود)
        /// </summary>
        public int MaxUsers { get; set; } = 1;

        /// <summary>
        /// الحد الأقصى للفواتير شهرياً (-1 = غير محدود)
        /// </summary>
        public int MaxInvoices { get; set; } = 50;

        /// <summary>
        /// الحد الأقصى للعملاء (-1 = غير محدود)
        /// </summary>
        public int MaxCustomers { get; set; } = 25;

        /// <summary>
        /// الحد الأقصى للمنتجات (-1 = غير محدود)
        /// </summary>
        public int MaxProducts { get; set; } = 50;

        // ============ الميزات ============

        /// <summary>
        /// التقارير الأساسية
        /// </summary>
        public bool HasBasicReports { get; set; } = true;

        /// <summary>
        /// التقارير المتقدمة
        /// </summary>
        public bool HasAdvancedReports { get; set; } = false;

        /// <summary>
        /// الدعم عبر البريد
        /// </summary>
        public bool HasEmailSupport { get; set; } = true;

        /// <summary>
        /// الدعم ذو الأولوية
        /// </summary>
        public bool HasPrioritySupport { get; set; } = false;

        /// <summary>
        /// مدير حساب مخصص
        /// </summary>
        public bool HasDedicatedManager { get; set; } = false;

        /// <summary>
        /// النسخ الاحتياطي
        /// </summary>
        public bool HasBackup { get; set; } = false;

        /// <summary>
        /// تردد النسخ الاحتياطي (daily, weekly, instant)
        /// </summary>
        [MaxLength(50)]
        public string? BackupFrequency { get; set; }

        /// <summary>
        /// تخصيص الفواتير
        /// </summary>
        public bool HasCustomInvoices { get; set; } = false;

        /// <summary>
        /// العملات المتعددة
        /// </summary>
        public bool HasMultiCurrency { get; set; } = false;

        /// <summary>
        /// الوصول لـ API
        /// </summary>
        public bool HasApiAccess { get; set; } = false;

        /// <summary>
        /// إزالة العلامة التجارية
        /// </summary>
        public bool HasWhiteLabel { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
