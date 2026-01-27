using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Services;

/// <summary>
/// خدمة JWT للمصادقة الآمنة
/// JWT Service for secure authentication
/// </summary>
public interface IJwtService
{
    /// <summary>
    /// إنشاء Token جديد للمستخدم
    /// </summary>
    string GenerateToken(User user);
    
    /// <summary>
    /// إنشاء Refresh Token
    /// </summary>
    string GenerateRefreshToken();
    
    /// <summary>
    /// التحقق من صحة Token
    /// </summary>
    ClaimsPrincipal? ValidateToken(string token);
    
    /// <summary>
    /// استخراج معلومات المستخدم من Token
    /// </summary>
    (int UserId, int AccountId)? GetUserInfoFromToken(string token);
}

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<JwtService> _logger;
    
    public JwtService(IConfiguration configuration, ILogger<JwtService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }
    
    public string GenerateToken(User user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email ?? ""),
            new Claim("FullName", user.FullName),
            new Claim("AccountId", user.AccountId.ToString()),
            new Claim("IsSuperAdmin", user.IsSuperAdmin.ToString().ToLower()),
            new Claim(ClaimTypes.Role, user.RoleType.ToString()),
            // إضافة الصلاحيات المباشرة
            new Claim("CanManageProducts", user.CanManageProducts.ToString().ToLower()),
            new Claim("CanManageCustomers", user.CanManageCustomers.ToString().ToLower()),
            new Claim("CanCreateInvoices", user.CanCreateInvoices.ToString().ToLower()),
            new Claim("CanManageExpenses", user.CanManageExpenses.ToString().ToLower()),
            new Claim("CanViewReports", user.CanViewReports.ToString().ToLower()),
            new Claim("CanManageSettings", user.CanManageSettings.ToString().ToLower()),
            new Claim("CanManageUsers", user.CanManageUsers.ToString().ToLower()),
        };
        
        var expiryMinutes = int.Parse(jwtSettings["ExpiryInMinutes"] ?? "60");
        
        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );
        
        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        
        _logger.LogInformation("JWT Token generated for user {UserId} ({Username}), expires in {Minutes} minutes",
            user.Id, user.Username, expiryMinutes);
        
        return tokenString;
    }
    
    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }
    
    public ClaimsPrincipal? ValidateToken(string token)
    {
        if (string.IsNullOrEmpty(token))
            return null;
            
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
        
        var tokenHandler = new JwtSecurityTokenHandler();
        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = jwtSettings["Issuer"],
                ValidateAudience = true,
                ValidAudience = jwtSettings["Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero // لا تسامح في الوقت
            }, out SecurityToken validatedToken);
            
            return principal;
        }
        catch (SecurityTokenExpiredException)
        {
            _logger.LogWarning("Token expired");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Token validation failed");
            return null;
        }
    }
    
    public (int UserId, int AccountId)? GetUserInfoFromToken(string token)
    {
        var principal = ValidateToken(token);
        if (principal == null)
            return null;
            
        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var accountIdClaim = principal.FindFirst("AccountId")?.Value;
        
        if (int.TryParse(userIdClaim, out int userId) && int.TryParse(accountIdClaim, out int accountId))
        {
            return (userId, accountId);
        }
        
        return null;
    }
}
