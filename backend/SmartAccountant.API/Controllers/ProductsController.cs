using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Services;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;

        public ProductsController(ApplicationDbContext context, IActivityLogService activityLog)
        {
            _context = context;
            _activityLog = activityLog;
        }

        // Helper method للحصول على AccountId من الهيدر
        private int GetAccountId()
        {
            if (Request.Headers.TryGetValue("X-Account-Id", out var accountIdHeader) && 
                int.TryParse(accountIdHeader, out var accountId))
            {
                return accountId;
            }
            return 1; // حساب افتراضي للتطوير
        }

        // Helper method للحصول على UserId من الهيدر
        private int? GetUserId()
        {
            if (Request.Headers.TryGetValue("X-User-Id", out var userIdHeader) && 
                int.TryParse(userIdHeader, out var userId))
            {
                return userId;
            }
            return null;
        }

        // DTO لعرض المنتج
        public class ProductResponseDto
        {
            public int Id { get; set; }
            public int AccountId { get; set; }
            public string? Code { get; set; }
            public string? Barcode { get; set; }
            public string? Name { get; set; }
            public string? NameEn { get; set; }
            public string? Description { get; set; }
            public string? ImageUrl { get; set; }
            public int? UnitId { get; set; }
            public string? Unit { get; set; }  // اسم الوحدة
            public int? CategoryId { get; set; }
            public string? CategoryName { get; set; }
            public decimal CostPrice { get; set; }
            public decimal SellingPrice { get; set; }
            public decimal StockQuantity { get; set; }
            public decimal MinStockLevel { get; set; }
            public decimal TaxPercent { get; set; }
            public bool IsActive { get; set; }
            public DateTime CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
        }

        /// <summary>
        /// الحصول على جميع المنتجات
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProductResponseDto>>> GetProducts(
            [FromQuery] int? categoryId,
            [FromQuery] string? search)
        {
            var accountId = GetAccountId();
            
            var query = _context.Products
                .Include(p => p.Category)
                .Include(p => p.Unit)
                .Where(p => p.AccountId == accountId && p.IsActive)
                .AsQueryable();

            if (categoryId.HasValue)
                query = query.Where(p => p.CategoryId == categoryId.Value);

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(p => 
                    p.Name.Contains(search) || 
                    (p.Code != null && p.Code.Contains(search)) || 
                    (p.Barcode != null && p.Barcode.Contains(search)));
            }

            var products = await query.OrderByDescending(p => p.Id)
                .Select(p => new ProductResponseDto
                {
                    Id = p.Id,
                    AccountId = p.AccountId,
                    Code = p.Code,
                    Barcode = p.Barcode,
                    Name = p.Name,
                    NameEn = p.NameEn,
                    Description = p.Description,
                    ImageUrl = p.ImageUrl,
                    UnitId = p.UnitId,
                    Unit = p.Unit != null ? p.Unit.Name : null,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category != null ? p.Category.Name : null,
                    CostPrice = p.CostPrice,
                    SellingPrice = p.SellingPrice,
                    StockQuantity = p.StockQuantity,
                    MinStockLevel = p.MinStockLevel,
                    TaxPercent = p.TaxPercent,
                    IsActive = p.IsActive,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt
                })
                .ToListAsync();

            return Ok(products);
        }

        /// <summary>
        /// البحث بالباركود
        /// </summary>
        [HttpGet("barcode/{barcode}")]
        public async Task<ActionResult<Product>> GetProductByBarcode(string barcode)
        {
            var accountId = GetAccountId();
            
            var product = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.ProductUnits)
                .ThenInclude(pu => pu.Unit)
                .FirstOrDefaultAsync(p => 
                    p.AccountId == accountId &&
                    (p.Barcode == barcode || p.ProductUnits.Any(pu => pu.Barcode == barcode)));

            if (product == null)
            {
                return NotFound();
            }

            return product;
        }

        /// <summary>
        /// الحصول على منتج بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<ProductResponseDto>> GetProduct(int id)
        {
            var accountId = GetAccountId();
            
            var product = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Unit)
                .FirstOrDefaultAsync(p => p.Id == id && p.AccountId == accountId);

            if (product == null)
            {
                return NotFound();
            }

            return new ProductResponseDto
            {
                Id = product.Id,
                AccountId = product.AccountId,
                Code = product.Code,
                Barcode = product.Barcode,
                Name = product.Name,
                NameEn = product.NameEn,
                Description = product.Description,
                ImageUrl = product.ImageUrl,
                UnitId = product.UnitId,
                Unit = product.Unit?.Name,
                CategoryId = product.CategoryId,
                CategoryName = product.Category?.Name,
                CostPrice = product.CostPrice,
                SellingPrice = product.SellingPrice,
                StockQuantity = product.StockQuantity,
                MinStockLevel = product.MinStockLevel,
                TaxPercent = product.TaxPercent,
                IsActive = product.IsActive,
                CreatedAt = product.CreatedAt,
                UpdatedAt = product.UpdatedAt
            };
        }

        // DTO لإنشاء منتج جديد
        public class CreateProductDto
        {
            public string? Code { get; set; }
            public string? Barcode { get; set; }
            public string Name { get; set; } = string.Empty;
            public string? NameEn { get; set; }
            public string? Description { get; set; }
            public string? ImageUrl { get; set; }
            public int? UnitId { get; set; }
            public string? Unit { get; set; }  // اسم الوحدة كنص
            public int? CategoryId { get; set; }
            public decimal CostPrice { get; set; }
            public decimal SellingPrice { get; set; }
            public decimal StockQuantity { get; set; }
            public decimal MinStockLevel { get; set; }
            public decimal TaxPercent { get; set; }
            public bool IsActive { get; set; } = true;
        }

        /// <summary>
        /// إنشاء منتج جديد
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<ProductResponseDto>> CreateProduct([FromBody] CreateProductDto dto)
        {
            var accountId = GetAccountId();
            
            // تحويل اسم الوحدة إلى UnitId إذا تم إرساله
            int? unitId = dto.UnitId;
            if (!unitId.HasValue && !string.IsNullOrEmpty(dto.Unit))
            {
                // البحث عن الوحدة بالاسم ضمن الحساب الحالي
                var unit = await _context.Units
                    .FirstOrDefaultAsync(u => u.Name == dto.Unit && u.AccountId == accountId && u.IsActive);
                if (unit != null)
                {
                    unitId = unit.Id;
                }
            }

            var product = new Product
            {
                AccountId = accountId,
                Code = dto.Code,
                Barcode = dto.Barcode,
                Name = dto.Name,
                NameEn = dto.NameEn,
                Description = dto.Description,
                ImageUrl = dto.ImageUrl,
                UnitId = unitId,
                CategoryId = dto.CategoryId,
                CostPrice = dto.CostPrice,
                SellingPrice = dto.SellingPrice,
                StockQuantity = dto.StockQuantity,
                MinStockLevel = dto.MinStockLevel,
                TaxPercent = dto.TaxPercent,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = GetUserId()
            };
            
            // توليد كود المنتج تلقائياً
            if (string.IsNullOrEmpty(product.Code))
            {
                var lastProduct = await _context.Products
                    .Where(p => p.AccountId == accountId)
                    .OrderByDescending(p => p.Id)
                    .FirstOrDefaultAsync();

                var nextNumber = (lastProduct?.Id ?? 0) + 1;
                product.Code = $"P{nextNumber:D4}";
            }

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            // جلب اسم الوحدة
            string? unitName = null;
            if (product.UnitId.HasValue)
            {
                var unitEntity = await _context.Units.FindAsync(product.UnitId.Value);
                unitName = unitEntity?.Name;
            }

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId() ?? 1, ActivityActions.CreateProduct, EntityTypes.Product,
                product.Id, product.Name, $"تم إنشاء منتج جديد: {product.Name} (الكود: {product.Code})");

            return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, new ProductResponseDto
            {
                Id = product.Id,
                AccountId = product.AccountId,
                Code = product.Code,
                Barcode = product.Barcode,
                Name = product.Name,
                NameEn = product.NameEn,
                Description = product.Description,
                ImageUrl = product.ImageUrl,
                UnitId = product.UnitId,
                Unit = unitName,
                CategoryId = product.CategoryId,
                CostPrice = product.CostPrice,
                SellingPrice = product.SellingPrice,
                StockQuantity = product.StockQuantity,
                MinStockLevel = product.MinStockLevel,
                TaxPercent = product.TaxPercent,
                IsActive = product.IsActive,
                CreatedAt = product.CreatedAt
            });
        }

        // DTO لتحديث منتج
        public class UpdateProductDto
        {
            public int Id { get; set; }
            public string Code { get; set; } = string.Empty;
            public string? Barcode { get; set; }
            public string Name { get; set; } = string.Empty;
            public string? NameEn { get; set; }
            public string? Description { get; set; }
            public string? ImageUrl { get; set; }
            public int? UnitId { get; set; }
            public string? Unit { get; set; }  // اسم الوحدة كنص
            public int? CategoryId { get; set; }
            public decimal CostPrice { get; set; }
            public decimal SellingPrice { get; set; }
            public decimal StockQuantity { get; set; }
            public decimal MinStockLevel { get; set; }
            public decimal TaxPercent { get; set; }
            public bool IsActive { get; set; } = true;
        }

        /// <summary>
        /// تحديث منتج
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] UpdateProductDto dto)
        {
            if (id != dto.Id)
            {
                return BadRequest("معرف المنتج غير متطابق");
            }

            var accountId = GetAccountId();
            var existingProduct = await _context.Products
                .FirstOrDefaultAsync(p => p.Id == id && p.AccountId == accountId);

            if (existingProduct == null)
            {
                return NotFound("المنتج غير موجود");
            }

            // تحويل اسم الوحدة إلى UnitId إذا تم إرساله
            int? unitId = dto.UnitId;
            if (!unitId.HasValue && !string.IsNullOrEmpty(dto.Unit))
            {
                // البحث عن الوحدة بالاسم ضمن الحساب الحالي
                var unit = await _context.Units
                    .FirstOrDefaultAsync(u => u.Name == dto.Unit && u.AccountId == accountId && u.IsActive);
                if (unit != null)
                {
                    unitId = unit.Id;
                }
            }

            // تحديث الحقول
            existingProduct.Code = dto.Code ?? existingProduct.Code;
            existingProduct.Barcode = dto.Barcode;
            existingProduct.Name = dto.Name;
            existingProduct.NameEn = dto.NameEn;
            existingProduct.Description = dto.Description;
            existingProduct.ImageUrl = dto.ImageUrl;
            existingProduct.UnitId = unitId;
            existingProduct.CategoryId = dto.CategoryId;
            existingProduct.CostPrice = dto.CostPrice;
            existingProduct.SellingPrice = dto.SellingPrice;
            existingProduct.StockQuantity = dto.StockQuantity;
            existingProduct.MinStockLevel = dto.MinStockLevel;
            existingProduct.TaxPercent = dto.TaxPercent;
            existingProduct.IsActive = dto.IsActive;
            existingProduct.UpdatedAt = DateTime.UtcNow;
            existingProduct.UpdatedByUserId = GetUserId();

            try
            {
                await _context.SaveChangesAsync();
                
                // تسجيل النشاط
                await _activityLog.LogAsync(accountId, GetUserId() ?? 1, ActivityActions.UpdateProduct, EntityTypes.Product,
                    existingProduct.Id, existingProduct.Name, $"تم تعديل المنتج: {existingProduct.Name}");
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProductExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        /// <summary>
        /// حذف منتج (تعطيل)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var accountId = GetAccountId();
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.AccountId == accountId);
            if (product == null)
            {
                return NotFound();
            }

            // تسجيل النشاط
            await _activityLog.LogAsync(accountId, GetUserId() ?? 1, ActivityActions.DeleteProduct, EntityTypes.Product,
                product.Id, product.Name, $"تم حذف المنتج: {product.Name}");

            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// الحصول على المنتجات ذات المخزون المنخفض
        /// </summary>
        [HttpGet("low-stock")]
        public async Task<ActionResult<IEnumerable<Product>>> GetLowStockProducts()
        {
            var accountId = GetAccountId();
            
            return await _context.Products
                .Where(p => p.AccountId == accountId && p.IsActive && p.StockQuantity <= p.MinStockLevel)
                .OrderBy(p => p.StockQuantity)
                .ToListAsync();
        }

        /// <summary>
        /// إضافة وحدة للمنتج
        /// </summary>
        [HttpPost("{id}/units")]
        public async Task<ActionResult<ProductUnit>> AddProductUnit(int id, ProductUnit productUnit)
        {
            var accountId = GetAccountId();
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.AccountId == accountId);
            if (product == null)
            {
                return NotFound();
            }

            productUnit.ProductId = id;
            _context.ProductUnits.Add(productUnit);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProduct), new { id = id }, productUnit);
        }

        /// <summary>
        /// الحصول على التصنيفات
        /// </summary>
        [HttpGet("categories")]
        public async Task<ActionResult<IEnumerable<ProductCategory>>> GetCategories()
        {
            var accountId = GetAccountId();
            
            return await _context.ProductCategories
                .Where(c => c.AccountId == accountId && c.IsActive)
                .Include(c => c.ChildCategories)
                .Where(c => c.ParentCategoryId == null)
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        private bool ProductExists(int id)
        {
            var accountId = GetAccountId();
            return _context.Products.Any(e => e.Id == id && e.AccountId == accountId);
        }
    }
}
