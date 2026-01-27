# 🚀 دليل نشر SmartAccountant على السيرفر

## 📁 محتويات هذا المجلد

```
DEPLOY/
├── frontend/          ← ملفات الواجهة الأمامية (React)
│   ├── index.html
│   └── assets/
├── backend/           ← ملفات API (ASP.NET Core)
│   ├── SmartAccountant.API.exe
│   ├── SmartAccountant.API.dll
│   ├── web.config
│   ├── appsettings.Production.json  ⚠️ يحتاج تعديل
│   └── ...
└── database/          ← سكربتات قاعدة البيانات
    ├── schema.sql
    ├── SmartAccountant_BaseSetup.sql
    └── SmartAccountant_TestData.sql
```

---

## 📋 خطوات النشر

### الخطوة 1: إعداد SQL Server

1. افتح **SQL Server Management Studio (SSMS)**
2. اتصل بالسيرفر
3. نفذ الملفات بالترتيب:
   ```sql
   -- أولاً: إنشاء قاعدة البيانات والجداول
   -- افتح وشغّل: database/schema.sql
   
   -- ثانياً: البيانات الأساسية
   -- افتح وشغّل: database/SmartAccountant_BaseSetup.sql
   
   -- ثالثاً (اختياري): بيانات تجريبية
   -- افتح وشغّل: database/SmartAccountant_TestData.sql
   ```

### الخطوة 2: نسخ الملفات للسيرفر

```powershell
# إنشاء المجلدات
New-Item -ItemType Directory -Path "C:\inetpub\wwwroot\SmartAccountant\api" -Force
New-Item -ItemType Directory -Path "C:\inetpub\wwwroot\SmartAccountant\www" -Force

# نسخ Backend
Copy-Item -Path ".\backend\*" -Destination "C:\inetpub\wwwroot\SmartAccountant\api\" -Recurse -Force

# نسخ Frontend
Copy-Item -Path ".\frontend\*" -Destination "C:\inetpub\wwwroot\SmartAccountant\www\" -Recurse -Force
```

### الخطوة 3: تعديل إعدادات Backend

افتح الملف:
```
C:\inetpub\wwwroot\SmartAccountant\api\appsettings.Production.json
```

وعدّل القيم التالية:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=اسم_السيرفر;Database=SmartAccountant_v1005_DB;User Id=اسم_المستخدم;Password=كلمة_السر;TrustServerCertificate=True;MultipleActiveResultSets=true"
  },
  "Jwt": {
    "Key": "مفتاح_سري_جديد_64_حرف_على_الأقل"
  },
  "AllowedOrigins": [
    "https://yourdomain.com",
    "https://www.yourdomain.com"
  ],
  "AllowedHosts": "yourdomain.com;www.yourdomain.com"
}
```

#### توليد JWT Key جديد:
```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
```

### الخطوة 4: إعداد IIS

#### نفذ في PowerShell (كـ Administrator):

```powershell
# 1. إنشاء Application Pool للـ API
& "$env:windir\system32\inetsrv\appcmd.exe" add apppool /name:"SmartAccountantAPI" /managedRuntimeVersion:"" /managedPipelineMode:"Integrated"

# 2. إنشاء موقع API (Port 5000 أو أي بورت آخر)
& "$env:windir\system32\inetsrv\appcmd.exe" add site /name:"SmartAccountantAPI" /physicalPath:"C:\inetpub\wwwroot\SmartAccountant\api" /bindings:http/*:5000:

# 3. ربط الموقع بالـ Application Pool
& "$env:windir\system32\inetsrv\appcmd.exe" set site "SmartAccountantAPI" /applicationDefaults.applicationPool:"SmartAccountantAPI"

# 4. إنشاء موقع Frontend (Port 80 أو 443)
& "$env:windir\system32\inetsrv\appcmd.exe" add site /name:"SmartAccountantWeb" /physicalPath:"C:\inetpub\wwwroot\SmartAccountant\www" /bindings:http/*:80:yourdomain.com

# 5. إعادة تشغيل IIS
iisreset
```

### الخطوة 5: تثبيت ASP.NET Core Hosting Bundle

تأكد من تثبيت:
- [.NET 10 Hosting Bundle](https://dotnet.microsoft.com/download/dotnet/10.0)

بعد التثبيت:
```powershell
iisreset
```

---

## 🔧 الإعدادات المهمة

### AllowedOrigins (CORS)

| النوع | القيمة |
|-------|--------|
| موقع الويب | `https://yourdomain.com` |
| iOS (Capacitor) | `capacitor://localhost` |
| Android (Capacitor) | `http://localhost` |

### Connection String أمثلة

**Windows Authentication:**
```
Server=SERVERNAME;Database=SmartAccountant_v1005_DB;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```

**SQL Authentication:**
```
Server=SERVERNAME;Database=SmartAccountant_v1005_DB;User Id=sa;Password=YourPassword;TrustServerCertificate=True;MultipleActiveResultSets=true
```

**SQL Express:**
```
Server=.\SQLEXPRESS;Database=SmartAccountant_v1005_DB;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```

---

## 🧪 الاختبار

بعد النشر، اختبر:

```powershell
# اختبار API
Invoke-WebRequest -Uri "http://localhost:5000/api/products" -Headers @{"X-Account-Id"="1"}

# أو في المتصفح
# http://yourdomain.com
# http://localhost:5000/api/products
```

---

## ⚠️ ملاحظات مهمة

1. **احذف قسم `___INSTRUCTIONS___`** من `appsettings.Production.json` قبل الإنتاج
2. **غيّر JWT Key** - لا تستخدم المفتاح الافتراضي
3. **HTTPS** - استخدم شهادة SSL للإنتاج
4. **Backup** - خذ نسخة احتياطية من قاعدة البيانات دورياً

---

## 📞 روابط مفيدة

- [ASP.NET Core IIS Hosting](https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/iis/)
- [.NET Downloads](https://dotnet.microsoft.com/download)

---

**تاريخ الإنشاء:** 2026-01-27
**الإصدار:** v1005
