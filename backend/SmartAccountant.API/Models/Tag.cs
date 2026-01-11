using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartAccountant.API.Models
{
    /// <summary>
    /// نموذج العلامات (Tags) للتصنيف والتنظيم
    /// </summary>
    public class Tag
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// معرف الحساب
        /// </summary>
        public int AccountId { get; set; }

        /// <summary>
        /// اسم العلامة بالعربية
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// اسم العلامة بالإنجليزية
        /// </summary>
        [MaxLength(100)]
        public string? NameEn { get; set; }

        /// <summary>
        /// لون العلامة (Hex)
        /// </summary>
        [MaxLength(20)]
        public string Color { get; set; } = "#3B82F6";

        /// <summary>
        /// وصف العلامة
        /// </summary>
        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// هل العلامة نشطة
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// تاريخ الإنشاء
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        [ForeignKey("AccountId")]
        public virtual Account? Account { get; set; }
    }
}
