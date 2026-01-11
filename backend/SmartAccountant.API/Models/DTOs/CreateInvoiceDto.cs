using System.Text.Json.Serialization;

namespace SmartAccountant.API.Models.DTOs
{
    public class CreateInvoiceDto
    {
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public InvoiceType InvoiceType { get; set; }
        
        public int CustomerId { get; set; }
        public DateTime InvoiceDate { get; set; }
        public DateTime? DueDate { get; set; }
        public string? Notes { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal PaidAmount { get; set; } // المبلغ المدفوع
        
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public PaymentMethod PaymentMethod { get; set; }
        
        public List<CreateInvoiceItemDto> Items { get; set; } = new();
    }

    public class CreateInvoiceItemDto
    {
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public int? UnitId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxPercent { get; set; }
    }
}
