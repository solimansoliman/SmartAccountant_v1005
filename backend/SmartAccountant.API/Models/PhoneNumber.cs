using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartAccountant.API.Models
{
    /// <summary>
    /// جدول أرقام الهواتف - مرتبط بالعملاء والحسابات والمستخدمين
    /// </summary>
    public class PhoneNumber
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
        /// رقم الهاتف
        /// </summary>
        [Required]
        [StringLength(30)]
        [Column("PhoneNumber")]
        public string Phone { get; set; } = string.Empty;
        
        /// <summary>
        /// كود الدولة
        /// </summary>
        [StringLength(5)]
        public string? CountryCode { get; set; }
        
        /// <summary>
        /// نوع الهاتف: mobile, landline, fax, work, home, other
        /// </summary>
        [StringLength(20)]
        public string PhoneType { get; set; } = "mobile";
        
        /// <summary>
        /// تسمية مخصصة
        /// </summary>
        [StringLength(50)]
        public string? Label { get; set; }
        
        /// <summary>
        /// هل هو الرقم الأساسي؟
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
        /// هل يدعم واتساب؟
        /// </summary>
        public bool IsWhatsApp { get; set; } = false;
        
        /// <summary>
        /// هل يدعم تيليجرام؟
        /// </summary>
        public bool IsTelegram { get; set; } = false;
        
        /// <summary>
        /// هل يمكن استقبال رسائل SMS؟
        /// </summary>
        public bool CanReceiveSMS { get; set; } = true;
        
        /// <summary>
        /// هل يمكن استقبال مكالمات؟
        /// </summary>
        public bool CanReceiveCalls { get; set; } = true;
        
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
