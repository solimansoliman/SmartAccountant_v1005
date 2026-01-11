using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartAccountant.API.Models
{
    /// <summary>
    /// نموذج المرفقات - لتخزين الملفات المرفقة مع أي كيان في النظام
    /// يمكن ربطه بـ: الفواتير، المنتجات، العملاء، المصروفات، إلخ
    /// </summary>
    public class Attachment
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// معرف الحساب - لفصل البيانات بين الحسابات
        /// </summary>
        [Required]
        public int AccountId { get; set; }

        /// <summary>
        /// نوع الكيان المرتبط به المرفق
        /// مثل: Invoice, Product, Customer, Expense
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string EntityType { get; set; } = string.Empty;

        /// <summary>
        /// معرف الكيان المرتبط
        /// </summary>
        [Required]
        public int EntityId { get; set; }

        /// <summary>
        /// اسم الملف في النظام (UUID أو مشفر)
        /// </summary>
        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty;

        /// <summary>
        /// اسم الملف الأصلي الذي رفعه المستخدم
        /// </summary>
        [Required]
        [MaxLength(255)]
        public string OriginalFileName { get; set; } = string.Empty;

        /// <summary>
        /// مسار الملف على الخادم
        /// </summary>
        [MaxLength(500)]
        public string? FilePath { get; set; }

        /// <summary>
        /// رابط الملف للوصول العام
        /// </summary>
        [MaxLength(500)]
        public string? FileUrl { get; set; }

        /// <summary>
        /// حجم الملف بالبايت
        /// </summary>
        public long FileSize { get; set; }

        /// <summary>
        /// نوع الملف (pdf, image, document, etc.)
        /// </summary>
        [MaxLength(50)]
        public string? FileType { get; set; }

        /// <summary>
        /// نوع MIME للملف
        /// </summary>
        [MaxLength(100)]
        public string? MimeType { get; set; }

        /// <summary>
        /// وصف المرفق
        /// </summary>
        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// هل المرفق عام (يمكن للجميع رؤيته)
        /// </summary>
        public bool IsPublic { get; set; } = false;

        /// <summary>
        /// عدد مرات التحميل
        /// </summary>
        public int DownloadCount { get; set; } = 0;

        /// <summary>
        /// آخر تحميل
        /// </summary>
        public DateTime? LastDownloadAt { get; set; }

        /// <summary>
        /// ملاحظات إضافية
        /// </summary>
        public string? Notes { get; set; }

        /// <summary>
        /// تاريخ الإنشاء
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// معرف المستخدم الذي أنشأ المرفق
        /// </summary>
        public int? CreatedByUserId { get; set; }

        // Navigation Properties
        [ForeignKey("AccountId")]
        public virtual Account? Account { get; set; }

        [ForeignKey("CreatedByUserId")]
        public virtual User? CreatedByUser { get; set; }
    }

    /// <summary>
    /// أنواع الكيانات التي يمكن إرفاق ملفات بها
    /// </summary>
    public static class AttachmentEntityTypes
    {
        public const string Invoice = "Invoice";
        public const string Product = "Product";
        public const string Customer = "Customer";
        public const string Expense = "Expense";
        public const string Revenue = "Revenue";
        public const string User = "User";
        public const string Account = "Account";
        public const string Payment = "Payment";
    }
}
