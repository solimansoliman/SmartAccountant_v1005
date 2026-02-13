namespace SmartAccountant.API.DTOs
{
    public class CountryDto
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string NameEn { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateCountryDto
    {
        public string Code { get; set; }
        public string Name { get; set; }
        public string NameEn { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class ProvinceDto
    {
        public int Id { get; set; }
        public int CountryId { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string NameEn { get; set; }
        public bool IsActive { get; set; }
        public CountryDto Country { get; set; }
    }

    public class CreateProvinceDto
    {
        public int CountryId { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string NameEn { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class CityDto
    {
        public int Id { get; set; }
        public int ProvinceId { get; set; }
        public int CountryId { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string NameEn { get; set; }
        public bool IsActive { get; set; }
        public ProvinceDto Province { get; set; }
    }

    public class CreateCityDto
    {
        public int ProvinceId { get; set; }
        public int CountryId { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string NameEn { get; set; }
        public bool IsActive { get; set; } = true;
    }

    // DTOs للاستجابات المختصرة (للاستخدام في القوائم المنسدلة)
    public class CountrySelectDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string NameEn { get; set; }
        public string Code { get; set; }
    }

    public class ProvinceSelectDto
    {
        public int Id { get; set; }
        public int CountryId { get; set; }
        public string Name { get; set; }
        public string NameEn { get; set; }
    }

    public class CitySelectDto
    {
        public int Id { get; set; }
        public int ProvinceId { get; set; }
        public int CountryId { get; set; }
        public string Name { get; set; }
        public string NameEn { get; set; }
    }
}
