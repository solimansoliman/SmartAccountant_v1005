using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Data
{
    /// <summary>
    /// سياق قاعدة البيانات الرئيسي
    /// ===============================
    /// ملاحظات مهمة للنصوص العربية:
    /// 1. جميع أعمدة النصوص من نوع NVARCHAR (وليس VARCHAR) لدعم Unicode
    /// 2. عند كتابة SQL Raw، يجب استخدام N'' للنصوص العربية
    ///    مثال: "UPDATE Table SET Name = N'اسم عربي'"
    /// 3. Entity Framework يتعامل مع Unicode تلقائياً عند استخدام الـ Models
    /// 4. الـ Collation المستخدم: Arabic_CI_AS
    /// </summary>
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // Accounts & Users
        public DbSet<Account> Accounts { get; set; }
        public DbSet<User> Users { get; set; }
        
        // Currencies
        public DbSet<Currency> Currencies { get; set; }
        
        // Products & Units
        public DbSet<Unit> Units { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<ProductCategory> ProductCategories { get; set; }
        public DbSet<ProductUnit> ProductUnits { get; set; }
        
        // Customers
        public DbSet<Customer> Customers { get; set; }
        
        // Invoices & Payments
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<InvoiceItem> InvoiceItems { get; set; }
        public DbSet<Payment> Payments { get; set; }

        // Expenses & Revenues
        public DbSet<Expense> Expenses { get; set; }
        public DbSet<ExpenseCategory> ExpenseCategories { get; set; }
        public DbSet<Revenue> Revenues { get; set; }
        public DbSet<RevenueCategory> RevenueCategories { get; set; }
        public DbSet<TransactionType> TransactionTypes { get; set; }
        
        // Notifications, Messages & Activity Logs
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<ActivityLog> ActivityLogs { get; set; }
        
        // Roles & Permissions
        public DbSet<Role> Roles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        
        // Tags
        public DbSet<Tag> Tags { get; set; }
        public DbSet<MenuItem> MenuItems { get; set; }
        
        // PhoneNumbers & Emails
        public DbSet<PhoneNumber> PhoneNumbers { get; set; }
        public DbSet<Email> Emails { get; set; }
        
        // System Settings
        public DbSet<SystemSetting> SystemSettings { get; set; }

        // Logos
        public DbSet<Logo> Logos { get; set; }
        public DbSet<AccountLogoSettings> AccountLogoSettings { get; set; }

        // Attachments & Comments
        public DbSet<Attachment> Attachments { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<EntityTag> EntityTags { get; set; }

        // Plans
        public DbSet<Plan> Plans { get; set; }
        
        // Subscriptions
        public DbSet<Subscription> Subscriptions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Currency Configuration
            modelBuilder.Entity<Currency>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Code).IsRequired().HasMaxLength(10);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Symbol).IsRequired().HasMaxLength(10);
                entity.Property(e => e.SubUnit).HasMaxLength(50);
                entity.Property(e => e.Country).HasMaxLength(100);
                entity.Property(e => e.CountryCode).HasMaxLength(5);
                entity.Property(e => e.Flag).HasMaxLength(20);
                entity.Property(e => e.ExchangeRate).HasPrecision(18, 6);
                entity.HasIndex(e => e.Code).IsUnique();
            });

            // Account Configuration
            modelBuilder.Entity<Account>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Email).HasMaxLength(100);
                entity.Property(e => e.Phone).HasMaxLength(20);
                entity.Property(e => e.CurrencySymbol).HasMaxLength(10).HasDefaultValue("ج.م");
                entity.Property(e => e.Address).HasMaxLength(500);
                entity.Property(e => e.TaxNumber).HasMaxLength(50);
                entity.Property(e => e.LogoUrl).HasMaxLength(500);
                
                entity.HasOne(e => e.Currency)
                    .WithMany(c => c.Accounts)
                    .HasForeignKey(e => e.CurrencyId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // User Configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
                entity.Property(e => e.PasswordHash).IsRequired();
                entity.Property(e => e.FullName).IsRequired().HasMaxLength(100);
                entity.HasIndex(e => new { e.AccountId, e.Username }).IsUnique();
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Users)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Unit Configuration
            modelBuilder.Entity<Unit>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Symbol).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ConversionFactor).HasPrecision(18, 6);
                    
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Units)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.BaseUnit)
                    .WithMany(e => e.DerivedUnits)
                    .HasForeignKey(e => e.BaseUnitId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ProductCategory Configuration
            modelBuilder.Entity<ProductCategory>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.ProductCategories)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                
                entity.HasOne(e => e.ParentCategory)
                    .WithMany(e => e.ChildCategories)
                    .HasForeignKey(e => e.ParentCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Product Configuration
            modelBuilder.Entity<Product>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Barcode).HasMaxLength(50);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.CostPrice).HasPrecision(18, 2);
                entity.Property(e => e.SellingPrice).HasPrecision(18, 2);
                entity.Property(e => e.StockQuantity).HasPrecision(18, 3);
                entity.Property(e => e.MinStockLevel).HasPrecision(18, 3);
                entity.Property(e => e.TaxPercent).HasPrecision(5, 2);
                entity.HasIndex(e => new { e.AccountId, e.Code }).IsUnique();
                entity.HasIndex(e => new { e.AccountId, e.Barcode });
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Products)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                
                // ربط المنتج بالوحدة الأساسية
                entity.HasOne(e => e.Unit)
                    .WithMany()
                    .HasForeignKey(e => e.UnitId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.UpdatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ProductUnit Configuration
            modelBuilder.Entity<ProductUnit>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ConversionFactor).HasPrecision(18, 6);
                entity.Property(e => e.SellingPrice).HasPrecision(18, 2);
                entity.Property(e => e.CostPrice).HasPrecision(18, 2);
                entity.Property(e => e.Barcode).HasMaxLength(50);
                
                entity.HasOne(e => e.Product)
                    .WithMany(e => e.ProductUnits)
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(e => e.Unit)
                    .WithMany(e => e.ProductUnits)
                    .HasForeignKey(e => e.UnitId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Customer Configuration
            modelBuilder.Entity<Customer>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.TaxNumber).HasMaxLength(50);
                entity.Property(e => e.CreditLimit).HasPrecision(18, 2);
                entity.Property(e => e.Balance).HasPrecision(18, 2);
                entity.HasIndex(e => new { e.AccountId, e.Code }).IsUnique();
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Customers)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                
                // Phone FK relationships
                entity.HasOne(e => e.PrimaryPhone)
                    .WithMany()
                    .HasForeignKey(e => e.PrimaryPhoneId)
                    .OnDelete(DeleteBehavior.SetNull);
                    
                entity.HasOne(e => e.SecondaryPhone)
                    .WithMany()
                    .HasForeignKey(e => e.SecondaryPhoneId)
                    .OnDelete(DeleteBehavior.SetNull);
                    
                // Email FK relationship
                entity.HasOne(e => e.PrimaryEmail)
                    .WithMany()
                    .HasForeignKey(e => e.PrimaryEmailId)
                    .OnDelete(DeleteBehavior.SetNull);
                    
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.UpdatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Invoice Configuration
            modelBuilder.Entity<Invoice>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.InvoiceNumber).IsRequired().HasMaxLength(50);
                entity.Property(e => e.SubTotal).HasPrecision(18, 2);
                entity.Property(e => e.DiscountAmount).HasPrecision(18, 2);
                entity.Property(e => e.DiscountPercent).HasPrecision(5, 2);
                entity.Property(e => e.TaxAmount).HasPrecision(18, 2);
                entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
                entity.Property(e => e.PaidAmount).HasPrecision(18, 2);
                
                // تحويل الـ enums إلى int
                entity.Property(e => e.InvoiceType).HasConversion<int>();
                entity.Property(e => e.Status).HasConversion<int>();
                entity.Property(e => e.PaymentMethod).HasConversion<int>();
                
                // تجاهل العمود Type القديم (nvarchar)
                entity.Ignore("Type");
                
                entity.HasIndex(e => new { e.AccountId, e.InvoiceNumber }).IsUnique();
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Invoices)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.Customer)
                    .WithMany(e => e.Invoices)
                    .HasForeignKey(e => e.CustomerId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.UpdatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // InvoiceItem Configuration
            modelBuilder.Entity<InvoiceItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ProductName).HasMaxLength(200);
                entity.Property(e => e.Quantity).HasPrecision(18, 3);
                entity.Property(e => e.UnitPrice).HasPrecision(18, 2);
                entity.Property(e => e.DiscountPercent).HasPrecision(5, 2);
                entity.Property(e => e.DiscountAmount).HasPrecision(18, 2);
                entity.Property(e => e.TaxPercent).HasPrecision(5, 2);
                entity.Property(e => e.TaxAmount).HasPrecision(18, 2);
                entity.Property(e => e.LineTotal).HasPrecision(18, 2);
                
                entity.HasOne(e => e.Invoice)
                    .WithMany(e => e.Items)
                    .HasForeignKey(e => e.InvoiceId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(e => e.Product)
                    .WithMany(e => e.InvoiceItems)
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.Unit)
                    .WithMany()
                    .HasForeignKey(e => e.UnitId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Payment Configuration
            modelBuilder.Entity<Payment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Amount).HasPrecision(18, 2);
                entity.Property(e => e.ExchangeRate).HasPrecision(18, 2);
                entity.Property(e => e.ReferenceNumber).HasMaxLength(100);
                entity.Property(e => e.PaymentNumber).HasMaxLength(50);
                entity.Property(e => e.BankName).HasMaxLength(100);
                entity.Property(e => e.CheckNumber).HasMaxLength(50);
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Payments)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                
                entity.HasOne(e => e.Invoice)
                    .WithMany(e => e.Payments)
                    .HasForeignKey(e => e.InvoiceId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.Customer)
                    .WithMany()
                    .HasForeignKey(e => e.CustomerId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ExpenseCategory Configuration
            modelBuilder.Entity<ExpenseCategory>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Code).HasMaxLength(50);
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.ExpenseCategories)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                
                entity.HasOne(e => e.ParentCategory)
                    .WithMany(e => e.ChildCategories)
                    .HasForeignKey(e => e.ParentCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // TransactionType Configuration
            modelBuilder.Entity<TransactionType>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.NameEn).HasMaxLength(100);
                entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.Color).HasMaxLength(20);
                entity.Property(e => e.Icon).HasMaxLength(50);
                entity.HasIndex(e => new { e.AccountId, e.Code }).IsUnique();
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.TransactionTypes)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Expense Configuration
            modelBuilder.Entity<Expense>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ExpenseNumber).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Amount).HasPrecision(18, 2);
                entity.Property(e => e.TaxAmount).HasPrecision(18, 2);
                entity.Property(e => e.NetAmount).HasPrecision(18, 2);
                entity.Property(e => e.ReferenceNumber).HasMaxLength(100);
                entity.HasIndex(e => new { e.AccountId, e.ExpenseNumber }).IsUnique();
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Expenses)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                
                entity.HasOne(e => e.TransactionType)
                    .WithMany(e => e.Expenses)
                    .HasForeignKey(e => e.TransactionTypeId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.Category)
                    .WithMany(e => e.Expenses)
                    .HasForeignKey(e => e.CategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // RevenueCategory Configuration
            modelBuilder.Entity<RevenueCategory>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Code).HasMaxLength(50);
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.RevenueCategories)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                
                entity.HasOne(e => e.ParentCategory)
                    .WithMany(e => e.ChildCategories)
                    .HasForeignKey(e => e.ParentCategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Revenue Configuration
            modelBuilder.Entity<Revenue>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.RevenueNumber).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Amount).HasPrecision(18, 2);
                entity.Property(e => e.TaxAmount).HasPrecision(18, 2);
                entity.Property(e => e.NetAmount).HasPrecision(18, 2);
                entity.Property(e => e.ExchangeRate).HasPrecision(18, 6);
                entity.Property(e => e.ReferenceNumber).HasMaxLength(100);
                entity.HasIndex(e => new { e.AccountId, e.RevenueNumber }).IsUnique();
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Revenues)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.Category)
                    .WithMany(e => e.Revenues)
                    .HasForeignKey(e => e.CategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Notification Configuration
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.TitleEn).HasMaxLength(200);
                entity.Property(e => e.Body).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.BodyEn).HasMaxLength(1000);
                entity.Property(e => e.ActionUrl).HasMaxLength(500);
                entity.Property(e => e.ActionText).HasMaxLength(200);
                entity.Property(e => e.Icon).HasMaxLength(100);
                entity.Property(e => e.EntityType).HasMaxLength(100);
                entity.Property(e => e.Notes).HasMaxLength(500);
                entity.HasIndex(e => new { e.AccountId, e.UserId, e.IsRead });
                entity.HasIndex(e => e.CreatedAt);
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Notifications)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.User)
                    .WithMany(u => u.Notifications)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Message Configuration
            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Subject).HasMaxLength(200);
                entity.Property(e => e.Content).IsRequired().HasMaxLength(4000);
                entity.Property(e => e.AttachmentUrl).HasMaxLength(500);
                entity.HasIndex(e => new { e.AccountId, e.ReceiverId, e.IsRead });
                entity.HasIndex(e => e.CreatedAt);
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Messages)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.Sender)
                    .WithMany(u => u.SentMessages)
                    .HasForeignKey(e => e.SenderId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.Receiver)
                    .WithMany(u => u.ReceivedMessages)
                    .HasForeignKey(e => e.ReceiverId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.ParentMessage)
                    .WithMany(e => e.Replies)
                    .HasForeignKey(e => e.ParentMessageId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ActivityLog Configuration
            modelBuilder.Entity<ActivityLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Action).IsRequired().HasMaxLength(100);
                entity.Property(e => e.EntityType).HasMaxLength(50);
                entity.Property(e => e.EntityName).HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.DescriptionEn).HasMaxLength(500);
                entity.Property(e => e.OldValues).HasMaxLength(4000);
                entity.Property(e => e.NewValues).HasMaxLength(4000);
                entity.Property(e => e.Changes).HasMaxLength(4000);
                entity.Property(e => e.IpAddress).HasMaxLength(50);
                entity.Property(e => e.UserAgent).HasMaxLength(500);
                entity.Property(e => e.Browser).HasMaxLength(100);
                entity.Property(e => e.Platform).HasMaxLength(100);
                entity.Property(e => e.Location).HasMaxLength(200);
                entity.Property(e => e.Notes).HasMaxLength(500);
                entity.HasIndex(e => new { e.AccountId, e.UserId, e.CreatedAt });
                entity.HasIndex(e => new { e.EntityType, e.EntityId });
                entity.HasIndex(e => e.Action);
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.ActivityLogs)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Role Configuration
            modelBuilder.Entity<Role>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.NameEn).HasMaxLength(100);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.Color).HasMaxLength(20);
                entity.Property(e => e.Icon).HasMaxLength(50);
                entity.HasIndex(e => new { e.AccountId, e.Name }).IsUnique();
                
                entity.HasOne(e => e.Account)
                    .WithMany(e => e.Roles)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Permission Configuration
            modelBuilder.Entity<Permission>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Code).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.NameEn).HasMaxLength(100);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.Module).IsRequired().HasMaxLength(50);
                entity.HasIndex(e => e.Code).IsUnique();
                entity.HasIndex(e => e.Module);
            });

            // RolePermission Configuration
            modelBuilder.Entity<RolePermission>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.RoleId, e.PermissionId }).IsUnique();
                
                entity.HasOne(e => e.Role)
                    .WithMany(e => e.RolePermissions)
                    .HasForeignKey(e => e.RoleId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(e => e.Permission)
                    .WithMany(e => e.RolePermissions)
                    .HasForeignKey(e => e.PermissionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // UserRole Configuration
            modelBuilder.Entity<UserRole>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.UserId, e.RoleId }).IsUnique();
                
                entity.HasOne(e => e.User)
                    .WithMany(e => e.UserRoles)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(e => e.Role)
                    .WithMany(e => e.UserRoles)
                    .HasForeignKey(e => e.RoleId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(e => e.AssignedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.AssignedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // MenuItem Configuration
            modelBuilder.Entity<MenuItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(100);
                entity.Property(e => e.TitleEn).HasMaxLength(100);
                entity.Property(e => e.Icon).HasMaxLength(50);
                entity.Property(e => e.Path).HasMaxLength(200);
                entity.Property(e => e.RequiredPermission).HasMaxLength(100);
                entity.HasIndex(e => e.Code).IsUnique();
                
                entity.HasOne(e => e.Parent)
                    .WithMany(e => e.Children)
                    .HasForeignKey(e => e.ParentId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // PhoneNumber Configuration
            modelBuilder.Entity<PhoneNumber>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EntityType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Phone).IsRequired().HasMaxLength(30);
                entity.Property(e => e.CountryCode).HasMaxLength(5);
                entity.Property(e => e.PhoneType).HasMaxLength(20).HasDefaultValue("mobile");
                entity.Property(e => e.Label).HasMaxLength(50);
                entity.Property(e => e.Notes).HasMaxLength(500);
                
                entity.HasIndex(e => new { e.EntityType, e.EntityId });
                entity.HasIndex(e => e.Phone);
                
                entity.HasOne(e => e.Account)
                    .WithMany()
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Email Configuration
            modelBuilder.Entity<Email>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EntityType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.EmailAddress).IsRequired().HasMaxLength(200);
                entity.Property(e => e.EmailType).HasMaxLength(20).HasDefaultValue("work");
                entity.Property(e => e.Label).HasMaxLength(50);
                entity.Property(e => e.VerificationToken).HasMaxLength(200);
                entity.Property(e => e.Notes).HasMaxLength(500);
                
                entity.HasIndex(e => new { e.EntityType, e.EntityId });
                entity.HasIndex(e => e.EmailAddress);
                
                entity.HasOne(e => e.Account)
                    .WithMany()
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // SystemSetting Configuration
            modelBuilder.Entity<SystemSetting>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SettingKey).IsRequired().HasMaxLength(100);
                entity.Property(e => e.SettingValue).IsRequired();
                entity.Property(e => e.SettingType).HasMaxLength(50).HasDefaultValue("string");
                entity.Property(e => e.Description).HasMaxLength(500);
                
                // مفتاح فريد: AccountId + SettingKey
                entity.HasIndex(e => new { e.AccountId, e.SettingKey }).IsUnique();
                
                entity.HasOne(e => e.Account)
                    .WithMany()
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Logo Configuration
            modelBuilder.Entity<Logo>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(100);
                entity.Property(e => e.LogoType).HasMaxLength(20).HasDefaultValue("Primary");
                entity.Property(e => e.StorageType).HasMaxLength(20).HasDefaultValue("Url");
                entity.Property(e => e.ImageUrl).HasMaxLength(500);
                entity.Property(e => e.MimeType).HasMaxLength(50);
                entity.Property(e => e.AltText).HasMaxLength(200);
                entity.Property(e => e.Notes).HasMaxLength(500);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.ShowLogo).HasDefaultValue(true);
                entity.Property(e => e.DisplayOrder).HasDefaultValue(0);
                
                entity.HasIndex(e => e.AccountId);
                entity.HasIndex(e => new { e.AccountId, e.LogoType });
                
                entity.HasOne(e => e.Account)
                    .WithMany(a => a.Logos)
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(e => e.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.UpdatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // AccountLogoSettings Configuration
            modelBuilder.Entity<AccountLogoSettings>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PreferredStorageType).HasMaxLength(20).HasDefaultValue("Url");
                entity.Property(e => e.EnableLogoDisplay).HasDefaultValue(true);
                entity.Property(e => e.MaxFileSizeKb).HasDefaultValue(2048);
                entity.Property(e => e.AllowedMimeTypes).HasMaxLength(500).HasDefaultValue("image/jpeg,image/png,image/gif,image/webp");
                
                entity.HasIndex(e => e.AccountId).IsUnique();
                
                entity.HasOne(e => e.Account)
                    .WithOne()
                    .HasForeignKey<AccountLogoSettings>(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(e => e.ActivePrimaryLogo)
                    .WithMany()
                    .HasForeignKey(e => e.ActivePrimaryLogoId)
                    .OnDelete(DeleteBehavior.NoAction);
                    
                entity.HasOne(e => e.ActiveFavicon)
                    .WithMany()
                    .HasForeignKey(e => e.ActiveFaviconId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // Attachment Configuration - المرفقات
            modelBuilder.Entity<Attachment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EntityType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.OriginalFileName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.FilePath).HasMaxLength(500);
                entity.Property(e => e.FileUrl).HasMaxLength(500);
                entity.Property(e => e.FileType).HasMaxLength(50);
                entity.Property(e => e.MimeType).HasMaxLength(100);
                entity.Property(e => e.Description).HasMaxLength(500);

                // Indexes for faster lookup
                entity.HasIndex(e => new { e.EntityType, e.EntityId });
                entity.HasIndex(e => e.AccountId);

                entity.HasOne(e => e.Account)
                    .WithMany()
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Comment Configuration - التعليقات
            modelBuilder.Entity<Comment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EntityType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Content).IsRequired();

                // Indexes for faster lookup
                entity.HasIndex(e => new { e.EntityType, e.EntityId });
                entity.HasIndex(e => e.AccountId);
                entity.HasIndex(e => e.ParentCommentId);

                entity.HasOne(e => e.Account)
                    .WithMany()
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.NoAction);

                // Self-referencing for nested comments (replies)
                entity.HasOne(e => e.ParentComment)
                    .WithMany(e => e.Replies)
                    .HasForeignKey(e => e.ParentCommentId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // EntityTag Configuration - ربط التاغات
            modelBuilder.Entity<EntityTag>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EntityType).IsRequired().HasMaxLength(50);

                // Unique constraint: prevent duplicate tags on same entity
                entity.HasIndex(e => new { e.TagId, e.EntityType, e.EntityId }).IsUnique();
                entity.HasIndex(e => new { e.EntityType, e.EntityId });

                entity.HasOne(e => e.Tag)
                    .WithMany()
                    .HasForeignKey(e => e.TagId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.SetNull);
            });
        }
    }
}
