using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartAccountant.API.Models
{
    /// <summary>
    /// نموذج التعليقات - لإضافة تعليقات على أي كيان في النظام
    /// يدعم التعليقات المتداخلة (ردود على تعليقات)
    /// </summary>
    public class Comment
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// معرف الحساب - لفصل البيانات بين الحسابات
        /// </summary>
        [Required]
        public int AccountId { get; set; }

        /// <summary>
        /// نوع الكيان المرتبط به التعليق
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
        /// معرف التعليق الأب (للردود المتداخلة)
        /// null = تعليق رئيسي
        /// </summary>
        public int? ParentCommentId { get; set; }

        /// <summary>
        /// معرف المستخدم الذي كتب التعليق
        /// </summary>
        [Required]
        public int UserId { get; set; }

        /// <summary>
        /// محتوى التعليق
        /// </summary>
        [Required]
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// هل التعليق داخلي (للموظفين فقط)
        /// </summary>
        public bool IsInternal { get; set; } = false;

        /// <summary>
        /// تاريخ الإنشاء
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// تاريخ آخر تعديل
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// تاريخ الحذف (Soft Delete)
        /// </summary>
        public DateTime? DeletedAt { get; set; }

        // Navigation Properties
        [ForeignKey("AccountId")]
        public virtual Account? Account { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [ForeignKey("ParentCommentId")]
        public virtual Comment? ParentComment { get; set; }

        /// <summary>
        /// الردود على هذا التعليق
        /// </summary>
        public virtual ICollection<Comment> Replies { get; set; } = new List<Comment>();
    }

    /// <summary>
    /// أنواع الكيانات التي يمكن التعليق عليها
    /// </summary>
    public static class CommentEntityTypes
    {
        public const string Invoice = "Invoice";
        public const string Product = "Product";
        public const string Customer = "Customer";
        public const string Expense = "Expense";
        public const string Revenue = "Revenue";
        public const string Payment = "Payment";
    }
}
