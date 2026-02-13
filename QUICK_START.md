# نظام SmartAccountant v1005 - دليل سريع للبدء

## 🚀 البدء السريع

### المتطلبات
- SQL Server 2019 أو أحدث
- .NET 6 SDK أو أحدث
- Node.js 18+ و npm
- Visual Studio أو VS Code

### الخطوات

#### 1. قاعدة البيانات
```bash
# قم بتشغيل هذين الملفات بالترتيب على SQL Server:
1. database/01_Database_Schema.sql      # الهيكل
2. database/02_Base_Data.sql            # البيانات الأساسية
```

#### 2. تشغيل الخادم الخلفي (Backend)
```bash
cd backend/SmartAccountant.API
dotnet run
# يستمع على: http://localhost:5000
```

#### 3. تشغيل الواجهة الأمامية (Frontend)
```bash
cd frontend
npm install
npm run dev
# يستمع على: http://localhost:3000
```

---

## 📁 البنية الأساسية

```
SmartAccountant_v1005/
├── database/                    # ملفات قاعدة البيانات
│   ├── 01_Database_Schema.sql  # ✓ الهيكل (استخدم هذا)
│   ├── 02_Base_Data.sql        # ✓ البيانات (استخدم هذا)
│   └── README_Database_Setup.md # تعليمات مفصلة
│
├── backend/
│   └── SmartAccountant.API/     # خادم ASP.NET Core
│       ├── appsettings.json
│       ├── Program.cs
│       └── ...
│
├── frontend/                    # تطبيق React
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
└── DEPLOY/                      # ملفات النشر
    ├── backend/                 # نسخة مجمعة من الخادم
    ├── database/                # ملفات قاعدة البيانات
    └── frontend/                # نسخة مجمعة من الواجهة
```

---

## 🔑 بيانات الدخول الافتراضية

### حساب الأدمن (إذا كانت موجودة)
- **اسم المستخدم:** admin
- **كلمة المرور:** admin123

> **ملاحظة:** تحقق من البيانات الفعلية في قاعدة البيانات

---

## 📊 المميزات الرئيسية

✅ إدارة المنتجات والمخزون  
✅ إدارة العملاء والفواتير  
✅ إدارة المصروفات والإيرادات  
✅ تقارير مالية متقدمة  
✅ نظام الصلاحيات والأدوار  
✅ إشعارات ورسائل  
✅ دعم العربية بالكامل  

---

## 🔧 الإعدادات المهمة

### Connection String (Backend)
ملف: `backend/SmartAccountant.API/appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER;Database=SmartAccountant_v1005_DB;User Id=myapp;Password=YOUR_PASSWORD;TrustServerCertificate=True;"
  }
}
```

### API URL (Frontend)
ملف: `frontend/src/services/api.ts` (أو ما شابه)
```typescript
const API_BASE_URL = 'http://localhost:5000';
```

---

## 🛠️ حل المشاكل الشائعة

### ❌ خطأ الاتصال بقاعدة البيانات
```
الحل: تحقق من:
1. إن SQL Server قيد التشغيل
2. بيانات المستخدم صحيحة
3. اسم السيرفر صحيح
```

### ❌ خطأ "Database does not exist"
```
الحل: تأكد من تشغيل:
01_Database_Schema.sql أولاً
```

### ❌ الواجهة لا تتصل بالخادم
```
الحل:
1. تأكد من تشغيل الخادم (localhost:5000)
2. تحقق من CORS settings في appsettings.json
3. تأكد من رابط API صحيح في Frontend
```

---

## 📖 ملفات مهمة أخرى

| الملف | الوصف |
|------|-------|
| `docs/` | توثيق مفصل |
| `database/README_Database_Setup.md` | شرح قاعدة البيانات |
| `DEPLOY/README_DEPLOY.md` | إرشادات النشر |
| `README.md` | ملف README الرئيسي |

---

## 🚀 النشر على الإنتاج

راجع: `DEPLOY/README_DEPLOY.md`

---

**آخر تحديث:** 13 فبراير 2026  
**الإصدار:** 1.005
