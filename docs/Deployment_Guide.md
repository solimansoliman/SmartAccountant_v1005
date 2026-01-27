# 🚀 دليل نشر SmartAccountant على السيرفر
# SmartAccountant Deployment Guide

**تاريخ التحديث:** 2026-01-27  
**الإصدار:** 1.0.0

---

## 📋 المتطلبات الأساسية / Prerequisites

### متطلبات السيرفر:
| المكون | الحد الأدنى | الموصى به |
|--------|-------------|-----------|
| المعالج (CPU) | 2 Cores | 4 Cores |
| الذاكرة (RAM) | 4 GB | 8 GB |
| التخزين (Storage) | 20 GB SSD | 50 GB SSD |
| نظام التشغيل | Windows Server 2019 / Ubuntu 20.04 | Windows Server 2022 / Ubuntu 22.04 |

### البرمجيات المطلوبة:
- ✅ .NET 10 Runtime أو SDK
- ✅ SQL Server 2019+ أو Azure SQL
- ✅ Node.js 20+ (للبناء فقط)
- ✅ IIS (Windows) أو Nginx/Apache (Linux)
- ✅ Git (اختياري)

---

## 🗄️ الجزء الأول: قاعدة البيانات (Database)

### الخطوة 1: إنشاء قاعدة البيانات

#### على SQL Server:
```sql
-- الاتصال بـ SQL Server Management Studio (SSMS)
-- أو استخدام sqlcmd

-- 1. إنشاء قاعدة البيانات
CREATE DATABASE SmartAccountant
COLLATE Arabic_CI_AS;
GO

USE SmartAccountant;
GO
```

### الخطوة 2: تنفيذ سكريبت الجداول

```powershell
# من سطر الأوامر (PowerShell)
sqlcmd -S SERVER_NAME -U sa -P "YOUR_PASSWORD" -i "Schema_20260127.sql"

# أو إذا كان Windows Authentication
sqlcmd -S SERVER_NAME -E -i "Schema_20260127.sql"
```

#### أو من SSMS:
1. افتح SQL Server Management Studio
2. اتصل بالسيرفر
3. افتح ملف `Schema_20260127.sql`
4. اضغط Execute (F5)

### الخطوة 3: إدخال البيانات الأساسية

```powershell
sqlcmd -S SERVER_NAME -d SmartAccountant -i "BaseData_ForServer.sql"
```

### الخطوة 4: إنشاء مستخدم قاعدة البيانات

```sql
-- إنشاء Login
CREATE LOGIN SmartAccountantUser 
WITH PASSWORD = 'StrongPassword@123!';
GO

-- إنشاء User في قاعدة البيانات
USE SmartAccountant;
GO

CREATE USER SmartAccountantUser FOR LOGIN SmartAccountantUser;
GO

-- منح الصلاحيات
ALTER ROLE db_datareader ADD MEMBER SmartAccountantUser;
ALTER ROLE db_datawriter ADD MEMBER SmartAccountantUser;
GRANT EXECUTE TO SmartAccountantUser;
GO
```

### الخطوة 5: Connection String

```
Server=YOUR_SERVER;Database=SmartAccountant;User Id=SmartAccountantUser;Password=StrongPassword@123!;TrustServerCertificate=True;
```

---

## ⚙️ الجزء الثاني: الباك إند (Backend API)

### الخطوة 1: بناء المشروع (Build)

```powershell
# الانتقال لمجلد الباك إند
cd backend/SmartAccountant.API

# بناء المشروع للإنتاج
dotnet publish -c Release -o ./publish
```

### الخطوة 2: تعديل الإعدادات

#### تعديل `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER;Database=SmartAccountant;User Id=SmartAccountantUser;Password=StrongPassword@123!;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "YOUR_SECRET_KEY_MINIMUM_32_CHARACTERS_LONG!!",
    "Issuer": "SmartAccountant",
    "Audience": "SmartAccountantUsers",
    "ExpiryInDays": 7
  },
  "AllowedOrigins": [
    "https://yourdomain.com",
    "https://www.yourdomain.com"
  ],
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

### الخطوة 3: النشر على Windows Server (IIS)

#### 3.1 تثبيت .NET Hosting Bundle:
```powershell
# تحميل وتثبيت من:
# https://dotnet.microsoft.com/download/dotnet/10.0
```

#### 3.2 إنشاء موقع في IIS:
1. افتح **IIS Manager**
2. اضغط بالزر الأيمن على **Sites** → **Add Website**
3. أدخل:
   - **Site name:** SmartAccountant-API
   - **Physical path:** `C:\inetpub\SmartAccountant\api`
   - **Port:** 5000 (أو أي بورت متاح)
4. اضغط **OK**

#### 3.3 نسخ الملفات:
```powershell
# نسخ ملفات النشر
Copy-Item -Path ".\publish\*" -Destination "C:\inetpub\SmartAccountant\api" -Recurse -Force
```

#### 3.4 إعداد Application Pool:
1. في IIS Manager، اذهب إلى **Application Pools**
2. اضغط على **SmartAccountant-API** pool
3. اضغط **Advanced Settings**
4. غيّر **.NET CLR Version** إلى **No Managed Code**

### الخطوة 4: النشر على Linux (Ubuntu)

#### 4.1 تثبيت .NET Runtime:
```bash
# إضافة مستودع Microsoft
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb

# تثبيت .NET Runtime
sudo apt-get update
sudo apt-get install -y aspnetcore-runtime-10.0
```

#### 4.2 نسخ الملفات:
```bash
# إنشاء المجلد
sudo mkdir -p /var/www/smartaccountant/api

# نسخ الملفات
sudo cp -r ./publish/* /var/www/smartaccountant/api/

# تعيين الصلاحيات
sudo chown -R www-data:www-data /var/www/smartaccountant
```

#### 4.3 إنشاء Systemd Service:
```bash
sudo nano /etc/systemd/system/smartaccountant-api.service
```

```ini
[Unit]
Description=SmartAccountant API
After=network.target

[Service]
WorkingDirectory=/var/www/smartaccountant/api
ExecStart=/usr/bin/dotnet /var/www/smartaccountant/api/SmartAccountant.API.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=smartaccountant-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000

[Install]
WantedBy=multi-user.target
```

```bash
# تفعيل وتشغيل الخدمة
sudo systemctl enable smartaccountant-api
sudo systemctl start smartaccountant-api

# التحقق من الحالة
sudo systemctl status smartaccountant-api
```

#### 4.4 إعداد Nginx كـ Reverse Proxy:
```bash
sudo nano /etc/nginx/sites-available/smartaccountant-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/smartaccountant-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🎨 الجزء الثالث: الفرونت إند (Frontend)

### الخطوة 1: تعديل إعدادات API

#### تعديل ملف البيئة أو `configService.ts`:
```typescript
// تغيير رابط الـ API
const API_BASE_URL = 'https://api.yourdomain.com';
```

### الخطوة 2: بناء المشروع

```powershell
# الانتقال لمجلد الفرونت إند
cd frontend

# تثبيت الحزم
npm install

# بناء للإنتاج
npm run build
```

سينتج مجلد `dist` يحتوي على الملفات الجاهزة للنشر.

### الخطوة 3: النشر على Windows Server (IIS)

#### 3.1 إنشاء موقع في IIS:
1. افتح **IIS Manager**
2. اضغط بالزر الأيمن على **Sites** → **Add Website**
3. أدخل:
   - **Site name:** SmartAccountant-Web
   - **Physical path:** `C:\inetpub\SmartAccountant\web`
   - **Port:** 80 أو 443
4. اضغط **OK**

#### 3.2 نسخ الملفات:
```powershell
Copy-Item -Path ".\dist\*" -Destination "C:\inetpub\SmartAccountant\web" -Recurse -Force
```

#### 3.3 إعداد URL Rewrite (مهم لـ SPA):

أنشئ ملف `web.config` في مجلد النشر:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="font/woff" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
  </system.webServer>
</configuration>
```

### الخطوة 4: النشر على Linux (Nginx)

#### 4.1 نسخ الملفات:
```bash
sudo mkdir -p /var/www/smartaccountant/web
sudo cp -r ./dist/* /var/www/smartaccountant/web/
sudo chown -R www-data:www-data /var/www/smartaccountant/web
```

#### 4.2 إعداد Nginx:
```bash
sudo nano /etc/nginx/sites-available/smartaccountant-web
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/smartaccountant/web;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA Routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API Proxy (اختياري إذا كان على نفس السيرفر)
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/smartaccountant-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 الجزء الرابع: الأمان وSSL

### تثبيت شهادة SSL (Let's Encrypt)

#### على Ubuntu مع Nginx:
```bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx

# الحصول على الشهادة
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# التجديد التلقائي
sudo crontab -e
# أضف السطر التالي:
0 12 * * * /usr/bin/certbot renew --quiet
```

#### على Windows مع IIS:
1. استخدم **win-acme** من: https://www.win-acme.com/
2. أو اشترِ شهادة من مزود موثوق

---

## 📊 الجزء الخامس: المراقبة والصيانة

### مراقبة الأداء

#### على Linux:
```bash
# مراقبة استخدام الموارد
htop

# مراقبة سجلات API
sudo journalctl -u smartaccountant-api -f

# مراقبة Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### على Windows:
- استخدم **Event Viewer** لمراقبة السجلات
- استخدم **Performance Monitor** لمراقبة الموارد

### النسخ الاحتياطي لقاعدة البيانات

```sql
-- نسخ احتياطي يدوي
BACKUP DATABASE SmartAccountant
TO DISK = 'C:\Backups\SmartAccountant_20260127.bak'
WITH COMPRESSION;
```

```powershell
# سكريبت نسخ احتياطي يومي (PowerShell)
$date = Get-Date -Format "yyyyMMdd"
$backupPath = "C:\Backups\SmartAccountant_$date.bak"
Invoke-Sqlcmd -Query "BACKUP DATABASE SmartAccountant TO DISK = '$backupPath' WITH COMPRESSION" -ServerInstance "."
```

---

## ✅ قائمة التحقق قبل الإطلاق / Pre-Launch Checklist

### قاعدة البيانات:
- [ ] تم إنشاء قاعدة البيانات
- [ ] تم تنفيذ سكريبت الجداول
- [ ] تم إدخال البيانات الأساسية
- [ ] تم إنشاء مستخدم قاعدة البيانات
- [ ] تم إعداد النسخ الاحتياطي

### الباك إند:
- [ ] تم تعديل Connection String
- [ ] تم تعديل JWT Secret Key
- [ ] تم تعديل Allowed Origins
- [ ] تم نشر الملفات
- [ ] API يعمل ويستجيب

### الفرونت إند:
- [ ] تم تعديل رابط API
- [ ] تم بناء المشروع
- [ ] تم نشر الملفات
- [ ] الموقع يفتح بشكل صحيح
- [ ] التوجيه (Routing) يعمل

### الأمان:
- [ ] تم تثبيت شهادة SSL
- [ ] تم تعطيل الـ Debug mode
- [ ] تم إخفاء الأخطاء التفصيلية
- [ ] Firewall مُعد بشكل صحيح

---

## 🆘 استكشاف الأخطاء / Troubleshooting

### مشكلة: API لا يعمل
```bash
# التحقق من حالة الخدمة
sudo systemctl status smartaccountant-api

# عرض آخر 50 سطر من السجلات
sudo journalctl -u smartaccountant-api -n 50
```

### مشكلة: خطأ في الاتصال بقاعدة البيانات
- تأكد من Connection String
- تأكد من تشغيل SQL Server
- تأكد من صلاحيات المستخدم
- تأكد من فتح Port 1433 في Firewall

### مشكلة: صفحة 404 في الفرونت إند
- تأكد من إعداد URL Rewrite
- تأكد من وجود ملف `web.config` (IIS)
- تأكد من إعداد `try_files` (Nginx)

### مشكلة: CORS Error
- تأكد من إضافة الدومين في `AllowedOrigins`
- تأكد من إعادة تشغيل الـ API بعد التعديل

---

## 📞 الدعم الفني

للمساعدة أو الاستفسارات:
- 📧 البريد: support@smartaccountant.com
- 📱 الهاتف: +20 XXX XXX XXXX

---

**SmartAccountant © 2026 - جميع الحقوق محفوظة**
