using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using SmartAccountant.API.Services;
using System.Security.Claims;
using System.Text.Json;

namespace SmartAccountant.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class LogosController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IActivityLogService _activityLog;

        public LogosController(ApplicationDbContext context, IActivityLogService activityLog)
        {
            _context = context;
            _activityLog = activityLog;
        }

        private int GetAccountId()
        {
            var claim = User.FindFirst("AccountId");
            return claim != null ? int.Parse(claim.Value) : 0;
        }

        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null ? int.Parse(claim.Value) : 0;
        }

        // GET: api/logos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LogoResponseDto>>> GetLogos()
        {
            var accountId = GetAccountId();
            var logos = await _context.Logos
                .Where(l => l.AccountId == accountId)
                .OrderBy(l => l.DisplayOrder)
                .ThenByDescending(l => l.CreatedAt)
                .Select(l => new LogoResponseDto
                {
                    Id = l.Id,
                    AccountId = l.AccountId,
                    Name = l.Name,
                    LogoType = l.LogoType,
                    StorageType = l.StorageType,
                    ImageUrl = l.ImageUrl,
                    ImageData = l.StorageType == "Database" || l.StorageType == "Both" ? l.ImageData : null,
                    MimeType = l.MimeType,
                    FileSize = l.FileSize ?? 0,
                    Width = l.Width ?? 0,
                    Height = l.Height ?? 0,
                    IsActive = l.IsActive,
                    ShowLogo = l.ShowLogo,
                    DisplayOrder = l.DisplayOrder,
                    AltText = l.AltText,
                    Notes = l.Notes,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync();

            return Ok(logos);
        }

        // GET: api/logos/active
        [HttpGet("active")]
        public async Task<ActionResult<object>> GetActiveLogo([FromQuery] string type = "Primary")
        {
            var accountId = GetAccountId();
            
            var settings = await _context.AccountLogoSettings
                .FirstOrDefaultAsync(s => s.AccountId == accountId);
                
            if (settings != null && !settings.EnableLogoDisplay)
            {
                return Ok(new { showLogo = false, message = "عرض الشعار معطل لهذا الحساب" });
            }

            var logo = await _context.Logos
                .Where(l => l.AccountId == accountId && l.LogoType == type && l.IsActive && l.ShowLogo)
                .OrderBy(l => l.DisplayOrder)
                .Select(l => new LogoResponseDto
                {
                    Id = l.Id,
                    AccountId = l.AccountId,
                    Name = l.Name,
                    LogoType = l.LogoType,
                    StorageType = l.StorageType,
                    ImageUrl = l.ImageUrl,
                    ImageData = l.StorageType == "Database" || l.StorageType == "Both" ? l.ImageData : null,
                    MimeType = l.MimeType,
                    FileSize = l.FileSize ?? 0,
                    Width = l.Width ?? 0,
                    Height = l.Height ?? 0,
                    IsActive = l.IsActive,
                    ShowLogo = l.ShowLogo,
                    DisplayOrder = l.DisplayOrder,
                    AltText = l.AltText,
                    Notes = l.Notes,
                    CreatedAt = l.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (logo == null)
            {
                return NotFound(new { message = "لا يوجد شعار نشط" });
            }

            return Ok(new { showLogo = true, logo });
        }

        // GET: api/logos/5
        [HttpGet("{id}")]
        public async Task<ActionResult<LogoResponseDto>> GetLogo(int id)
        {
            var accountId = GetAccountId();
            var logo = await _context.Logos
                .Where(l => l.Id == id && l.AccountId == accountId)
                .Select(l => new LogoResponseDto
                {
                    Id = l.Id,
                    AccountId = l.AccountId,
                    Name = l.Name,
                    LogoType = l.LogoType,
                    StorageType = l.StorageType,
                    ImageUrl = l.ImageUrl,
                    ImageData = l.StorageType == "Database" || l.StorageType == "Both" ? l.ImageData : null,
                    MimeType = l.MimeType,
                    FileSize = l.FileSize ?? 0,
                    Width = l.Width ?? 0,
                    Height = l.Height ?? 0,
                    IsActive = l.IsActive,
                    ShowLogo = l.ShowLogo,
                    DisplayOrder = l.DisplayOrder,
                    AltText = l.AltText,
                    Notes = l.Notes,
                    CreatedAt = l.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (logo == null)
            {
                return NotFound();
            }

            return Ok(logo);
        }

        // POST: api/logos
        [HttpPost]
        public async Task<ActionResult<LogoResponseDto>> CreateLogo([FromBody] CreateLogoRequestDto dto)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();
            
            var settings = await GetOrCreateSettings(accountId);

            var logo = new Logo
            {
                AccountId = accountId,
                Name = dto.Name,
                LogoType = dto.LogoType ?? "Primary",
                StorageType = dto.StorageType ?? settings.PreferredStorageType ?? "Url",
                ImageUrl = dto.ImageUrl,
                ImageData = dto.ImageData,
                MimeType = dto.MimeType,
                FileSize = dto.FileSize,
                Width = dto.Width,
                Height = dto.Height,
                IsActive = dto.IsActive ?? true,
                ShowLogo = dto.ShowLogo ?? true,
                DisplayOrder = dto.DisplayOrder ?? 0,
                AltText = dto.AltText,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = userId
            };

            if (!string.IsNullOrEmpty(dto.ImageData) && (logo.StorageType == "Database" || logo.StorageType == "Both"))
            {
                try
                {
                    var base64Data = dto.ImageData;
                    if (base64Data.Contains(","))
                    {
                        base64Data = base64Data.Split(',')[1];
                    }
                    logo.ImageBinary = Convert.FromBase64String(base64Data);
                }
                catch { }
            }

            _context.Logos.Add(logo);
            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(
                accountId, userId, 
                "CreateLogo", "Logo", logo.Id, logo.Name,
                $"إنشاء شعار جديد: {logo.Name}"
            );

            return CreatedAtAction(nameof(GetLogo), new { id = logo.Id }, new LogoResponseDto
            {
                Id = logo.Id,
                AccountId = logo.AccountId,
                Name = logo.Name,
                LogoType = logo.LogoType,
                StorageType = logo.StorageType,
                ImageUrl = logo.ImageUrl,
                MimeType = logo.MimeType,
                FileSize = logo.FileSize ?? 0,
                Width = logo.Width ?? 0,
                Height = logo.Height ?? 0,
                IsActive = logo.IsActive,
                ShowLogo = logo.ShowLogo,
                DisplayOrder = logo.DisplayOrder,
                AltText = logo.AltText,
                Notes = logo.Notes,
                CreatedAt = logo.CreatedAt
            });
        }

        // PUT: api/logos/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateLogo(int id, [FromBody] UpdateLogoRequestDto dto)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            var logo = await _context.Logos
                .FirstOrDefaultAsync(l => l.Id == id && l.AccountId == accountId);

            if (logo == null)
            {
                return NotFound();
            }

            if (dto.Name != null) logo.Name = dto.Name;
            if (dto.LogoType != null) logo.LogoType = dto.LogoType;
            if (dto.StorageType != null) logo.StorageType = dto.StorageType;
            if (dto.ImageUrl != null) logo.ImageUrl = dto.ImageUrl;
            if (dto.ImageData != null)
            {
                logo.ImageData = dto.ImageData;
                
                if (logo.StorageType == "Database" || logo.StorageType == "Both")
                {
                    try
                    {
                        var base64Data = dto.ImageData;
                        if (base64Data.Contains(","))
                        {
                            base64Data = base64Data.Split(',')[1];
                        }
                        logo.ImageBinary = Convert.FromBase64String(base64Data);
                    }
                    catch { }
                }
            }
            if (dto.MimeType != null) logo.MimeType = dto.MimeType;
            if (dto.FileSize.HasValue) logo.FileSize = dto.FileSize.Value;
            if (dto.Width.HasValue) logo.Width = dto.Width.Value;
            if (dto.Height.HasValue) logo.Height = dto.Height.Value;
            if (dto.IsActive.HasValue) logo.IsActive = dto.IsActive.Value;
            if (dto.ShowLogo.HasValue) logo.ShowLogo = dto.ShowLogo.Value;
            if (dto.DisplayOrder.HasValue) logo.DisplayOrder = dto.DisplayOrder.Value;
            if (dto.AltText != null) logo.AltText = dto.AltText;
            if (dto.Notes != null) logo.Notes = dto.Notes;

            logo.UpdatedAt = DateTime.UtcNow;
            logo.UpdatedByUserId = userId;

            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(
                accountId, userId,
                "UpdateLogo", "Logo", logo.Id, logo.Name,
                $"تحديث شعار: {logo.Name}"
            );

            return NoContent();
        }

        // PUT: api/logos/5/toggle-display
        [HttpPut("{id}/toggle-display")]
        public async Task<IActionResult> ToggleLogoDisplay(int id)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            var logo = await _context.Logos
                .FirstOrDefaultAsync(l => l.Id == id && l.AccountId == accountId);

            if (logo == null)
            {
                return NotFound();
            }

            logo.ShowLogo = !logo.ShowLogo;
            logo.UpdatedAt = DateTime.UtcNow;
            logo.UpdatedByUserId = userId;

            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(
                accountId, userId,
                logo.ShowLogo ? "EnableLogoDisplay" : "DisableLogoDisplay",
                "Logo", logo.Id, logo.Name,
                $"{(logo.ShowLogo ? "تفعيل" : "إلغاء")} عرض الشعار: {logo.Name}"
            );

            return Ok(new { showLogo = logo.ShowLogo });
        }

        // PUT: api/logos/5/storage-type
        [HttpPut("{id}/storage-type")]
        public async Task<IActionResult> ChangeStorageType(int id, [FromBody] ChangeStorageTypeRequestDto dto)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            var logo = await _context.Logos
                .FirstOrDefaultAsync(l => l.Id == id && l.AccountId == accountId);

            if (logo == null)
            {
                return NotFound();
            }

            var oldType = logo.StorageType;
            logo.StorageType = dto.StorageType;
            
            if ((dto.StorageType == "Database" || dto.StorageType == "Both") 
                && !string.IsNullOrEmpty(logo.ImageData) 
                && logo.ImageBinary == null)
            {
                try
                {
                    var base64Data = logo.ImageData;
                    if (base64Data.Contains(","))
                    {
                        base64Data = base64Data.Split(',')[1];
                    }
                    logo.ImageBinary = Convert.FromBase64String(base64Data);
                }
                catch { }
            }

            logo.UpdatedAt = DateTime.UtcNow;
            logo.UpdatedByUserId = userId;

            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(
                accountId, userId,
                "ChangeLogoStorageType", "Logo", logo.Id, logo.Name,
                $"تغيير نوع التخزين من {oldType} إلى {dto.StorageType}"
            );

            return Ok(new { storageType = logo.StorageType });
        }

        // DELETE: api/logos/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLogo(int id)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();

            var logo = await _context.Logos
                .FirstOrDefaultAsync(l => l.Id == id && l.AccountId == accountId);

            if (logo == null)
            {
                return NotFound();
            }

            var logoName = logo.Name;
            _context.Logos.Remove(logo);
            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(
                accountId, userId,
                "DeleteLogo", "Logo", id, logoName,
                $"حذف شعار: {logoName}"
            );

            return NoContent();
        }

        // ============= إعدادات الشعار للحساب =============

        // GET: api/logos/settings
        [HttpGet("settings")]
        public async Task<ActionResult<LogoSettingsResponseDto>> GetSettings()
        {
            var accountId = GetAccountId();
            var settings = await GetOrCreateSettings(accountId);

            return Ok(new LogoSettingsResponseDto
            {
                Id = settings.Id,
                AccountId = settings.AccountId,
                PreferredStorageType = settings.PreferredStorageType,
                EnableLogoDisplay = settings.EnableLogoDisplay,
                MaxFileSizeKb = settings.MaxFileSizeKb,
                AllowedMimeTypes = settings.AllowedMimeTypes,
                ActivePrimaryLogoId = settings.ActivePrimaryLogoId,
                ActiveFaviconId = settings.ActiveFaviconId
            });
        }

        // PUT: api/logos/settings
        [HttpPut("settings")]
        public async Task<IActionResult> UpdateSettings([FromBody] UpdateLogoSettingsRequestDto dto)
        {
            var accountId = GetAccountId();
            var userId = GetUserId();
            
            var settings = await GetOrCreateSettings(accountId);

            if (dto.PreferredStorageType != null) settings.PreferredStorageType = dto.PreferredStorageType;
            if (dto.EnableLogoDisplay.HasValue) settings.EnableLogoDisplay = dto.EnableLogoDisplay.Value;
            if (dto.MaxFileSizeKb.HasValue) settings.MaxFileSizeKb = dto.MaxFileSizeKb.Value;
            if (dto.AllowedMimeTypes != null) settings.AllowedMimeTypes = dto.AllowedMimeTypes;
            if (dto.ActivePrimaryLogoId.HasValue) settings.ActivePrimaryLogoId = dto.ActivePrimaryLogoId;
            if (dto.ActiveFaviconId.HasValue) settings.ActiveFaviconId = dto.ActiveFaviconId;

            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(
                accountId, userId,
                "UpdateLogoSettings", "AccountLogoSettings", settings.Id, null,
                "تحديث إعدادات الشعار"
            );

            return NoContent();
        }

        // PUT: api/logos/settings/toggle-display
        [HttpPut("settings/toggle-display")]
        public async Task<IActionResult> ToggleAccountLogoDisplay()
        {
            var accountId = GetAccountId();
            var userId = GetUserId();
            
            var settings = await GetOrCreateSettings(accountId);
            settings.EnableLogoDisplay = !settings.EnableLogoDisplay;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _activityLog.LogAsync(
                accountId, userId,
                settings.EnableLogoDisplay ? "EnableAccountLogoDisplay" : "DisableAccountLogoDisplay",
                "AccountLogoSettings", settings.Id, null,
                $"{(settings.EnableLogoDisplay ? "تفعيل" : "إلغاء")} عرض الشعارات للحساب"
            );

            return Ok(new { enableLogoDisplay = settings.EnableLogoDisplay });
        }

        private async Task<AccountLogoSettings> GetOrCreateSettings(int accountId)
        {
            var settings = await _context.AccountLogoSettings
                .FirstOrDefaultAsync(s => s.AccountId == accountId);

            if (settings == null)
            {
                settings = new AccountLogoSettings
                {
                    AccountId = accountId,
                    PreferredStorageType = "Url",
                    EnableLogoDisplay = true,
                    MaxFileSizeKb = 2048,
                    AllowedMimeTypes = "image/jpeg,image/png,image/gif,image/webp",
                    CreatedAt = DateTime.UtcNow
                };
                _context.AccountLogoSettings.Add(settings);
                await _context.SaveChangesAsync();
            }

            return settings;
        }
    }

    // ============= DTOs =============

    public class LogoResponseDto
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public string? Name { get; set; }
        public string? LogoType { get; set; }
        public string? StorageType { get; set; }
        public string? ImageUrl { get; set; }
        public string? ImageData { get; set; }
        public string? MimeType { get; set; }
        public long FileSize { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public bool IsActive { get; set; }
        public bool ShowLogo { get; set; }
        public int DisplayOrder { get; set; }
        public string? AltText { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateLogoRequestDto
    {
        public string? Name { get; set; }
        public string? LogoType { get; set; }
        public string? StorageType { get; set; }
        public string? ImageUrl { get; set; }
        public string? ImageData { get; set; }
        public string? MimeType { get; set; }
        public long? FileSize { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public bool? IsActive { get; set; }
        public bool? ShowLogo { get; set; }
        public int? DisplayOrder { get; set; }
        public string? AltText { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateLogoRequestDto
    {
        public string? Name { get; set; }
        public string? LogoType { get; set; }
        public string? StorageType { get; set; }
        public string? ImageUrl { get; set; }
        public string? ImageData { get; set; }
        public string? MimeType { get; set; }
        public long? FileSize { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public bool? IsActive { get; set; }
        public bool? ShowLogo { get; set; }
        public int? DisplayOrder { get; set; }
        public string? AltText { get; set; }
        public string? Notes { get; set; }
    }

    public class ChangeStorageTypeRequestDto
    {
        public string StorageType { get; set; } = "Url";
    }

    public class LogoSettingsResponseDto
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public string? PreferredStorageType { get; set; }
        public bool EnableLogoDisplay { get; set; }
        public int MaxFileSizeKb { get; set; }
        public string? AllowedMimeTypes { get; set; }
        public int? ActivePrimaryLogoId { get; set; }
        public int? ActiveFaviconId { get; set; }
    }

    public class UpdateLogoSettingsRequestDto
    {
        public string? PreferredStorageType { get; set; }
        public bool? EnableLogoDisplay { get; set; }
        public int? MaxFileSizeKb { get; set; }
        public string? AllowedMimeTypes { get; set; }
        public int? ActivePrimaryLogoId { get; set; }
        public int? ActiveFaviconId { get; set; }
    }
}
