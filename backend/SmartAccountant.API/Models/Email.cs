using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartAccountant.API.Models
{
    /// <summary>
    /// جدول الإيميلات - مرتبط بالعملاء والحسابات والمستخدمين
    /// </summary>
    public class Email
    {
        public int Id { get; set; }
        
        [Required]
        public int AccountId { get; set; }
        
        /// <summary>
        /// نوع الكيان المرتبط: Customer, Account, User
        /// </summary>
        [Required]
        [StringLength(50)]
        public string EntityType { get; set; } = string.Empty;
        
        /// <summary>
        /// معرف الكيان المرتبط
        /// </summary>
        [Required]
        public int EntityId { get; set; }
        
        /// <summary>
        /// عنوان البريد الإلكتروني
        /// </summary>
        [Required]
        [StringLength(200)]
        [EmailAddress]
        public string EmailAddress { get; set; } = string.Empty;
        
        /// <summary>
        /// نوع البريد: work, personal, billing, support, other
        /// </summary>
        [StringLength(20)]
        public string EmailType { get; set; } = "work";
        
        /// <summary>
        /// تسمية مخصصة
        /// </summary>
        [StringLength(50)]
        public string? Label { get; set; }
        
        /// <summary>
        /// هل هو البريد الأساسي؟
        /// </summary>
        public bool IsPrimary { get; set; } = false;
        
        /// <summary>
        /// هل تم التحقق منه؟
        /// </summary>
        public bool IsVerified { get; set; } = false;
        
        /// <summary>
        /// تاريخ التحقق
        /// </summary>
        public DateTime? VerifiedAt { get; set; }
        
        /// <summary>
        /// رمز التحقق
        /// </summary>
        [StringLength(200)]
        public string? VerificationToken { get; set; }
        
        /// <summary>
        /// تاريخ انتهاء رمز التحقق
        /// </summary>
        public DateTime? VerificationExpiry { get; set; }
        
        /// <summary>
        /// هل يمكن استقبال الفواتير؟
        /// </summary>
        public bool CanReceiveInvoices { get; set; } = true;
        
        /// <summary>
        /// هل يمكن استقبال التسويق؟
        /// </summary>
        public bool CanReceiveMarketing { get; set; } = false;
        
        /// <summary>
        /// هل يمكن استقبال الإشعارات؟
        /// </summary>
        public bool CanReceiveNotifications { get; set; } = true;
        
        /// <summary>
        /// تاريخ إلغاء الاشتراك
        /// </summary>
        public DateTime? UnsubscribedAt { get; set; }
        
        /// <summary>
        /// عدد مرات الارتداد
        /// </summary>
        public int BounceCount { get; set; } = 0;
        
        /// <summary>
        /// تاريخ آخر ارتداد
        /// </summary>
        public DateTime? LastBounceAt { get; set; }
        
        /// <summary>
        /// ملاحظات
        /// </summary>
        [StringLength(500)]
        public string? Notes { get; set; }
        
        /// <summary>
        /// هل مفعل؟
        /// </summary>
        public bool IsActive { get; set; } = true;
        
        /// <summary>
        /// تاريخ الإنشاء
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// تاريخ التحديث
        /// </summary>
        public DateTime? UpdatedAt { get; set; }
        
        /// <summary>
        /// معرف المستخدم الذي أنشأ السجل
        /// </summary>
        public int? CreatedByUserId { get; set; }
        
        // Navigation Properties
        [ForeignKey("AccountId")]
        public virtual Account? Account { get; set; }
        
        [ForeignKey("CreatedByUserId")]
        public virtual User? CreatedByUser { get; set; }
    }
}
