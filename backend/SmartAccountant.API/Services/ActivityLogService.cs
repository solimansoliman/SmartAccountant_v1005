using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Services
{
    /// <summary>
    /// خدمة تسجيل النشاطات في النظام
    /// </summary>
    public interface IActivityLogService
    {
        Task LogAsync(ActivityLogEntry entry);
        Task LogAsync(int accountId, int userId, string action, string entityType, 
            int? entityId = null, string? entityName = null, string? description = null,
            string? oldValues = null, string? newValues = null);
    }

    public class ActivityLogEntry
    {
        public int AccountId { get; set; }
        public int UserId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string EntityType { get; set; } = string.Empty;
        public int? EntityId { get; set; }
        public string? EntityName { get; set; }
        public string? Description { get; set; }
        public string? DescriptionEn { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? Changes { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public string? Browser { get; set; }
        public string? Platform { get; set; }
    }

    public class ActivityLogService : IActivityLogService
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ActivityLogService(ApplicationDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task LogAsync(ActivityLogEntry entry)
        {
            var httpContext = _httpContextAccessor.HttpContext;
            
            var log = new ActivityLog
            {
                AccountId = entry.AccountId,
                UserId = entry.UserId,
                Action = entry.Action,
                EntityType = entry.EntityType,
                EntityId = entry.EntityId,
                EntityName = entry.EntityName,
                Description = entry.Description,
                DescriptionEn = entry.DescriptionEn,
                OldValues = entry.OldValues,
                NewValues = entry.NewValues,
                Changes = entry.Changes,
                IpAddress = entry.IpAddress ?? httpContext?.Connection?.RemoteIpAddress?.ToString(),
                UserAgent = httpContext?.Request?.Headers["User-Agent"].ToString(),
                Browser = entry.Browser ?? GetBrowserFromUserAgent(httpContext?.Request?.Headers["User-Agent"].ToString()),
                Platform = entry.Platform ?? GetPlatformFromUserAgent(httpContext?.Request?.Headers["User-Agent"].ToString()),
                CreatedAt = DateTime.UtcNow
            };

            _context.ActivityLogs.Add(log);
            await _context.SaveChangesAsync();
        }

        public async Task LogAsync(int accountId, int userId, string action, string entityType,
            int? entityId = null, string? entityName = null, string? description = null,
            string? oldValues = null, string? newValues = null)
        {
            await LogAsync(new ActivityLogEntry
            {
                AccountId = accountId,
                UserId = userId,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                EntityName = entityName,
                Description = description,
                OldValues = oldValues,
                NewValues = newValues
            });
        }

        private string? GetBrowserFromUserAgent(string? userAgent)
        {
            if (string.IsNullOrEmpty(userAgent)) return null;
            
            if (userAgent.Contains("Chrome")) return "Chrome";
            if (userAgent.Contains("Firefox")) return "Firefox";
            if (userAgent.Contains("Safari")) return "Safari";
            if (userAgent.Contains("Edge")) return "Edge";
            if (userAgent.Contains("Opera")) return "Opera";
            return "Unknown";
        }

        private string? GetPlatformFromUserAgent(string? userAgent)
        {
            if (string.IsNullOrEmpty(userAgent)) return null;
            
            if (userAgent.Contains("Windows")) return "Windows";
            if (userAgent.Contains("Mac")) return "macOS";
            if (userAgent.Contains("Linux")) return "Linux";
            if (userAgent.Contains("Android")) return "Android";
            if (userAgent.Contains("iPhone") || userAgent.Contains("iPad")) return "iOS";
            return "Unknown";
        }
    }

    /// <summary>
    /// أنواع الإجراءات المعروفة
    /// </summary>
    public static class ActivityActions
    {
        // تسجيل الدخول والخروج
        public const string Login = "تسجيل دخول";
        public const string Logout = "تسجيل خروج";
        public const string LoginFailed = "فشل تسجيل الدخول";
        
        // العمليات الأساسية
        public const string Create = "إنشاء";
        public const string Update = "تعديل";
        public const string Delete = "حذف";
        public const string View = "عرض";
        
        // عمليات الحساب
        public const string UpdateLogo = "تحديث الشعار";
        public const string UpdateSettings = "تحديث الإعدادات";
        public const string ChangePassword = "تغيير كلمة المرور";
        public const string ResetPassword = "إعادة تعيين كلمة المرور";
        
        // عمليات المستخدم
        public const string ActivateUser = "تفعيل مستخدم";
        public const string DeactivateUser = "إلغاء تفعيل مستخدم";
        public const string AssignRole = "تعيين دور";
        
        // عمليات الفواتير
        public const string CreateInvoice = "إنشاء فاتورة";
        public const string UpdateInvoice = "تعديل فاتورة";
        public const string DeleteInvoice = "حذف فاتورة";
        public const string PrintInvoice = "طباعة فاتورة";
        
        // عمليات المنتجات
        public const string CreateProduct = "إنشاء منتج";
        public const string UpdateProduct = "تعديل منتج";
        public const string DeleteProduct = "حذف منتج";
        public const string UpdateStock = "تحديث المخزون";
        
        // عمليات العملاء
        public const string CreateCustomer = "إنشاء عميل";
        public const string UpdateCustomer = "تعديل عميل";
        public const string DeleteCustomer = "حذف عميل";
        
        // عمليات المصروفات
        public const string CreateExpense = "إنشاء مصروف";
        public const string UpdateExpense = "تعديل مصروف";
        public const string DeleteExpense = "حذف مصروف";
        
        // عمليات الإيرادات
        public const string CreateRevenue = "إنشاء إيراد";
        public const string UpdateRevenue = "تعديل إيراد";
        public const string DeleteRevenue = "حذف إيراد";
        
        // عمليات الدفع
        public const string CreatePayment = "إنشاء دفعة";
        public const string UpdatePayment = "تعديل دفعة";
        public const string DeletePayment = "حذف دفعة";
        
        // عمليات الوحدات
        public const string CreateUnit = "إنشاء وحدة";
        public const string UpdateUnit = "تعديل وحدة";
        public const string DeleteUnit = "حذف وحدة";
        
        // عمليات الأدوار
        public const string CreateRole = "إنشاء دور";
        public const string UpdateRole = "تعديل دور";
        public const string DeleteRole = "حذف دور";
        public const string UpdatePermissions = "تحديث الصلاحيات";
        
        // عمليات النظام
        public const string ExportData = "تصدير بيانات";
        public const string ImportData = "استيراد بيانات";
        public const string BackupData = "نسخ احتياطي";
        public const string RestoreData = "استعادة بيانات";
    }

    /// <summary>
    /// أنواع الكيانات
    /// </summary>
    public static class EntityTypes
    {
        public const string Account = "حساب";
        public const string User = "مستخدم";
        public const string Product = "منتج";
        public const string Customer = "عميل";
        public const string Invoice = "فاتورة";
        public const string Expense = "مصروف";
        public const string Revenue = "إيراد";
        public const string Payment = "دفعة";
        public const string Unit = "وحدة";
        public const string Currency = "عملة";
        public const string Role = "دور";
        public const string Permission = "صلاحية";
        public const string Settings = "إعدادات";
        public const string Notification = "إشعار";
        public const string Message = "رسالة";
        public const string Tag = "وسم";
        public const string System = "النظام";
    }
}
