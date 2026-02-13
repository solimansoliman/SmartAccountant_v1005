namespace SmartAccountant.API.Models
{
    public class CustomerPhone
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string PhoneType { get; set; } = "Mobile"; // Mobile, Landline, Fax, Other
        public bool IsPrimary { get; set; }
        public bool IsSecondary { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    public class CustomerEmail
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public string EmailAddress { get; set; } = string.Empty;
        public string EmailType { get; set; } = "Business"; // Business, Personal, Other
        public bool IsPrimary { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
