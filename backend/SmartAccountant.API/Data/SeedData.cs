using SmartAccountant.API.Models;

namespace SmartAccountant.API.Data
{
    /// <summary>
    /// بيانات البذر الأولية للتطبيق
    /// ==============================
    /// إنشاء البيانات الأساسية الضرورية لتشغيل التطبيق
    /// </summary>
    public static class SeedData
    {
        public static void Initialize(ApplicationDbContext context)
        {
            try
            {
                // إذا كانت البيانات الأساسية موجودة، لا تضف بيانات جديدة
                if (context.Accounts.Any())
                {
                    EnsureDefaultRolesForAllAccounts(context);
                    EnsureDefaultUnitsForAllAccounts(context);
                    return;
                }

                // Create default currency (SAR)
                var sar = new Currency 
                { 
                    Code = "SAR", 
                    Name = "ريال سعودي", 
                    NameEn = "Saudi Riyal", 
                    Symbol = "ر.س", 
                    IsDefault = true, 
                    IsActive = true 
                };
                context.Currencies.Add(sar);
                context.SaveChanges();

                // Create default account
                var account = new Account
                {
                    Name = "شركة المحاسب الذكي",
                    NameEn = "Smart Accountant Demo",
                    Email = "admin@smartaccountant.local",
                    Phone = "0500000000",
                    CurrencyId = sar.Id,
                    CurrencySymbol = "ر.س",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    ConsentGiven = true
                };
                context.Accounts.Add(account);
                context.SaveChanges();

                // Create admin user with password: admin123
                var adminUser = new User
                {
                    AccountId = account.Id,
                    Username = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    FullName = "Admin User",
                    Email = "admin@smartaccountant.local",
                    RoleType = UserRoleType.Owner,
                    IsSuperAdmin = true,
                    IsActive = true,
                    CanCreateInvoices = true,
                    CanManageCustomers = true,
                    CanManageProducts = true,
                    CanManageExpenses = true,
                    CanViewReports = true,
                    CanManageSettings = true,
                    CanManageUsers = true,
                    CreatedAt = DateTime.UtcNow,
                    PreferredLanguage = "ar",
                    TimeZone = "UTC"
                };
                context.Users.Add(adminUser);
                context.SaveChanges();

                SeedDefaultRolesForAccount(context, account.Id, adminUser.Id);
                DefaultUnitsSeeder.EnsureForAccountAsync(context, account.Id, adminUser.Id).GetAwaiter().GetResult();

                // Seed Plans (خطط الاشتراك)
                var plans = new[]
                {
                    new Plan
                    {
                        Name = "الخطة الأساسية",
                        NameEn = "Basic Plan",
                        Description = "للشركات الصغيرة والناشئة",
                        Price = 99,
                        YearlyPrice = 990,
                        Currency = "ج.م",
                        Color = "blue",
                        Icon = "Zap",
                        IsPopular = false,
                        SortOrder = 1,
                        IsActive = true,
                        MaxUsers = 3,
                        MaxInvoices = 100,
                        MaxCustomers = 50,
                        MaxProducts = 100,
                        HasBasicReports = true,
                        HasAdvancedReports = false,
                        HasEmailSupport = true,
                        HasPrioritySupport = false,
                        HasDedicatedManager = false,
                        HasBackup = true,
                        BackupFrequency = "Weekly",
                        HasCustomInvoices = false,
                        HasMultiCurrency = false,
                        HasApiAccess = false,
                        HasOfflineMode = false,
                        HasWhiteLabel = false,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new Plan
                    {
                        Name = "الخطة الاحترافية",
                        NameEn = "Professional Plan",
                        Description = "للشركات المتوسطة",
                        Price = 299,
                        YearlyPrice = 2990,
                        Currency = "ج.م",
                        Color = "green",
                        Icon = "Zap",
                        IsPopular = true,
                        SortOrder = 2,
                        IsActive = true,
                        MaxUsers = 10,
                        MaxInvoices = 500,
                        MaxCustomers = 200,
                        MaxProducts = 500,
                        HasBasicReports = true,
                        HasAdvancedReports = true,
                        HasEmailSupport = true,
                        HasPrioritySupport = true,
                        HasDedicatedManager = false,
                        HasBackup = true,
                        BackupFrequency = "Daily",
                        HasCustomInvoices = true,
                        HasMultiCurrency = true,
                        HasApiAccess = true,
                        HasOfflineMode = true,
                        HasWhiteLabel = false,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new Plan
                    {
                        Name = "الخطة المتقدمة",
                        NameEn = "Enterprise Plan",
                        Description = "للمؤسسات الكبرى",
                        Price = 999,
                        YearlyPrice = 9990,
                        Currency = "ج.م",
                        Color = "purple",
                        Icon = "Crown",
                        IsPopular = false,
                        SortOrder = 3,
                        IsActive = true,
                        MaxUsers = 999,
                        MaxInvoices = 999999,
                        MaxCustomers = 999999,
                        MaxProducts = 999999,
                        HasBasicReports = true,
                        HasAdvancedReports = true,
                        HasEmailSupport = true,
                        HasPrioritySupport = true,
                        HasDedicatedManager = true,
                        HasBackup = true,
                        BackupFrequency = "Hourly",
                        HasCustomInvoices = true,
                        HasMultiCurrency = true,
                        HasApiAccess = true,
                        HasOfflineMode = true,
                        HasWhiteLabel = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }
                };
                foreach (var plan in plans)
                {
                    if (!context.Plans.Any(p => p.Name == plan.Name))
                    {
                        context.Plans.Add(plan);
                    }
                }
                context.SaveChanges();

                // Seed System Settings (إعدادات النظام)
                var systemSettings = new[]
                {
                    new SystemSetting
                    {
                        AccountId = null,
                        SettingKey = "appTitle",
                        SettingValue = "المحاسب الذكي",
                        SettingType = "string",
                        Description = "عنوان التطبيق",
                        IsPublic = true
                    },
                    new SystemSetting
                    {
                        AccountId = null,
                        SettingKey = "appVersion",
                        SettingValue = "1.0.0",
                        SettingType = "string",
                        Description = "إصدار التطبيق",
                        IsPublic = true
                    },
                    new SystemSetting
                    {
                        AccountId = null,
                        SettingKey = "defaultCurrency",
                        SettingValue = "SAR",
                        SettingType = "string",
                        Description = "العملة الافتراضية",
                        IsPublic = true
                    },
                    new SystemSetting
                    {
                        AccountId = null,
                        SettingKey = "defaultLanguage",
                        SettingValue = "ar",
                        SettingType = "string",
                        Description = "اللغة الافتراضية",
                        IsPublic = true
                    },
                    new SystemSetting
                    {
                        AccountId = account.Id,
                        SettingKey = "allowOfflineMode",
                        SettingValue = "true",
                        SettingType = "boolean",
                        Description = "السماح بالوضع غير المتصل",
                        IsPublic = false
                    },
                    new SystemSetting
                    {
                        AccountId = account.Id,
                        SettingKey = "autoSyncOnReconnect",
                        SettingValue = "true",
                        SettingType = "boolean",
                        Description = "المزامنة التلقائية عند الاتصال",
                        IsPublic = false
                    }
                };
                foreach (var setting in systemSettings)
                {
                    if (!context.SystemSettings.Any(s => s.SettingKey == setting.SettingKey && s.AccountId == setting.AccountId))
                    {
                        context.SystemSettings.Add(setting);
                    }
                }
                context.SaveChanges();
            }
            catch (Exception ex)
            {
                // Silently ignore seed errors - tables might not exist yet
                System.Diagnostics.Debug.WriteLine($"Seed data error (non-critical): {ex.Message}");
            }
        }

        private static void SeedDefaultRolesForAccount(ApplicationDbContext context, int accountId, int ownerUserId)
        {
            EnsureNewAcountRoleMigration(context, accountId);

            var defaultRoles = new List<Role>
            {
                new Role { AccountId = accountId, Name = "مسؤول", NameEn = "Administrator", Description = "إدارة كاملة للحساب", IsSystemRole = true, Color = "#dc2626", Icon = "shield", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Role { AccountId = accountId, Name = "مدير", NameEn = "Manager", Description = "إدارة العمليات اليومية", IsSystemRole = true, Color = "#2563eb", Icon = "briefcase", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Role { AccountId = accountId, Name = "محاسب", NameEn = "Accountant", Description = "إدارة القيود والفواتير والتقارير", IsSystemRole = true, Color = "#16a34a", Icon = "calculator", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Role { AccountId = accountId, Name = "أمين مخزون", NameEn = "Inventory Keeper", Description = "إدارة المخزون والمنتجات", IsSystemRole = true, Color = "#ca8a04", Icon = "boxes", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Role { AccountId = accountId, Name = "موظف مبيعات", NameEn = "Sales", Description = "إنشاء الفواتير وخدمة العملاء", IsSystemRole = true, Color = "#9333ea", Icon = "shopping-cart", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Role { AccountId = accountId, Name = "NewAcount", NameEn = "NewAcount", Description = "دور افتراضي بصلاحيات محدودة", IsSystemRole = true, Color = "#0f766e", Icon = "user", IsActive = true, CreatedAt = DateTime.UtcNow },
                new Role { AccountId = accountId, Name = "عارض", NameEn = "Viewer", Description = "عرض فقط", IsSystemRole = true, Color = "#475569", Icon = "eye", IsActive = true, CreatedAt = DateTime.UtcNow }
            };

            var existingRoleNames = context.Roles
                .Where(r => r.AccountId == accountId)
                .Select(r => r.Name)
                .ToHashSet();

            var rolesToAdd = defaultRoles
                .Where(r => !existingRoleNames.Contains(r.Name))
                .ToList();

            if (rolesToAdd.Any())
            {
                context.Roles.AddRange(rolesToAdd);
                context.SaveChanges();
            }

            EnsureNewAcountRoleMigration(context, accountId);

            var adminRoleId = context.Roles
                .Where(r => r.AccountId == accountId && r.Name == "مسؤول")
                .Select(r => r.Id)
                .FirstOrDefault();

            if (adminRoleId > 0 && !context.UserRoles.Any(ur => ur.UserId == ownerUserId && ur.RoleId == adminRoleId))
            {
                context.UserRoles.Add(new UserRole
                {
                    UserId = ownerUserId,
                    RoleId = adminRoleId,
                    AssignedAt = DateTime.UtcNow,
                    AssignedByUserId = ownerUserId
                });
                context.SaveChanges();
            }
        }

        private static void EnsureNewAcountRoleMigration(ApplicationDbContext context, int accountId)
        {
            var newAcountRole = context.Roles
                .FirstOrDefault(r => r.AccountId == accountId && r.Name == "NewAcount");

            if (newAcountRole == null)
            {
                var legacyPrimaryRole = context.Roles
                    .Where(r => r.AccountId == accountId && (r.Name == "موظف" || r.NameEn == "Staff"))
                    .OrderBy(r => r.Id)
                    .FirstOrDefault();

                if (legacyPrimaryRole != null)
                {
                    legacyPrimaryRole.Name = "NewAcount";
                    legacyPrimaryRole.NameEn = "NewAcount";
                    legacyPrimaryRole.Description = string.IsNullOrWhiteSpace(legacyPrimaryRole.Description)
                        ? "دور افتراضي بصلاحيات محدودة"
                        : legacyPrimaryRole.Description;
                    legacyPrimaryRole.IsSystemRole = true;
                    legacyPrimaryRole.IsActive = true;
                    context.SaveChanges();

                    newAcountRole = legacyPrimaryRole;
                }
            }

            if (newAcountRole == null)
            {
                return;
            }

            // توحيد أي أدوار قديمة (Staff/موظف) ضمن NewAcount مع نقل التعيينات والصلاحيات.
            var legacyRoles = context.Roles
                .Where(r => r.AccountId == accountId
                    && r.Id != newAcountRole.Id
                    && (r.Name == "موظف" || r.NameEn == "Staff"))
                .ToList();

            if (!legacyRoles.Any())
            {
                return;
            }

            var newRolePermissionIds = context.RolePermissions
                .Where(rp => rp.RoleId == newAcountRole.Id)
                .Select(rp => rp.PermissionId)
                .ToHashSet();

            var newRoleUserIds = context.UserRoles
                .Where(ur => ur.RoleId == newAcountRole.Id)
                .Select(ur => ur.UserId)
                .ToHashSet();

            foreach (var legacyRole in legacyRoles)
            {
                var legacyPermissionIds = context.RolePermissions
                    .Where(rp => rp.RoleId == legacyRole.Id)
                    .Select(rp => rp.PermissionId)
                    .ToList();

                foreach (var permissionId in legacyPermissionIds)
                {
                    if (newRolePermissionIds.Contains(permissionId))
                    {
                        continue;
                    }

                    context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = newAcountRole.Id,
                        PermissionId = permissionId
                    });
                    newRolePermissionIds.Add(permissionId);
                }

                var legacyAssignments = context.UserRoles
                    .Where(ur => ur.RoleId == legacyRole.Id)
                    .ToList();

                foreach (var assignment in legacyAssignments)
                {
                    if (newRoleUserIds.Contains(assignment.UserId))
                    {
                        context.UserRoles.Remove(assignment);
                        continue;
                    }

                    assignment.RoleId = newAcountRole.Id;
                    newRoleUserIds.Add(assignment.UserId);
                }

                context.Roles.Remove(legacyRole);
            }

            context.SaveChanges();
        }

        private static void EnsureDefaultRolesForAllAccounts(ApplicationDbContext context)
        {
            var accountOwners = context.Users
                .Where(u => u.IsActive)
                .GroupBy(u => u.AccountId)
                .Select(g => new
                {
                    AccountId = g.Key,
                    OwnerUserId = g
                        .OrderByDescending(u => u.IsSuperAdmin)
                        .ThenBy(u => u.RoleType)
                        .ThenBy(u => u.Id)
                        .Select(u => u.Id)
                        .FirstOrDefault()
                })
                .ToList();

            foreach (var account in accountOwners)
            {
                if (account.OwnerUserId > 0)
                {
                    SeedDefaultRolesForAccount(context, account.AccountId, account.OwnerUserId);
                }
            }
        }

        private static void EnsureDefaultUnitsForAllAccounts(ApplicationDbContext context)
        {
            DefaultUnitsSeeder.EnsureForAllAccountsAsync(context).GetAwaiter().GetResult();
        }
    }
}
