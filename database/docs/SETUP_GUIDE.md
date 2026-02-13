# 🚀 دليل الإعداد الشامل - SmartAccountant v1.0.5

**آخر تحديث:** مارس 2026  
**الحالة:** ✅ موحد وكامل  
**المدة:** 10-15 دقيقة

---

## 📋 المحتويات

1. [متطلبات النظام](#متطلبات-النظام)
2. [خطوات الإعداد](#خطوات-الإعداد)
3. [التحقق من النجاح](#التحقق-من-النجاح)
4. [البيانات الافتراضية](#البيانات-الافتراضية)
5. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## متطلبات النظام

### البرامج المطلوبة

- ✅ SQL Server (LocalDB أو Full Edition)
- ✅ PowerShell (في Windows)
- ✅ .NET 7+ (للـ Backend)
- ✅ Node.js (للـ Frontend)

### التحقق من التثبيت

```powershell
# تحقق من SQL Server
sqlcmd -S "(localdb)\mssqllocaldb" -Q "SELECT @@VERSION;"

# تحقق من .NET
dotnet --version

# تحقق من Node.js
node --version
```

---

## خطوات الإعداد

### الخطوة 1️⃣: إنشاء قاعدة البيانات والجداول

**الملف:** `database/active/SCHEMA_COMPLETE.sql`

```powershell
cd "c:\MO\ai_proj\SmartAccountant_v1005"
sqlcmd -S "(localdb)\mssqllocaldb" -f 65001 -i "database/active/SCHEMA_COMPLETE.sql"
```

**المتوقع:** ✅ رسالة نجاح
**الوقت:** 5-10 ثوانٍ

### الخطوة 2️⃣: إضافة البيانات الأساسية

**الملف:** `database/active/DATA_COMPLETE.sql`

```powershell
sqlcmd -S "(localdb)\mssqllocaldb" -d "SmartAccountant_v1005_DB" -f 65001 -i "database/active/DATA_COMPLETE.sql"
```

**المتوقع:** ✅ رسائل تقدم: [1/5]، [2/5]، إلخ.
**الوقت:** 5-10 ثوانٍ

---

## التحقق من النجاح

### اختبر قاعدة البيانات

```sql
-- ✅ التحقق من وجود قاعدة البيانات
SELECT NAME FROM sys.databases WHERE NAME = 'SmartAccountant_v1005_DB';

-- ✅ عد الجداول (يجب أن يكون 15)
SELECT COUNT(*) AS [عدد الجداول] FROM sys.tables 
WHERE database_id = DB_ID('SmartAccountant_v1005_DB');

-- ✅ التحقق من المستخدم الأدمن
SELECT [Id], [Username], [Email], [IsActive] 
FROM [SmartAccountant_v1005_DB].[dbo].[Users] 
WHERE [Username] = 'admin';

-- ✅ التحقق من العملات (يجب أن يكون 5)
SELECT COUNT(*) FROM [SmartAccountant_v1005_DB].[dbo].[Currencies];

-- ✅ التحقق من الخطط (يجب أن يكون 3)
SELECT COUNT(*) FROM [SmartAccountant_v1005_DB].[dbo].[Plans];

-- ✅ التحقق من الأدوار (يجب أن يكون 4)
SELECT COUNT(*) FROM [SmartAccountant_v1005_DB].[dbo].[Roles];
```

---

## البيانات الافتراضية

### 👤 المستخدم الأدمن

| البيان | القيمة |
|-------|--------|
| اسم المستخدم | `admin` |
| كلمة المرور | `admin123` |
| النوع | Super Admin |
| الصلاحيات | كاملة |

**⚠️ تذكير:** غيّر كلمة المرور بعد الإعداد مباشرة!

### 💰 العملات المتاحة

- ريال سعودي (SAR) - **افتراضي**
- درهم إماراتي (AED)
- جنيه مصري (EGP)
- دولار أمريكي (USD)
- يورو (EUR)

### 📊 الخطط

| الخطة | السعر | المستخدمين | الحد الأقصى للفواتير |
|-------|-------|-----------|-----------------|
| أساسية | مجاني | 1 | غير محدود |
| احترافية | 299 SAR | 5 | غير محدود |
| مؤسسات | 999 SAR | غير محدود | غير محدود |

### 👥 الأدوار

1. **Owner** - مالك الحساب
2. **Admin** - مسؤول النظام
3. **Manager** - مدير العمليات
4. **Staff** - الموظفون

---

## استكشاف الأخطاء

### المشكلة: رسالة "Database already exists"

```powershell
# احذف قاعدة البيانات القديمة
sqlcmd -S "(localdb)\mssqllocaldb" -Q "DROP DATABASE SmartAccountant_v1005_DB"

# ثم أعد الخطوات من البداية
```

### المشكلة: خطأ في الاتصال

```powershell
# تحقق من SQL Server
sqlcmd -S "(localdb)\mssqllocaldb" -Q "SELECT 1"

# إذا فشل، أعد تشغيل الخدمة
# أو استخدم اسم السيرفر الكامل
```

### المشكلة: البيانات لم تُضف

```powershell
# تأكد من تشغيل الخطوة 1 أولاً
# تحقق من رسائل الخطأ بعناية
# أضف -o قبل اسم الملف للحصول على log
sqlcmd -S "(localdb)\mssqllocaldb" -d "SmartAccountant_v1005_DB" -f 65001 -i "database/active/DATA_COMPLETE.sql" -o output.log
```

---

## 🎉 النتيجة النهائية

✅ قاعدة بيانات كاملة مع 15 جدول  
✅ بيانات أساسية (عملات، خطط، أدوار، صلاحيات)  
✅ مستخدم أدمن جاهز  
✅ حساب تجريبي للاختبار  
✅ جاهز للاتصال مع Backend

---

**للأسئلة والمساعدة: راجع ملفات التوثيق الأخرى في هذا المجلد**
