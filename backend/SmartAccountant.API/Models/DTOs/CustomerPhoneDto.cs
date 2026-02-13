namespace SmartAccountant.API.Models.DTOs
{
    /// <summary>
    /// DTO لعرض هاتف العميل
    /// </summary>
    public class CustomerPhoneDto
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string PhoneType { get; set; } = "Mobile";
        public bool IsPrimary { get; set; }
        public bool IsSecondary { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// DTO لإنشاء هاتف عميل جديد
    /// </summary>
    public class CreateCustomerPhoneDto
    {
        public int CustomerId { get; set; }
        
        public string PhoneNumber { get; set; } = string.Empty;
        
        public string PhoneType { get; set; } = "Mobile";
        
        public bool IsPrimary { get; set; } = false;
        
        public bool IsSecondary { get; set; } = false;
        
        public string? Notes { get; set; }
        
        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// DTO لتحديث هاتف عميل
    /// </summary>
    public class UpdateCustomerPhoneDto
    {
        public string PhoneNumber { get; set; } = string.Empty;
        
        public string PhoneType { get; set; } = "Mobile";
        
        public bool IsPrimary { get; set; }
        
        public bool IsSecondary { get; set; }
        
        public string? Notes { get; set; }
        
        public bool IsActive { get; set; }
    }
}
