using Microsoft.EntityFrameworkCore;

namespace SmartAccountant.API.Helpers
{
    /// <summary>
    /// ╔══════════════════════════════════════════════════════════════════════════════╗
    /// ║                     ArabicSqlHelper - مساعد SQL العربي                       ║
    /// ╠══════════════════════════════════════════════════════════════════════════════╣
    /// ║  الغرض: التعامل الآمن مع النصوص العربية في استعلامات SQL Server               ║
    /// ║  المؤلف: Smart Accountant Team                                               ║
    /// ║  الإصدار: 1.0                                                                ║
    /// ║  التاريخ: 2026-01-07                                                         ║
    /// ╚══════════════════════════════════════════════════════════════════════════════╝
    /// 
    /// ═══════════════════════════════════════════════════════════════════════════════
    /// 📌 لماذا نحتاج هذا الـ Helper؟
    /// ═══════════════════════════════════════════════════════════════════════════════
    /// SQL Server يتعامل مع النصوص بطريقتين:
    /// 
    /// 1️⃣ VARCHAR (غير صالح للعربية):
    ///    - 1 byte لكل حرف
    ///    - يدعم ASCII فقط (الإنجليزية والأرقام)
    ///    - النصوص العربية تظهر كـ ??????? أو رموز غريبة
    ///    
    /// 2️⃣ NVARCHAR (الصحيح للعربية):
    ///    - 2 bytes لكل حرف
    ///    - يدعم Unicode (جميع اللغات)
    ///    - النصوص العربية تظهر صحيحة ✅
    /// 
    /// ═══════════════════════════════════════════════════════════════════════════════
    /// 📌 قواعد التعامل مع النصوص العربية
    /// ═══════════════════════════════════════════════════════════════════════════════
    /// 
    /// ┌─────────────────────────────────────────────────────────────────────────────┐
    /// │ 1. الأعمدة في الجداول: استخدم NVARCHAR وليس VARCHAR                         │
    /// │    ✅ Name NVARCHAR(200) NOT NULL                                            │
    /// │    ❌ Name VARCHAR(200) NOT NULL                                             │
    /// └─────────────────────────────────────────────────────────────────────────────┘
    /// 
    /// ┌─────────────────────────────────────────────────────────────────────────────┐
    /// │ 2. النصوص في SQL: استخدم N'' prefix                                         │
    /// │    ✅ INSERT INTO Table (Name) VALUES (N'محمد أحمد')                         │
    /// │    ❌ INSERT INTO Table (Name) VALUES ('محمد أحمد')                          │
    /// └─────────────────────────────────────────────────────────────────────────────┘
    /// 
    /// ┌─────────────────────────────────────────────────────────────────────────────┐
    /// │ 3. الـ Collation المناسب: Arabic_CI_AS                                      │
    /// │    - CI = Case Insensitive (لا يفرق بين الحروف الكبيرة والصغيرة)            │
    /// │    - AS = Accent Sensitive (يفرق بين الحركات)                               │
    /// └─────────────────────────────────────────────────────────────────────────────┘
    /// 
    /// ┌─────────────────────────────────────────────────────────────────────────────┐
    /// │ 4. مع Entity Framework Core:                                                │
    /// │    - الـ Models تتعامل تلقائياً مع Unicode ✅                                 │
    /// │    - فقط SQL الخام (Raw SQL) يحتاج N'' prefix                               │
    /// │    - استخدم Parameters بدلاً من string concatenation                        │
    /// └─────────────────────────────────────────────────────────────────────────────┘
    /// 
    /// ═══════════════════════════════════════════════════════════════════════════════
    /// 📌 أمثلة على الاستخدام
    /// ═══════════════════════════════════════════════════════════════════════════════
    /// 
    /// <example>
    /// // مثال 1: تحويل نص إلى صيغة SQL آمنة
    /// var sqlValue = ArabicSqlHelper.ToNVarCharSafe("محمد أحمد");
    /// // النتيجة: N'محمد أحمد'
    /// 
    /// // مثال 2: بناء استعلام INSERT
    /// var sql = ArabicSqlHelper.BuildInsertQuery("Customers",
    ///     ("Name", "أحمد محمد"),
    ///     ("NameEn", "Ahmed Mohamed"),
    ///     ("IsActive", "1"));
    /// // النتيجة: INSERT INTO Customers (Name, NameEn, IsActive) VALUES (N'أحمد محمد', N'Ahmed Mohamed', 1)
    /// 
    /// // مثال 3: بناء استعلام UPDATE
    /// var sql = ArabicSqlHelper.BuildUpdateQuery("Customers", "Id = 5",
    ///     ("Name", "علي حسن"),
    ///     ("UpdatedAt", "GETDATE()"));
    /// // النتيجة: UPDATE Customers SET Name = N'علي حسن', UpdatedAt = GETDATE() WHERE Id = 5
    /// 
    /// // مثال 4: التحقق من وجود نص عربي
    /// bool hasArabic = ArabicSqlHelper.ContainsArabic("Hello مرحبا");
    /// // النتيجة: true
    /// </example>
    /// 
    /// ═══════════════════════════════════════════════════════════════════════════════
    /// ⚠️ تحذيرات أمنية
    /// ═══════════════════════════════════════════════════════════════════════════════
    /// 
    /// 1. لا تستخدم string concatenation مباشرة مع مدخلات المستخدم
    /// 2. استخدم Parameters كلما أمكن (أفضل للأمان والأداء)
    /// 3. هذا الـ Helper يقوم بـ escape للـ single quotes لكن Parameters أفضل
    /// 
    /// </summary>
    public static class ArabicSqlHelper
    {
        /// <summary>
        /// يحول النص إلى نص SQL مع prefix N للنصوص العربية
        /// </summary>
        /// <param name="value">النص المراد تحويله</param>
        /// <returns>النص مع N'' إذا كان يحتوي على أحرف Unicode</returns>
        public static string ToNVarCharSafe(string? value)
        {
            if (string.IsNullOrEmpty(value))
                return "NULL";
            
            // Escape single quotes
            var escaped = value.Replace("'", "''");
            
            // Always use N prefix for safety with Arabic text
            return $"N'{escaped}'";
        }

        /// <summary>
        /// يتحقق من أن النص يحتوي على أحرف عربية
        /// </summary>
        public static bool ContainsArabic(string? text)
        {
            if (string.IsNullOrEmpty(text))
                return false;

            return text.Any(c => c >= 0x0600 && c <= 0x06FF);
        }

        /// <summary>
        /// ينشئ استعلام INSERT آمن مع دعم العربية
        /// </summary>
        /// <example>
        /// var sql = ArabicSqlHelper.BuildInsertQuery("Customers", 
        ///     ("Name", "أحمد"),
        ///     ("NameEn", "Ahmed"),
        ///     ("IsActive", "1"));
        /// </example>
        public static string BuildInsertQuery(string tableName, params (string Column, string Value)[] values)
        {
            var columns = string.Join(", ", values.Select(v => v.Column));
            var sqlValues = string.Join(", ", values.Select(v => 
            {
                // Check if it's a number or boolean
                if (int.TryParse(v.Value, out _) || decimal.TryParse(v.Value, out _))
                    return v.Value;
                if (v.Value.ToLower() == "null")
                    return "NULL";
                if (v.Value.ToLower() == "getdate()" || v.Value.ToLower() == "getutcdate()")
                    return v.Value;
                
                return ToNVarCharSafe(v.Value);
            }));

            return $"INSERT INTO {tableName} ({columns}) VALUES ({sqlValues})";
        }

        /// <summary>
        /// ينشئ استعلام UPDATE آمن مع دعم العربية
        /// </summary>
        public static string BuildUpdateQuery(string tableName, string whereClause, params (string Column, string Value)[] values)
        {
            var setClause = string.Join(", ", values.Select(v =>
            {
                string sqlValue;
                if (int.TryParse(v.Value, out _) || decimal.TryParse(v.Value, out _))
                    sqlValue = v.Value;
                else if (v.Value.ToLower() == "null")
                    sqlValue = "NULL";
                else if (v.Value.ToLower() == "getdate()" || v.Value.ToLower() == "getutcdate()")
                    sqlValue = v.Value;
                else
                    sqlValue = ToNVarCharSafe(v.Value);

                return $"{v.Column} = {sqlValue}";
            }));

            return $"UPDATE {tableName} SET {setClause} WHERE {whereClause}";
        }

        /// <summary>
        /// تنفيذ SQL خام مع دعم Parameters (الطريقة الموصى بها)
        /// </summary>
        /// <remarks>
        /// استخدام Parameters أفضل من string concatenation لأنه:
        /// 1. يحمي من SQL Injection
        /// 2. يتعامل تلقائياً مع Unicode
        /// 3. أفضل للأداء (query plan caching)
        /// </remarks>
        public static async Task<int> ExecuteSqlWithParamsAsync(
            DbContext context, 
            string sql, 
            params object[] parameters)
        {
            return await context.Database.ExecuteSqlRawAsync(sql, parameters);
        }
    }

    /// <summary>
    /// ╔══════════════════════════════════════════════════════════════════════════════╗
    /// ║                 ArabicTableGuidelines - إرشادات الجداول العربية              ║
    /// ╚══════════════════════════════════════════════════════════════════════════════╝
    /// 
    /// هذه الـ class تحتوي على إرشادات توثيقية فقط (لا تحتوي على كود تنفيذي)
    /// الغرض: توثيق أفضل الممارسات لإنشاء جداول تدعم اللغة العربية
    /// </summary>
    public static class ArabicTableGuidelines
    {
        /*
         * ╔═══════════════════════════════════════════════════════════════════════════════╗
         * ║           📋 إرشادات إنشاء الجداول لدعم النصوص العربية                        ║
         * ╚═══════════════════════════════════════════════════════════════════════════════╝
         * 
         * ═══════════════════════════════════════════════════════════════════════════════
         * 📌 1. نوع البيانات للنصوص
         * ═══════════════════════════════════════════════════════════════════════════════
         * 
         * ✅ استخدم NVARCHAR بدلاً من VARCHAR:
         *    
         *    -- صحيح ✅
         *    Name NVARCHAR(200) NOT NULL,
         *    Description NVARCHAR(MAX)
         *    
         *    -- خطأ ❌
         *    Name VARCHAR(200) NOT NULL,
         *    Description TEXT
         * 
         * ═══════════════════════════════════════════════════════════════════════════════
         * 📌 2. Collation (ترتيب الأحرف)
         * ═══════════════════════════════════════════════════════════════════════════════
         * 
         * لقاعدة البيانات كاملة:
         *    CREATE DATABASE SmartAccountant COLLATE Arabic_CI_AS;
         * 
         * لعمود محدد:
         *    Name NVARCHAR(200) COLLATE Arabic_CI_AS NOT NULL
         * 
         * خيارات الـ Collation:
         *    - Arabic_CI_AS: الأكثر شيوعاً (Case Insensitive, Accent Sensitive)
         *    - Arabic_CS_AS: Case Sensitive (يفرق بين a و A)
         *    - Arabic_CI_AI: Accent Insensitive (لا يفرق بين الحركات)
         * 
         * ═══════════════════════════════════════════════════════════════════════════════
         * 📌 3. إدخال البيانات (INSERT)
         * ═══════════════════════════════════════════════════════════════════════════════
         * 
         * ✅ صحيح (مع N prefix):
         *    INSERT INTO Customers (Name, City) 
         *    VALUES (N'محمد أحمد', N'الرياض');
         * 
         * ❌ خطأ (بدون N prefix):
         *    INSERT INTO Customers (Name, City) 
         *    VALUES ('محمد أحمد', 'الرياض');
         *    -- النتيجة: ?????? ????
         * 
         * ═══════════════════════════════════════════════════════════════════════════════
         * 📌 4. البحث والمقارنة
         * ═══════════════════════════════════════════════════════════════════════════════
         * 
         * ✅ صحيح:
         *    SELECT * FROM Customers WHERE Name = N'محمد';
         *    SELECT * FROM Customers WHERE Name LIKE N'%أحمد%';
         * 
         * ❌ خطأ:
         *    SELECT * FROM Customers WHERE Name = 'محمد';
         * 
         * ═══════════════════════════════════════════════════════════════════════════════
         * 📌 5. Entity Framework Core
         * ═══════════════════════════════════════════════════════════════════════════════
         * 
         * في EF Core، الـ string properties تُحوَّل تلقائياً إلى NVARCHAR:
         * 
         *    public class Customer
         *    {
         *        public string Name { get; set; }  // → NVARCHAR(max)
         *        
         *        [MaxLength(200)]
         *        public string City { get; set; }  // → NVARCHAR(200)
         *    }
         * 
         * لتحديد الطول في Fluent API:
         * 
         *    modelBuilder.Entity<Customer>(entity =>
         *    {
         *        entity.Property(e => e.Name)
         *            .IsRequired()
         *            .HasMaxLength(200);  // → NVARCHAR(200) NOT NULL
         *    });
         * 
         * ═══════════════════════════════════════════════════════════════════════════════
         * 📌 6. مثال على إنشاء جدول كامل
         * ═══════════════════════════════════════════════════════════════════════════════
         * 
         *    CREATE TABLE Customers (
         *        Id INT IDENTITY(1,1) PRIMARY KEY,
         *        AccountId INT NOT NULL,
         *        
         *        -- النصوص العربية
         *        Name NVARCHAR(200) COLLATE Arabic_CI_AS NOT NULL,
         *        NameEn NVARCHAR(200) NULL,
         *        Address NVARCHAR(500) NULL,
         *        Notes NVARCHAR(MAX) NULL,
         *        
         *        -- البيانات الأخرى
         *        Phone VARCHAR(20) NULL,  -- الأرقام لا تحتاج NVARCHAR
         *        Email VARCHAR(200) NULL, -- الإيميل عادة إنجليزي
         *        
         *        -- التواريخ
         *        CreatedAt DATETIME2 DEFAULT GETDATE(),
         *        UpdatedAt DATETIME2 NULL,
         *        
         *        -- العلاقات
         *        CONSTRAINT FK_Customers_Accounts 
         *            FOREIGN KEY (AccountId) REFERENCES Accounts(Id)
         *    );
         * 
         * ═══════════════════════════════════════════════════════════════════════════════
         * 📌 7. تحويل جدول موجود
         * ═══════════════════════════════════════════════════════════════════════════════
         * 
         * إذا كان لديك جدول بـ VARCHAR وتريد تحويله:
         * 
         *    -- 1. إضافة عمود جديد
         *    ALTER TABLE Customers ADD Name_New NVARCHAR(200);
         *    
         *    -- 2. نسخ البيانات
         *    UPDATE Customers SET Name_New = Name;
         *    
         *    -- 3. حذف العمود القديم
         *    ALTER TABLE Customers DROP COLUMN Name;
         *    
         *    -- 4. إعادة تسمية العمود الجديد
         *    EXEC sp_rename 'Customers.Name_New', 'Name', 'COLUMN';
         * 
         * أو مباشرة (إذا كان العمود فارغاً):
         * 
         *    ALTER TABLE Customers 
         *    ALTER COLUMN Name NVARCHAR(200) NOT NULL;
         * 
         * ═══════════════════════════════════════════════════════════════════════════════
         */
    }
}
