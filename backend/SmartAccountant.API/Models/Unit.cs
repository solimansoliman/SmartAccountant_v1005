namespace SmartAccountant.API.Models
{
    /// <summary>
    /// وحدة القياس - تابعة للحساب
    /// </summary>
    public class Unit
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Symbol { get; set; }
        public bool IsBase { get; set; } = true;
        public int? BaseUnitId { get; set; }
        public Unit? BaseUnit { get; set; }
        public decimal ConversionFactor { get; set; } = 1;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // من أنشأ السجل
        public int? CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }

        public ICollection<Unit> DerivedUnits { get; set; } = new List<Unit>();
        public ICollection<ProductUnit> ProductUnits { get; set; } = new List<ProductUnit>();
    }
}
