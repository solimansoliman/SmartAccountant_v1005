using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartAccountant.API.Models
{
    /// <summary>
    /// نموذج ربط التاغات - جدول Many-to-Many بين Tags وأي كيان
    /// يسمح بإضافة تاغات على: المنتجات، العملاء، الفواتير، إلخ
    /// </summary>
    public class EntityTag
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// معرف التاغ
        /// </summary>
        [Required]
        public int TagId { get; set; }

        /// <summary>
        /// نوع الكيان المرتبط
        /// مثل: Product, Customer, Invoice
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
        /// تاريخ الربط
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// المستخدم الذي أضاف التاغ
        /// </summary>
        public int? CreatedByUserId { get; set; }

        // Navigation Properties
        [ForeignKey("TagId")]
        public virtual Tag? Tag { get; set; }

        [ForeignKey("CreatedByUserId")]
        public virtual User? CreatedByUser { get; set; }
    }

    /// <summary>
    /// أنواع الكيانات التي يمكن إضافة تاغات لها
    /// </summary>
    public static class EntityTagTypes
    {
        public const string Product = "Product";
        public const string Customer = "Customer";
        public const string Invoice = "Invoice";
        public const string Expense = "Expense";
        public const string Revenue = "Revenue";
    }
}
