namespace SmartAccountant.API.Models
{
    /// <summary>
    /// الدور/المجموعة - لتجميع الصلاحيات
    /// </summary>
    public class Role
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        /// <summary>
        /// اسم الدور
        /// </summary>
        public string Name { get; set; } = string.Empty;
        
        /// <summary>
        /// اسم الدور بالإنجليزي
        /// </summary>
        public string? NameEn { get; set; }
        
        /// <summary>
        /// وصف الدور
        /// </summary>
        public string? Description { get; set; }
        
        /// <summary>
        /// هل هو دور نظام (لا يمكن حذفه)
        /// </summary>
        public bool IsSystemRole { get; set; } = false;
        
        /// <summary>
        /// لون الدور للعرض
        /// </summary>
        public string? Color { get; set; }
        
        /// <summary>
        /// أيقونة الدور
        /// </summary>
        public string? Icon { get; set; }
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation Properties
        public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    }

    /// <summary>
    /// الصلاحية
    /// </summary>
    public class Permission
    {
        public int Id { get; set; }
        
        /// <summary>
        /// كود الصلاحية الفريد
        /// </summary>
        public string Code { get; set; } = string.Empty;
        
        /// <summary>
        /// اسم الصلاحية
        /// </summary>
        public string Name { get; set; } = string.Empty;
        
        /// <summary>
        /// اسم الصلاحية بالإنجليزي
        /// </summary>
        public string? NameEn { get; set; }
        
        /// <summary>
        /// وصف الصلاحية
        /// </summary>
        public string? Description { get; set; }
        
        /// <summary>
        /// المجموعة/الوحدة (Products, Invoices, etc.)
        /// </summary>
        public string Module { get; set; } = string.Empty;
        
        /// <summary>
        /// نوع العملية
        /// </summary>
        public PermissionType Type { get; set; }
        
        /// <summary>
        /// ترتيب العرض
        /// </summary>
        public int SortOrder { get; set; }
        
        // Navigation Properties
        public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }

    /// <summary>
    /// ربط الدور بالصلاحيات
    /// </summary>
    public class RolePermission
    {
        public int Id { get; set; }
        public int RoleId { get; set; }
        public Role Role { get; set; } = null!;
        public int PermissionId { get; set; }
        public Permission Permission { get; set; } = null!;
    }

    /// <summary>
    /// ربط المستخدم بالأدوار
    /// </summary>
    public class UserRole
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public int RoleId { get; set; }
        public Role Role { get; set; } = null!;
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public int? AssignedByUserId { get; set; }
        public User? AssignedByUser { get; set; }
    }

    /// <summary>
    /// عنصر القائمة - للتحكم في القوائم الظاهرة
    /// </summary>
    public class MenuItem
    {
        public int Id { get; set; }
        
        /// <summary>
        /// كود العنصر الفريد
        /// </summary>
        public string Code { get; set; } = string.Empty;
        
        /// <summary>
        /// عنوان العنصر
        /// </summary>
        public string Title { get; set; } = string.Empty;
        
        /// <summary>
        /// عنوان العنصر بالإنجليزي
        /// </summary>
        public string? TitleEn { get; set; }
        
        /// <summary>
        /// الأيقونة
        /// </summary>
        public string? Icon { get; set; }
        
        /// <summary>
        /// المسار/الرابط
        /// </summary>
        public string? Path { get; set; }
        
        /// <summary>
        /// العنصر الأب (للقوائم الفرعية)
        /// </summary>
        public int? ParentId { get; set; }
        public MenuItem? Parent { get; set; }
        
        /// <summary>
        /// الصلاحية المطلوبة لرؤية العنصر
        /// </summary>
        public string? RequiredPermission { get; set; }
        
        /// <summary>
        /// ترتيب العرض
        /// </summary>
        public int SortOrder { get; set; }
        
        /// <summary>
        /// هل يظهر في الشريط الجانبي؟
        /// </summary>
        public bool ShowInSidebar { get; set; } = true;
        
        /// <summary>
        /// هل يظهر في الهيدر؟
        /// </summary>
        public bool ShowInHeader { get; set; } = false;
        
        public bool IsActive { get; set; } = true;
        
        // Navigation Properties
        public ICollection<MenuItem> Children { get; set; } = new List<MenuItem>();
    }

    public enum PermissionType
    {
        View = 1,       // عرض
        Create = 2,     // إنشاء
        Edit = 3,       // تعديل
        Delete = 4,     // حذف
        Export = 5,     // تصدير
        Import = 6,     // استيراد
        Print = 7,      // طباعة
        Approve = 8,    // اعتماد
        Full = 9        // كامل الصلاحيات
    }
}
