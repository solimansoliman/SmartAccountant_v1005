using System;
using System.Collections.Generic;

namespace SmartAccountant.API.Models
{
    /// <summary>
    /// نموذج الدولة
    /// </summary>
    public class Country
    {
        public int Id { get; set; }
        
        /// <summary>
        /// رمز ISO 3166-1 alpha-3
        /// </summary>
        public string Code { get; set; }
        
        /// <summary>
        /// اسم الدولة بالعربية
        /// </summary>
        public string Name { get; set; }
        
        /// <summary>
        /// اسم الدولة بالإنجليزية
        /// </summary>
        public string NameEn { get; set; }
        
        /// <summary>
        /// هل الدولة نشطة
        /// </summary>
        public bool IsActive { get; set; } = true;
        
        /// <summary>
        /// تاريخ الإنشاء
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// تاريخ آخر تعديل
        /// </summary>
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public virtual ICollection<Province> Provinces { get; set; } = new List<Province>();
        public virtual ICollection<City> Cities { get; set; } = new List<City>();
        public virtual ICollection<Customer> Customers { get; set; } = new List<Customer>();
    }

    /// <summary>
    /// نموذج المحافظة/الولاية
    /// </summary>
    public class Province
    {
        public int Id { get; set; }
        
        /// <summary>
        /// معرف الدولة
        /// </summary>
        public int CountryId { get; set; }
        
        /// <summary>
        /// رمز المحافظة
        /// </summary>
        public string Code { get; set; }
        
        /// <summary>
        /// اسم المحافظة بالعربية
        /// </summary>
        public string Name { get; set; }
        
        /// <summary>
        /// اسم المحافظة بالإنجليزية
        /// </summary>
        public string NameEn { get; set; }
        
        /// <summary>
        /// هل المحافظة نشطة
        /// </summary>
        public bool IsActive { get; set; } = true;
        
        /// <summary>
        /// تاريخ الإنشاء
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// تاريخ آخر تعديل
        /// </summary>
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public virtual Country Country { get; set; }
        public virtual ICollection<City> Cities { get; set; } = new List<City>();
        public virtual ICollection<Customer> Customers { get; set; } = new List<Customer>();
    }

    /// <summary>
    /// نموذج المدينة/القطاع
    /// </summary>
    public class City
    {
        public int Id { get; set; }
        
        /// <summary>
        /// معرف المحافظة
        /// </summary>
        public int ProvinceId { get; set; }
        
        /// <summary>
        /// معرف الدولة (للأداء والاستعلامات السريعة)
        /// </summary>
        public int CountryId { get; set; }
        
        /// <summary>
        /// رمز المدينة
        /// </summary>
        public string Code { get; set; }
        
        /// <summary>
        /// اسم المدينة بالعربية
        /// </summary>
        public string Name { get; set; }
        
        /// <summary>
        /// اسم المدينة بالإنجليزية
        /// </summary>
        public string NameEn { get; set; }
        
        /// <summary>
        /// هل المدينة نشطة
        /// </summary>
        public bool IsActive { get; set; } = true;
        
        /// <summary>
        /// تاريخ الإنشاء
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        /// <summary>
        /// تاريخ آخر تعديل
        /// </summary>
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public virtual Province Province { get; set; }
        public virtual Country Country { get; set; }
        public virtual ICollection<Customer> Customers { get; set; } = new List<Customer>();
    }
}
