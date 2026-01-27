# 🔐 دليل الاتصال الآمن - SmartAccountant
# Secure Connection Guide

**تاريخ التحديث:** 2026-01-27  
**الإصدار:** 1.0.0

---

## 📊 ملخص الأولويات

```
┌─────────────────────────────────────────────────────────────┐
│  🔴 أولوية 1 (حرجة) - يجب إصلاحها قبل الإطلاق              │
│     • JWT Authentication حقيقي                              │
│     • Token آمن ومشفر                                       │
├─────────────────────────────────────────────────────────────┤
│  🟠 أولوية 2 (مهمة) - يجب إصلاحها للإنتاج                   │
│     • تقييد CORS                                            │
│     • Rate Limiting                                         │
├─────────────────────────────────────────────────────────────┤
│  🟡 أولوية 3 (موصى بها) - تحسينات إضافية                    │
│     • تحسين تخزين Token                                     │
│     • Security Headers                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚠️ تحليل الوضع الأمني الحالي (مرتب حسب الخطورة)

### المشاكل الأمنية الموجودة:

| الأولوية | المشكلة | الخطورة | الموقع | الوصف |
|----------|---------|---------|--------|-------|
| **1** | Token مؤقت غير آمن | 🔴 **حرجة** | `AuthController.cs` | Token يمكن تخمينه بسهولة |
| **1** | لا يوجد JWT حقيقي | 🔴 **حرجة** | Backend | لا يوجد تحقق من صحة Token |
| **2** | CORS مفتوح للجميع | 🟠 **عالية** | `Program.cs` | يسمح لأي موقع بالاتصال |
| **2** | لا يوجد Rate Limiting | 🟠 **عالية** | Backend | عرضة لهجمات Brute Force |
| **3** | Token في localStorage | 🟡 **متوسطة** | Frontend | عرضة لهجمات XSS |

---

## 🔍 تفاصيل المشاكل (مرتبة حسب الأولوية)

---

## 🔴 أولوية 1: المشاكل الحرجة (يجب إصلاحها فوراً)

### 1.1 Token مؤقت غير آمن

**الكود الحالي في `AuthController.cs`:**
```csharp
// ❌ خطير جداً - Token يمكن تخمينه!
Token = $"temp-token-{user.Id}-{DateTime.UtcNow.Ticks}"
```

**المشكلة:**
- Token يحتوي على User ID مباشرة
- يمكن للمهاجم تخمين Token مستخدم آخر
- لا يوجد تشفير أو توقيع رقمي
- لا توجد صلاحية انتهاء حقيقية

**الخطر:** يمكن لأي شخص الوصول لبيانات أي مستخدم بتغيير الـ ID في Token!

---

### 1.2 لا يوجد تحقق من Token

**الوضع الحالي:**
- الطلبات تستخدم `X-Account-Id` header فقط
- لا يوجد Middleware للتحقق من صحة Token
- أي شخص يمكنه إرسال طلبات بـ Account ID مزيف

**الخطر:** أي شخص يمكنه الوصول لجميع البيانات بدون تسجيل دخول!

---

## 🟠 أولوية 2: المشاكل العالية (يجب إصلاحها للإنتاج)

### 2.1 CORS مفتوح للجميع

**الكود الحالي في `Program.cs`:**
```csharp
// ❌ يسمح لأي موقع بالاتصال!
policy.SetIsOriginAllowed(_ => true)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials();
```

**المشكلة:**
- أي موقع خبيث يمكنه إرسال طلبات للـ API
- عرضة لهجمات CSRF

---

### 2.2 لا يوجد Rate Limiting

**المشكلة:**
- لا يوجد حد لعدد الطلبات
- عرضة لهجمات Brute Force على كلمات المرور
- عرضة لهجمات DDoS

---

## 🟡 أولوية 3: تحسينات موصى بها

### 3.1 Token في localStorage

**الكود الحالي في `apiService.ts`:**
```typescript
const token = localStorage.getItem('smart_accountant_session');
```

**المشكلة:**
- localStorage عرضة لهجمات XSS
- أي سكريبت خبيث يمكنه قراءة Token

---

## ✅ الحلول (مرتبة حسب الأولوية)

---

## 🔴 حل الأولوية 1: JWT Authentication حقيقي

### الخطوة 1.1: تثبيت الحزم المطلوبة
```powershell
cd backend/SmartAccountant.API
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package System.IdentityModel.Tokens.Jwt
```

### الخطوة 1.2: إضافة إعدادات JWT في `appsettings.json`
```json
{
  "Jwt": {
    "Key": "YourSuperSecretKeyThatIsAtLeast32CharactersLong!!",
    "Issuer": "SmartAccountant",
    "Audience": "SmartAccountantUsers",
    "ExpiryInMinutes": 60,
    "RefreshExpiryInDays": 7
  }
}
```

### الخطوة 1.3: إنشاء JWT Service
```csharp
// Services/JwtService.cs
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

public interface IJwtService
{
    string GenerateToken(User user);
    ClaimsPrincipal? ValidateToken(string token);
}

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;
    
    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }
    
    public string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim("AccountId", user.AccountId.ToString()),
            new Claim("IsSuperAdmin", user.IsSuperAdmin.ToString()),
            new Claim(ClaimTypes.Role, user.RoleType.ToString())
        };
        
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(
                int.Parse(_configuration["Jwt:ExpiryInMinutes"]!)),
            signingCredentials: credentials
        );
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
    
    public ClaimsPrincipal? ValidateToken(string token)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        
        var tokenHandler = new JwtSecurityTokenHandler();
        try
        {
            return tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = _configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["Jwt:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out _);
        }
        catch
        {
            return null;
        }
    }
}
```

#### 1.4 تحديث `Program.cs`:
```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

// إضافة JWT Service
builder.Services.AddScoped<IJwtService, JwtService>();

// إعداد JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

// في pipeline
app.UseAuthentication();
app.UseAuthorization();
```

### الخطوة 1.5: تحديث `AuthController.cs`
```csharp
private readonly IJwtService _jwtService;

public AuthController(ApplicationDbContext context, IJwtService jwtService)
{
    _context = context;
    _jwtService = jwtService;
}

// في Login method
Token = _jwtService.GenerateToken(user)  // ✅ بدلاً من temp-token
```

### الخطوة 1.6: حماية Controllers
```csharp
[Authorize]  // إضافة هذا للـ Controllers التي تحتاج حماية
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    // ...
}
```

---

## 🟠 حل الأولوية 2: تقييد CORS و Rate Limiting

### الخطوة 2.1: تقييد CORS

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // في بيئة التطوير - السماح للـ localhost
            policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
        }
        else
        {
            // في بيئة الإنتاج - دومينات محددة فقط
            var allowedOrigins = builder.Configuration
                .GetSection("AllowedOrigins")
                .Get<string[]>() ?? Array.Empty<string>();
            
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    });
});
```

**إضافة في `appsettings.json`:**
```json
{
  "AllowedOrigins": [
    "https://yourdomain.com",
    "https://www.yourdomain.com"
  ]
}
```

### الخطوة 2.2: إضافة Rate Limiting

```powershell
dotnet add package AspNetCoreRateLimit
```

```csharp
// Program.cs
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(options =>
{
    options.GeneralRules = new List<RateLimitRule>
    {
        new RateLimitRule
        {
            Endpoint = "*",
            Period = "1m",
            Limit = 100  // 100 طلب في الدقيقة
        },
        new RateLimitRule
        {
            Endpoint = "*/auth/login",
            Period = "1m",
            Limit = 5  // 5 محاولات تسجيل دخول في الدقيقة
        }
    };
});
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// في pipeline
app.UseIpRateLimiting();
```

---

## 🟡 حل الأولوية 3: تحسينات إضافية

### الخطوة 3.1: تحسين تخزين Token في Frontend

#### استخدام HttpOnly Cookies (الأفضل):
```typescript
// apiService.ts
async function handleResponse<T>(response: Response): Promise<T> {
    // Token يأتي تلقائياً في Cookie
    // لا حاجة لإدارته يدوياً
}

function getHeaders(): HeadersInit {
    return {
        'Content-Type': 'application/json',
    };
    // Token يُرسل تلقائياً مع Cookie
}
```

#### أو استخدام sessionStorage بدلاً من localStorage:
```typescript
// أقل عرضة للهجمات - يُحذف عند إغلاق المتصفح
const token = sessionStorage.getItem('smart_accountant_session');
```

#### إضافة Token Refresh:
```typescript
// services/authService.ts
export const refreshToken = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${getBaseUrl()}/auth/refresh`, {
            method: 'POST',
            credentials: 'include'  // لإرسال Cookies
        });
        
        if (response.ok) {
            const data = await response.json();
            sessionStorage.setItem('smart_accountant_session', data.token);
            return true;
        }
        return false;
    } catch {
        return false;
    }
};

// إضافة Interceptor للتجديد التلقائي
async function fetchWithAuth<T>(url: string, options: RequestInit): Promise<T> {
    let response = await fetch(url, options);
    
    if (response.status === 401) {
        // Token منتهي - محاولة التجديد
        const refreshed = await refreshToken();
        if (refreshed) {
            // إعادة المحاولة بـ Token الجديد
            response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${sessionStorage.getItem('smart_accountant_session')}`
                }
            });
        } else {
            // فشل التجديد - تسجيل الخروج
            window.location.href = '/login';
        }
    }
    
    return handleResponse<T>(response);
}
```

---

### الخطوة 3.2: Security Headers
```csharp
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append(
        "Content-Security-Policy", 
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
    );
    await next();
});
```

### الخطوة 3.3: HTTPS فقط في الإنتاج
```csharp
// Program.cs
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}
```

---

## ✅ ما هو موجود بالفعل (جيد)

### تشفير كلمات المرور ✅
```csharp
// AuthController.cs - BCrypt مستخدم
PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)

// التحقق
BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash)
```

---

## 📋 قائمة التحقق الأمني (مرتبة حسب الأولوية)

### 🔴 أولوية 1 - حرجة (قبل الإطلاق):
- [ ] تفعيل JWT Authentication
- [ ] إضافة Middleware للتحقق من Token

### 🟠 أولوية 2 - عالية (للإنتاج):
- [ ] تقييد CORS لدومينات محددة
- [ ] إضافة Rate Limiting
- [ ] تغيير JWT Secret Key
- [ ] تعطيل Swagger في الإنتاج

### 🟡 أولوية 3 - موصى بها:
- [ ] تفعيل HTTPS
- [ ] إضافة Security Headers
- [ ] إخفاء تفاصيل الأخطاء
- [ ] تفعيل Logging للمحاولات المشبوهة

---

## 🆘 في حالة الاختراق

1. **غيّر JWT Secret Key فوراً**
2. **أبطل جميع Tokens النشطة**
3. **راجع Activity Logs**
4. **أعد تعيين كلمات المرور للمستخدمين المتأثرين**
5. **حدّث جميع الأسرار (Secrets)**

---

## 📚 مراجع إضافية

- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)
- [ASP.NET Core Security Best Practices](https://docs.microsoft.com/en-us/aspnet/core/security/)
- [JWT.io - JWT Debugger](https://jwt.io/)

---

**SmartAccountant © 2026 - دليل الأمان**
