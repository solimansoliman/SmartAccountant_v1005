using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartAccountant.API.Models
{
    /// <summary>
    /// جدول الشعارات - يدعم حفظ الصورة كـ URL أو كـ Binary في قاعدة البيانات
    /// </summary>
    public class Logo
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// معرف الحساب المرتبط
        /// </summary>
        public int AccountId { get; set; }

        /// <summary>
        /// اسم الشعار
        /// </summary>
        [MaxLength(200)]
        public string? Name { get; set; }

        /// <summary>
        /// نوع الشعار: Primary, Secondary, Favicon, Watermark
        /// </summary>
        [MaxLength(50)]
        public string LogoType { get; set; } = "Primary";

        /// <summary>
        /// طريقة التخزين: Url, Database, Both
        /// </summary>
        [MaxLength(20)]
        public string StorageType { get; set; } = "Url";

        /// <summary>
        /// رابط الصورة على السيرفر (إذا كان StorageType = Url أو Both)
        /// </summary>
        [MaxLength(1000)]
        public string? ImageUrl { get; set; }

        /// <summary>
        /// الصورة مخزنة كـ Base64 (إذا كان StorageType = Database أو Both)
        /// </summary>
        public string? ImageData { get; set; }

        /// <summary>
        /// الصورة مخزنة كـ Binary (بديل للـ Base64 لتوفير المساحة)
        /// </summary>
        public byte[]? ImageBinary { get; set; }

        /// <summary>
        /// نوع الملف: image/png, image/jpeg, image/svg+xml, etc.
        /// </summary>
        [MaxLength(50)]
        public string? MimeType { get; set; }

        /// <summary>
        /// حجم الملف بالبايت
        /// </summary>
        public long? FileSize { get; set; }

        /// <summary>
        /// عرض الصورة بالبكسل
        /// </summary>
        public int? Width { get; set; }

        /// <summary>
        /// ارتفاع الصورة بالبكسل
        /// </summary>
        public int? Height { get; set; }

        /// <summary>
        /// هل الشعار نشط ومعروض
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// هل إظهار الشعار مفعل لهذا الحساب
        /// </summary>
        public bool ShowLogo { get; set; } = true;

        /// <summary>
        /// ترتيب العرض (للحسابات التي لديها أكثر من شعار)
        /// </summary>
        public int DisplayOrder { get; set; } = 0;

        /// <summary>
        /// Alt text للصورة (لأغراض الـ SEO والوصول)
        /// </summary>
        [MaxLength(500)]
        public string? AltText { get; set; }

        /// <summary>
        /// ملاحظات إضافية
        /// </summary>
        [MaxLength(1000)]
        public string? Notes { get; set; }

        /// <summary>
        /// تاريخ الإنشاء
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// تاريخ آخر تحديث
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// معرف المستخدم الذي أنشأ الشعار
        /// </summary>
        public int? CreatedByUserId { get; set; }

        /// <summary>
        /// معرف المستخدم الذي قام بآخر تحديث
        /// </summary>
        public int? UpdatedByUserId { get; set; }

        // ==================== Navigation Properties ====================
        
        [ForeignKey("AccountId")]
        public virtual Account? Account { get; set; }

        [ForeignKey("CreatedByUserId")]
        public virtual User? CreatedByUser { get; set; }

        [ForeignKey("UpdatedByUserId")]
        public virtual User? UpdatedByUser { get; set; }

        // ==================== Helper Methods ====================

        /// <summary>
        /// الحصول على الصورة بالطريقة المناسبة حسب إعدادات التخزين
        /// </summary>
        public string? GetImageSource()
        {
            if (!ShowLogo || !IsActive)
                return null;

            return StorageType switch
            {
                "Url" => ImageUrl,
                "Database" => ImageData ?? (ImageBinary != null ? $"data:{MimeType};base64,{Convert.ToBase64String(ImageBinary)}" : null),
                "Both" => ImageUrl ?? ImageData ?? (ImageBinary != null ? $"data:{MimeType};base64,{Convert.ToBase64String(ImageBinary)}" : null),
                _ => ImageUrl
            };
        }
    }

    /// <summary>
    /// إعدادات الشعار للحساب
    /// </summary>
    public class AccountLogoSettings
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// معرف الحساب
        /// </summary>
        public int AccountId { get; set; }

        /// <summary>
        /// الطريقة المفضلة لتخزين الشعارات: Url, Database, Both
        /// </summary>
        [MaxLength(20)]
        public string PreferredStorageType { get; set; } = "Url";

        /// <summary>
        /// هل عرض الشعار مفعل للحساب
        /// </summary>
        public bool EnableLogoDisplay { get; set; } = true;

        /// <summary>
        /// الحد الأقصى لحجم الصورة بالكيلوبايت
        /// </summary>
        public int MaxFileSizeKb { get; set; } = 500;

        /// <summary>
        /// الأنواع المسموحة: png,jpg,jpeg,svg,webp
        /// </summary>
        [MaxLength(200)]
        public string AllowedMimeTypes { get; set; } = "image/png,image/jpeg,image/jpg,image/svg+xml,image/webp";

        /// <summary>
        /// معرف الشعار الأساسي النشط
        /// </summary>
        public int? ActivePrimaryLogoId { get; set; }

        /// <summary>
        /// معرف الـ Favicon النشط
        /// </summary>
        public int? ActiveFaviconId { get; set; }

        /// <summary>
        /// تاريخ الإنشاء
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// تاريخ آخر تحديث
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        [ForeignKey("AccountId")]
        public virtual Account? Account { get; set; }

        [ForeignKey("ActivePrimaryLogoId")]
        public virtual Logo? ActivePrimaryLogo { get; set; }

        [ForeignKey("ActiveFaviconId")]
        public virtual Logo? ActiveFavicon { get; set; }
    }
}
