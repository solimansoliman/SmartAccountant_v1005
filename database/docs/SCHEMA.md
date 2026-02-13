# 📊 توثيق هيكل قاعدة البيانات - Schema

**الإصدار:** 1.0.5  
**آخر تحديث:** مارس 2026

---

## 🗺️ قائمة الجداول الرئيسية

### 1. جدول العملات - `Currencies`
```
┌─────────────────┬──────────────┐
│ العمود           │ النوع        │
├─────────────────┼──────────────┤
│ Id (PK)         │ INT          │
│ Code            │ NVARCHAR(10) │
│ Name            │ NVARCHAR(100)│
│ NameEn          │ NVARCHAR(100)│
│ Symbol          │ NVARCHAR(10) │
│ Country         │ NVARCHAR(100)│
│ ExchangeRate    │ DECIMAL(18,6)│
│ IsActive        │ BIT          │
└─────────────────┴──────────────┘
```

### 2. جدول الحسابات/الشركات - `Accounts`
```
┌─────────────────────┬──────────────┐
│ العمود              │ النوع        │
├─────────────────────┼──────────────┤
│ Id (PK)             │ INT          │
│ Name                │ NVARCHAR(200)│
│ Email               │ NVARCHAR(100)│
│ Phone               │ NVARCHAR(50) │
│ CurrencyId (FK)     │ INT          │
│ IsActive            │ BIT          │
│ CreatedAt           │ DATETIME2    │
│ SubscriptionExpiry  │ DATETIME2    │
└─────────────────────┴──────────────┘
```

### 3. جدول المستخدمين - `Users`
```
┌──────────────────────┬──────────────┐
│ العمود               │ النوع        │
├──────────────────────┼──────────────┤
│ Id (PK)              │ INT          │
│ AccountId (FK)       │ INT          │
│ Username             │ NVARCHAR(50) │
│ PasswordHash         │ NVARCHAR(500)│
│ FullName             │ NVARCHAR(100)│
│ Email                │ NVARCHAR(100)│
│ Phone                │ NVARCHAR(20) │
│ RoleType             │ INT          │ ✨ جديد
│ IsSuperAdmin         │ BIT          │
│ IsActive             │ BIT          │
│ CanCreateInvoices    │ BIT          │
│ CanManageCustomers   │ BIT          │
│ CanManageExpenses    │ BIT          │
│ CanManageProducts    │ BIT          │
│ CanManageSettings    │ BIT          │
│ CanManageUsers       │ BIT          │
│ CanViewReports       │ BIT          │
│ MaxMessageLength     │ INT          │
│ MaxNotificationLength│ INT          │
│ CreatedAt            │ DATETIME2    │
│ LastLoginAt          │ DATETIME2    │
└──────────────────────┴──────────────┘
```

**قيم RoleType:**
- `0` = Owner (المالك)
- `1` = Admin (مسؤول)
- `2` = Manager (مدير)
- `3` = Staff (موظف)
- `4` = User (مستخدم عام)
- `5` = Viewer (عارض فقط)

### 4. جدول الأدوار - `Roles`
```
┌──────────────────┬──────────────┐
│ العمود            │ النوع        │
├──────────────────┼──────────────┤
│ Id (PK)          │ INT          │
│ Name             │ NVARCHAR(100)│
│ Description      │ NVARCHAR(500)│
│ IsSystemRole     │ BIT          │
│ IsActive         │ BIT          │
│ CreatedAt        │ DATETIME2    │
│ RoleType         │ NVARCHAR(50) │ ✨ جديد
└──────────────────┴──────────────┘
```

### 5. جدول الصلاحيات - `Permissions`
```
┌──────────────┬──────────────┐
│ العمود        │ النوع        │
├──────────────┼──────────────┤
│ Id (PK)      │ INT          │
│ Name         │ NVARCHAR(100)│
│ Description  │ NVARCHAR(500)│
│ Category     │ NVARCHAR(50) │
│ IsActive     │ BIT          │
└──────────────┴──────────────┘
```

### 6. جدول العملاء - `Customers`
```
┌──────────────────┬──────────────┐
│ العمود            │ النوع        │
├──────────────────┼──────────────┤
│ Id (PK)          │ INT          │
│ AccountId (FK)   │ INT          │
│ Name             │ NVARCHAR(200)│
│ Email            │ NVARCHAR(100)│
│ Phone            │ NVARCHAR(20) │
│ Address          │ NVARCHAR(500)│
│ CountryId        │ INT          │ ✨ جديد
│ ProvinceId       │ INT          │ ✨ جديد
│ CityId           │ INT          │ ✨ جديد
│ IsActive         │ BIT          │
│ CreatedAt        │ DATETIME2    │
└──────────────────┴──────────────┘
```

---

## 🔗 العلاقات بين الجداول

```
Accounts (حساب)
    ↓ (One-to-Many)
    ├─→ Users (مستخدمون)
    ├─→ Customers (عملاء)
    ├─→ Products (منتجات)
    └─→ Invoices (فواتير)

Users (مستخدم)
    ↓ (Many-to-Many)
    ├─→ UserRoles ←→ Roles (الأدوار)
    └─→ Permissions (الصلاحيات)

Currencies (عملة)
    ↓ (One-to-Many)
    └─→ Accounts (الحسابات)
```

---

## 🗓️ الأعمدة الزمنية القياسية

معظم الجداول تحتوي على:
- `CreatedAt` - تاريخ الإنشاء (DATETIME2)
- `UpdatedAt` - تاريخ آخر تعديل (DATETIME2)

---

## 🏗️ الفهارس الرئيسية

- `PK_Users_Id` - المفتاح الأساسي لجدول المستخدمين
- `FK_Users_Accounts` - العلاقة مع حدول الحسابات
- `UQ_Users_Username_Account` - تفرد اسم المستخدم لكل حساب
- فهارس أخرى لتحسين الأداء

---

## 💾 الافتراضيات والقيود

| العمود | الافتراضي | القيد |
|-------|---------|------|
| IsActive | 1 | يجب أن يكون 0 أو 1 |
| IsSystemRole | 0 | للأدوار النظامية |
| MaxMessageLength | 1000 | الحد الأقصى للرسالة |
| RoleType | 4 | User (افتراضياً) |
| CanCreateInvoices | 0 | يتم تعيينها لاحقاً |

---

## ✨ المقاييس والدقة

- **الأسعار:** DECIMAL(18, 6) - دقة عالية للعملات
- **الأرقام الطويلة:** INT - للمعرفات والأرقام الكبيرة
- **النصوص:** NVARCHAR - لدعم اللغات المختلفة
- **التواريخ:** DATETIME2 - دقة عالية للوقت

---

## 🔐 الأمان والسياسات

- ✅ كلمات المرور مشفرة (BCrypt)
- ✅ دعم القفل بعد محاولات فاشلة
- ✅ تتبع آخر تسجيل دخول
- ✅ دعم الأدوار والصلاحيات

