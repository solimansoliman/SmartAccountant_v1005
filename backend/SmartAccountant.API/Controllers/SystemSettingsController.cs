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
                var settings = await _context.SystemSettings
                    .Where(s => s.AccountId == null && s.IsPublic)
                    .ToListAsync();

                var result = new Dictionary<string, object>();
                foreach (var setting in settings)
                {
                    result[setting.SettingKey] = ConvertValue(setting.SettingValue, setting.SettingType);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "خطأ في جلب الإعدادات العامة");
                return StatusCode(500, new { message = "خطأ في جلب الإعدادات" });
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
        [AllowAnonymous] // مؤقتاً - يجب إضافة نظام مصادقة لاحقاً
        public async Task<ActionResult> UpdateSetting(string key, [FromBody] UpdateSettingDto dto)
        {
            try
            {
                var setting = await _context.SystemSettings
                    .FirstOrDefaultAsync(s => s.AccountId == null && s.SettingKey == key);

                if (setting == null)
                {
                    // إنشاء إعداد جديد
                    setting = new SystemSetting
                    {
                        AccountId = null,
                        SettingKey = key,
                        SettingValue = dto.Value,
                        SettingType = dto.Type ?? "string",
                        Description = dto.Description,
                        IsPublic = dto.IsPublic ?? false,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.SystemSettings.Add(setting);
                }
                else
                {
                    // تحديث الإعداد
                    setting.SettingValue = dto.Value;
                    if (dto.Type != null) setting.SettingType = dto.Type;
                    if (dto.Description != null) setting.Description = dto.Description;
                    if (dto.IsPublic.HasValue) setting.IsPublic = dto.IsPublic.Value;
                    setting.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("تم تحديث الإعداد: {Key} = {Value}", key, dto.Value);

                return Ok(new { message = "تم تحديث الإعداد بنجاح" });
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
        [AllowAnonymous] // مؤقتاً - يجب إضافة نظام مصادقة لاحقاً
        public async Task<ActionResult> UpdateMultipleSettings([FromBody] Dictionary<string, string> settings)
        {
            try
            {
                foreach (var kvp in settings)
                {
                    var setting = await _context.SystemSettings
                        .FirstOrDefaultAsync(s => s.AccountId == null && s.SettingKey == kvp.Key);

                    if (setting != null)
                    {
                        setting.SettingValue = kvp.Value;
                        setting.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        // إنشاء إعداد جديد
                        _context.SystemSettings.Add(new SystemSetting
                        {
                            AccountId = null,
                            SettingKey = kvp.Key,
                            SettingValue = kvp.Value,
                            SettingType = "string",
                            IsPublic = true,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("تم تحديث {Count} إعدادات", settings.Count);

                return Ok(new { message = $"تم تحديث {settings.Count} إعدادات بنجاح" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "خطأ في تحديث الإعدادات");
                return StatusCode(500, new { message = "خطأ في تحديث الإعدادات" });
            }
        }

        /// <summary>
        /// تحويل القيمة حسب النوع
        /// </summary>
        private static object ConvertValue(string value, string type)
        {
            return type.ToLower() switch
            {
                "bool" => value.ToLower() == "true" || value == "1",
                "int" => int.TryParse(value, out var intVal) ? intVal : 0,
                "decimal" => decimal.TryParse(value, out var decVal) ? decVal : 0m,
                "json" => value, // يمكن للـ Frontend تحليله
                _ => value
            };
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
