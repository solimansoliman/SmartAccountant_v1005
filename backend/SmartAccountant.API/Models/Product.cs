namespace SmartAccountant.API.Models
{
    /// <summary>
    /// المنتج - تابع للحساب
    /// </summary>
    public class Product
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        public string? Code { get; set; }
        public string? Barcode { get; set; }
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        
        // ربط بالوحدة الأساسية
        public int? UnitId { get; set; }
        public Unit? Unit { get; set; }
        
        public int? CategoryId { get; set; }
        public ProductCategory? Category { get; set; }
        public decimal CostPrice { get; set; }
        public decimal SellingPrice { get; set; }
        public decimal StockQuantity { get; set; }
        public decimal MinStockLevel { get; set; }
        public decimal TaxPercent { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // من أنشأ/عدل السجل
        public int? CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
        public int? UpdatedByUserId { get; set; }
        public User? UpdatedByUser { get; set; }

        // Navigation Properties
        public ICollection<ProductUnit> ProductUnits { get; set; } = new List<ProductUnit>();
        public ICollection<InvoiceItem> InvoiceItems { get; set; } = new List<InvoiceItem>();
    }

    /// <summary>
    /// تصنيف المنتجات - تابع للحساب
    /// </summary>
    public class ProductCategory
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public int? ParentCategoryId { get; set; }
        public ProductCategory? ParentCategory { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<ProductCategory> ChildCategories { get; set; } = new List<ProductCategory>();
        public ICollection<Product> Products { get; set; } = new List<Product>();
    }

    /// <summary>
    /// وحدات المنتج - ربط المنتج بالوحدات المختلفة
    /// </summary>
    public class ProductUnit
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public int UnitId { get; set; }
        public Unit Unit { get; set; } = null!;
        public decimal ConversionFactor { get; set; } = 1;
        public string? Barcode { get; set; }
        public decimal SellingPrice { get; set; }
        public decimal CostPrice { get; set; }
        public bool IsDefault { get; set; }
    }
}
