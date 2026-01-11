namespace SmartAccountant.API.Models
{
    /// <summary>
    /// المستخدم - تابع لحساب معين
    /// </summary>
    public class User
    {
        public int Id { get; set; }
        
        // ربط بالحساب
        public int AccountId { get; set; }
        public Account? Account { get; set; }
        
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        
        /// <summary>
        /// الدور القديم (للتوافق) - استخدم UserRoles بدلاً منه
        /// </summary>
        public UserRoleType RoleType { get; set; } = UserRoleType.User;
        
        /// <summary>
        /// صورة المستخدم
        /// </summary>
        public string? AvatarUrl { get; set; }
        
        /// <summary>
        /// الوظيفة/المسمى الوظيفي
        /// </summary>
        public string? JobTitle { get; set; }
        
        /// <summary>
        /// القسم
        /// </summary>
        public string? Department { get; set; }
        
        /// <summary>
        /// هل هو مدير عام (Super Admin)
        /// </summary>
        public bool IsSuperAdmin { get; set; } = false;
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; set; }
        public string? LastLoginIp { get; set; }
        
        /// <summary>
        /// عدد محاولات الدخول الفاشلة
        /// </summary>
        public int FailedLoginAttempts { get; set; } = 0;
        
        /// <summary>
        /// تاريخ القفل
        /// </summary>
        public DateTime? LockoutEnd { get; set; }
        
        /// <summary>
        /// هل تم التحقق من البريد؟
        /// </summary>
        public bool EmailVerified { get; set; } = false;
        
        /// <summary>
        /// هل تم التحقق من الهاتف؟
        /// </summary>
        public bool PhoneVerified { get; set; } = false;
        
        /// <summary>
        /// اللغة المفضلة
        /// </summary>
        public string PreferredLanguage { get; set; } = "ar";
        
        /// <summary>
        /// المنطقة الزمنية
        /// </summary>
        public string? TimeZone { get; set; }

        /// <summary>
        /// الحد الأقصى لعدد حروف الرسالة للمستخدم (0 = استخدام حد الحساب، -1 = بدون حد)
        /// </summary>
        public int MaxMessageLength { get; set; } = 0;

        /// <summary>
        /// الحد الأقصى لعدد حروف الإشعار للمستخدم (0 = استخدام حد الحساب، -1 = بدون حد)
        /// </summary>
        public int MaxNotificationLength { get; set; } = 0;
        
        // صلاحيات المستخدم القديمة (للتوافق)
        public bool CanManageProducts { get; set; } = true;
        public bool CanManageCustomers { get; set; } = true;
        public bool CanCreateInvoices { get; set; } = true;
        public bool CanManageExpenses { get; set; } = true;
        public bool CanViewReports { get; set; } = true;
        public bool CanManageSettings { get; set; } = false;
        public bool CanManageUsers { get; set; } = false;
        
        // Navigation Properties
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public ICollection<Message> SentMessages { get; set; } = new List<Message>();
        public ICollection<Message> ReceivedMessages { get; set; } = new List<Message>();
        public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
    }

    public enum UserRoleType
    {
        Owner = 0,      // صاحب الحساب
        Admin = 1,      // مدير النظام
        Manager = 2,    // مدير
        Accountant = 3, // محاسب
        Sales = 4,      // مبيعات
        User = 5        // مستخدم عادي
    }
}
