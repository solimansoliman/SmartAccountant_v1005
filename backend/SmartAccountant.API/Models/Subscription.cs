using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartAccountant.API.Models
{
    /// <summary>
    /// نموذج الاشتراك - يتتبع اشتراكات الحسابات في الخطط
    /// </summary>
    [Table("Subscriptions")]
    public class Subscription
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// معرف الحساب
        /// </summary>
        [Required]
        public int AccountId { get; set; }
        
        [ForeignKey("AccountId")]
        public Account? Account { get; set; }

        /// <summary>
        /// معرف الخطة
        /// </summary>
        [Required]
        public int PlanId { get; set; }
        
        [ForeignKey("PlanId")]
        public Plan? Plan { get; set; }

        /// <summary>
        /// تاريخ بداية الاشتراك
        /// </summary>
        public DateTime StartDate { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// تاريخ انتهاء الاشتراك
        /// </summary>
        public DateTime EndDate { get; set; }

        /// <summary>
        /// حالة الاشتراك
        /// </summary>
        [MaxLength(50)]
        public string Status { get; set; } = "active"; // active, expired, cancelled, pending

        /// <summary>
        /// دورة الفوترة
        /// </summary>
        [MaxLength(20)]
        public string BillingCycle { get; set; } = "monthly"; // monthly, yearly

        /// <summary>
        /// المبلغ المدفوع
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        /// <summary>
        /// العملة
        /// </summary>
        [MaxLength(10)]
        public string Currency { get; set; } = "ج.م";

        /// <summary>
        /// طريقة الدفع
        /// </summary>
        [MaxLength(50)]
        public string? PaymentMethod { get; set; }

        /// <summary>
        /// مرجع الدفع
        /// </summary>
        [MaxLength(200)]
        public string? PaymentReference { get; set; }

        /// <summary>
        /// رقم الفاتورة
        /// </summary>
        [MaxLength(50)]
        public string? InvoiceNumber { get; set; }

        /// <summary>
        /// الخطة السابقة (في حالة الترقية/التخفيض)
        /// </summary>
        public int? PreviousPlanId { get; set; }
        
        [ForeignKey("PreviousPlanId")]
        public Plan? PreviousPlan { get; set; }

        /// <summary>
        /// الاشتراك السابق الذي تمت الترقية منه
        /// </summary>
        public int? UpgradedFromSubscriptionId { get; set; }

        /// <summary>
        /// تجديد تلقائي
        /// </summary>
        public bool AutoRenew { get; set; } = true;

        /// <summary>
        /// هل تم إرسال تذكير التجديد
        /// </summary>
        public bool RenewalReminderSent { get; set; } = false;

        /// <summary>
        /// ملاحظات
        /// </summary>
        [MaxLength(500)]
        public string? Notes { get; set; }

        /// <summary>
        /// سبب الإلغاء
        /// </summary>
        [MaxLength(500)]
        public string? CancelReason { get; set; }

        /// <summary>
        /// تاريخ الإلغاء
        /// </summary>
        public DateTime? CancelledAt { get; set; }

        /// <summary>
        /// معرف المستخدم الذي ألغى الاشتراك
        /// </summary>
        public int? CancelledByUserId { get; set; }

        /// <summary>
        /// تاريخ الإنشاء
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// معرف المستخدم المنشئ
        /// </summary>
        public int? CreatedByUserId { get; set; }

        /// <summary>
        /// تاريخ آخر تحديث
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        // ============ الخصائص المحسوبة ============

        /// <summary>
        /// هل الاشتراك نشط
        /// </summary>
        [NotMapped]
        public bool IsActive => Status == "active" && EndDate > DateTime.UtcNow;

        /// <summary>
        /// الأيام المتبقية
        /// </summary>
        [NotMapped]
        public int DaysRemaining => Math.Max(0, (EndDate - DateTime.UtcNow).Days);

        /// <summary>
        /// هل على وشك الانتهاء (أقل من 7 أيام)
        /// </summary>
        [NotMapped]
        public bool IsExpiringSoon => IsActive && DaysRemaining <= 7;
    }
}
