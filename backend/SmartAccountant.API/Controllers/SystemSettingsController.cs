using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using System.Security.Claims;

namespace SmartAccountant.API.Controllers
{
    /// <summary>
    /// إعدادات النظام - API للتحكم في خيارات التطبيق
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class SystemSettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SystemSettingsController> _logger;
        private sealed record NumericRange(int Min, int Max);
        private static readonly IReadOnlyDictionary<string, NumericRange> InputLimitRanges =
            new Dictionary<string, NumericRange>(StringComparer.OrdinalIgnoreCase)
            {
                ["customerNameMaxLength"] = new NumericRange(20, 200),
                ["customerAddressMaxLength"] = new NumericRange(40, 400),
                ["customerNotesMaxLength"] = new NumericRange(50, 1000),
                ["customerPhoneMaxLength"] = new NumericRange(8, 30),
                ["customerEmailMaxLength"] = new NumericRange(30, 200),
                ["productNameMaxLength"] = new NumericRange(20, 200),
                ["productNotesMaxLength"] = new NumericRange(20, 500),
                ["invoiceNotesMaxLength"] = new NumericRange(20, 1000),
                ["registerUsernameMaxLength"] = new NumericRange(12, 80),
                ["registerFullNameMaxLength"] = new NumericRange(30, 150),
                ["registerCompanyNameMaxLength"] = new NumericRange(30, 180),
                ["registerEmailMaxLength"] = new NumericRange(40, 200),
                ["registerPasswordMaxLength"] = new NumericRange(20, 128)
            };
        private static readonly HashSet<string> AccountScopedOfflineKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "allowOfflineMode",
            "offlineDataRetentionDays",
            "autoSyncOnReconnect",
            "showOfflineIndicator",
            "allowOfflineCreate",
            "allowOfflineEdit",
            "allowOfflineDelete",
            "maxPendingChanges",
            "syncIntervalSeconds"
        };

        public SystemSettingsController(ApplicationDbContext context, ILogger<SystemSettingsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// جلب الإعدادات العامة المتاحة للجميع (بدون مصادقة)
        /// </summary>
        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<ActionResult<Dictionary<string, object>>> GetPublicSettings()
        {
            try
            {
                var globalSettings = await _context.SystemSettings
                    .Where(s => s.AccountId == null && s.IsPublic)
                    .ToListAsync();

                var result = new Dictionary<string, object>();
                foreach (var setting in globalSettings)
                {
                    result[setting.SettingKey] = ConvertValue(setting.SettingValue, setting.SettingType);
                }

                var accountId = GetAccountIdFromClaimsOrHeader();
                if (accountId.HasValue)
                {
                    var accountSettings = await _context.SystemSettings
                        .Where(s => s.AccountId == accountId.Value && s.IsPublic)
                        .ToListAsync();

                    foreach (var setting in accountSettings)
                    {
                        result[setting.SettingKey] = ConvertValue(setting.SettingValue, setting.SettingType);
                    }
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "خطأ في جلب الإعدادات العامة: {Message}", ex.Message);
                // Return basic public settings as fallback
                return Ok(new Dictionary<string, object>
                {
                    ["appTitle"] = "المحاسب الذكي",
                    ["defaultCurrency"] = "SAR",
                    ["defaultLanguage"] = "ar",
                    ["appVersion"] = "1.0.0"
                });
            }
        }

        /// <summary>
        /// جلب جميع الإعدادات (للأدمن فقط)
        /// </summary>
        [HttpGet]
        [Authorize]
        public async Task<ActionResult<List<SystemSettingDto>>> GetAllSettings()
        {
            try
            {
                // التحقق من صلاحيات الأدمن
                var isSuperAdmin = User.FindFirst("IsSuperAdmin")?.Value == "True";
                if (!isSuperAdmin)
                {
                    return Forbid();
                }

                var settings = await _context.SystemSettings
                    .Where(s => s.AccountId == null)
                    .OrderBy(s => s.SettingKey)
                    .Select(s => new SystemSettingDto
                    {
                        Id = s.Id,
                        SettingKey = s.SettingKey,
                        SettingValue = s.SettingValue,
                        SettingType = s.SettingType,
                        Description = s.Description,
                        IsPublic = s.IsPublic,
                        UpdatedAt = s.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(settings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "خطأ في جلب الإعدادات");
                return StatusCode(500, new { message = "خطأ في جلب الإعدادات" });
            }
        }

        /// <summary>
        /// تحديث إعداد معين
        /// </summary>
        [HttpPut("{key}")]
        [Authorize]
        public async Task<ActionResult> UpdateSetting(string key, [FromBody] UpdateSettingDto dto)
        {
            try
            {
                if (!CanManageSettings())
                {
                    return Forbid();
                }

                var normalizedValue = NormalizeSettingValue(key, dto.Value);
                var wasNormalized = !string.Equals(dto.Value, normalizedValue, StringComparison.Ordinal);
                var accountId = GetAccountIdFromClaimsOrHeader();
                var isAccountScopedKey = AccountScopedOfflineKeys.Contains(key);
                int? scopeAccountId = isAccountScopedKey ? accountId : null;

                if (isAccountScopedKey && !scopeAccountId.HasValue)
                {
                    return BadRequest(new { message = "لا يمكن تحديث إعدادات Offline بدون AccountId صالح" });
                }

                var setting = await _context.SystemSettings
                    .FirstOrDefaultAsync(s => s.AccountId == scopeAccountId && s.SettingKey == key);

                if (setting == null)
                {
                    // إنشاء إعداد جديد
                    setting = new SystemSetting
                    {
                        AccountId = scopeAccountId,
                        SettingKey = key,
                        SettingValue = normalizedValue,
                        SettingType = dto.Type ?? "string",
                        Description = dto.Description,
                        IsPublic = isAccountScopedKey ? true : (dto.IsPublic ?? false),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.SystemSettings.Add(setting);
                }
                else
                {
                    // تحديث الإعداد
                    setting.SettingValue = normalizedValue;
                    if (dto.Type != null) setting.SettingType = dto.Type;
                    if (dto.Description != null) setting.Description = dto.Description;
                    if (dto.IsPublic.HasValue) setting.IsPublic = dto.IsPublic.Value;
                    if (isAccountScopedKey) setting.IsPublic = true;
                    setting.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("تم تحديث الإعداد: {Key} = {Value}", key, normalizedValue);

                return Ok(new
                {
                    message = "تم تحديث الإعداد بنجاح",
                    settingKey = key,
                    requestedValue = dto.Value,
                    normalizedValue,
                    wasNormalized
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "خطأ في تحديث الإعداد: {Key}", key);
                return StatusCode(500, new { message = "خطأ في تحديث الإعداد" });
            }
        }

        /// <summary>
        /// تحديث عدة إعدادات دفعة واحدة
        /// </summary>
        [HttpPut("bulk")]
        [Authorize]
        public async Task<ActionResult> UpdateMultipleSettings([FromBody] Dictionary<string, string> settings)
        {
            try
            {
                if (!CanManageSettings())
                {
                    return Forbid();
                }

                var normalizedValues = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                var accountId = GetAccountIdFromClaimsOrHeader();

                foreach (var kvp in settings)
                {
                    var normalizedValue = NormalizeSettingValue(kvp.Key, kvp.Value);
                    normalizedValues[kvp.Key] = normalizedValue;

                    var isAccountScopedKey = AccountScopedOfflineKeys.Contains(kvp.Key);
                    int? scopeAccountId = isAccountScopedKey ? accountId : null;

                    if (isAccountScopedKey && !scopeAccountId.HasValue)
                    {
                        return BadRequest(new { message = "لا يمكن تحديث إعدادات Offline بدون AccountId صالح" });
                    }

                    var setting = await _context.SystemSettings
                        .FirstOrDefaultAsync(s => s.AccountId == scopeAccountId && s.SettingKey == kvp.Key);

                    if (setting != null)
                    {
                        setting.SettingValue = normalizedValue;
                        if (isAccountScopedKey) setting.IsPublic = true;
                        setting.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        // إنشاء إعداد جديد
                        _context.SystemSettings.Add(new SystemSetting
                        {
                            AccountId = scopeAccountId,
                            SettingKey = kvp.Key,
                            SettingValue = normalizedValue,
                            SettingType = "string",
                            IsPublic = true,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("تم تحديث {Count} إعدادات", settings.Count);

                return Ok(new
                {
                    message = $"تم تحديث {settings.Count} إعدادات بنجاح",
                    normalizedValues
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "خطأ في تحديث الإعدادات");
                return StatusCode(500, new { message = "خطأ في تحديث الإعدادات" });
            }
        }

        private int? GetAccountIdFromClaimsOrHeader()
        {
            var accountIdClaim = User.FindFirst("AccountId")?.Value;
            if (int.TryParse(accountIdClaim, out var accountIdFromClaim) && accountIdFromClaim > 0)
            {
                return accountIdFromClaim;
            }

            if (Request.Headers.TryGetValue("X-Account-Id", out var accountHeader)
                && int.TryParse(accountHeader.FirstOrDefault(), out var accountIdFromHeader)
                && accountIdFromHeader > 0)
            {
                return accountIdFromHeader;
            }

            return null;
        }

        private bool CanManageSettings()
        {
            var isSuperAdmin = string.Equals(User.FindFirst("IsSuperAdmin")?.Value, "true", StringComparison.OrdinalIgnoreCase)
                               || string.Equals(User.FindFirst("IsSuperAdmin")?.Value, "True", StringComparison.OrdinalIgnoreCase);
            if (isSuperAdmin)
            {
                return true;
            }

            return string.Equals(User.FindFirst("CanManageSettings")?.Value, "true", StringComparison.OrdinalIgnoreCase)
                   || string.Equals(User.FindFirst("CanManageSettings")?.Value, "True", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// تحويل القيمة حسب النوع
        /// </summary>
        private static object ConvertValue(string value, string type)
        {
            if (string.IsNullOrEmpty(value)) return null;
            
            return type?.ToLower() switch
            {
                "bool" or "boolean" => value.ToLower() == "true" || value == "1",
                "int" or "integer" => int.TryParse(value, out var intVal) ? intVal : 0,
                "decimal" or "float" => decimal.TryParse(value, out var decVal) ? decVal : 0m,
                "json" => value, // يمكن للـ Frontend تحليله
                _ => value
            };
        }

        private static string NormalizeSettingValue(string key, string value)
        {
            if (!InputLimitRanges.TryGetValue(key, out var range))
            {
                return value;
            }

            if (!int.TryParse(value, out var parsed))
            {
                return range.Min.ToString();
            }

            if (parsed < range.Min)
            {
                return range.Min.ToString();
            }

            if (parsed > range.Max)
            {
                return range.Max.ToString();
            }

            return parsed.ToString();
        }
    }

    // DTOs
    public class SystemSettingDto
    {
        public int Id { get; set; }
        public string SettingKey { get; set; } = string.Empty;
        public string SettingValue { get; set; } = string.Empty;
        public string SettingType { get; set; } = "string";
        public string? Description { get; set; }
        public bool IsPublic { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class UpdateSettingDto
    {
        public string Value { get; set; } = string.Empty;
        public string? Type { get; set; }
        public string? Description { get; set; }
        public bool? IsPublic { get; set; }
    }
}
