using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.DTOs;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GeographicsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<GeographicsController> _logger;

        public GeographicsController(ApplicationDbContext context, ILogger<GeographicsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        #region Countries

        /// <summary>
        /// الحصول على قائمة الدول
        /// </summary>
        [HttpGet("countries")]
        public async Task<ActionResult<List<CountrySelectDto>>> GetCountries(
            [FromQuery] bool activeOnly = true)
        {
            try
            {
                var query = _context.Countries.AsQueryable();
                
                if (activeOnly)
                    query = query.Where(c => c.IsActive);
                
                var countries = await query
                    .OrderBy(c => c.Name)
                    .Select(c => new CountrySelectDto
                    {
                        Id = c.Id,
                        Name = c.Name,
                        NameEn = c.NameEn,
                        Code = c.Code
                    })
                    .ToListAsync();

                return Ok(countries);
            }
            catch
            {
                // Return empty list if table doesn't exist (development mode)
                return Ok(new List<CountrySelectDto>());
            }
        }

        /// <summary>
        /// الحصول على دولة محددة
        /// </summary>
        [HttpGet("countries/{id}")]
        public async Task<ActionResult<CountryDto>> GetCountry(int id)
        {
            try
            {
                var country = await _context.Countries
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (country == null)
                    return NotFound();

                return Ok(new CountryDto
                {
                    Id = country.Id,
                    Code = country.Code,
                    Name = country.Name,
                    NameEn = country.NameEn,
                    IsActive = country.IsActive
                });
            }
            catch
            {
                // Return not found if table doesn't exist (development mode)
                return NotFound();
            }
        }

        #endregion

        #region Provinces

        /// <summary>
        /// الحصول على المحافظات بناءً على الدولة
        /// </summary>
        [HttpGet("provinces")]
        public async Task<ActionResult<List<ProvinceSelectDto>>> GetProvinces(
            [FromQuery] int? countryId = null,
            [FromQuery] bool activeOnly = true)
        {
            try
            {
                var query = _context.Provinces.AsQueryable();
                
                if (countryId.HasValue)
                    query = query.Where(p => p.CountryId == countryId);
                
                if (activeOnly)
                    query = query.Where(p => p.IsActive);
                
                var provinces = await query
                    .OrderBy(p => p.Name)
                    .Select(p => new ProvinceSelectDto
                    {
                        Id = p.Id,
                        CountryId = p.CountryId,
                        Name = p.Name,
                        NameEn = p.NameEn
                    })
                    .ToListAsync();

                return Ok(provinces);
            }
            catch
            {
                // Return empty list if table doesn't exist (development mode)
                return Ok(new List<ProvinceSelectDto>());
            }
        }

        /// <summary>
        /// الحصول على محافظة محددة
        /// </summary>
        [HttpGet("provinces/{id}")]
        public async Task<ActionResult<ProvinceDto>> GetProvince(int id)
        {
            try
            {
                var province = await _context.Provinces
                    .Include(p => p.Country)
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (province == null)
                    return NotFound();

                return Ok(new ProvinceDto
                {
                    Id = province.Id,
                    CountryId = province.CountryId,
                    Code = province.Code,
                    Name = province.Name,
                    NameEn = province.NameEn,
                    IsActive = province.IsActive,
                    Country = new CountryDto
                    {
                        Id = province.Country.Id,
                        Code = province.Country.Code,
                        Name = province.Country.Name,
                        NameEn = province.Country.NameEn
                    }
                });
            }
            catch
            {
                // Return not found if table doesn't exist (development mode)
                return NotFound();
            }
        }

        #endregion

        #region Cities

        /// <summary>
        /// الحصول على المدن بناءً على المحافظة أو الدولة
        /// </summary>
        [HttpGet("cities")]
        public async Task<ActionResult<List<CitySelectDto>>> GetCities(
            [FromQuery] int? provinceId = null,
            [FromQuery] int? countryId = null,
            [FromQuery] bool activeOnly = true)
        {
            try
            {
                var query = _context.Cities.AsQueryable();
                
                if (provinceId.HasValue)
                    query = query.Where(c => c.ProvinceId == provinceId);
                
                if (countryId.HasValue)
                    query = query.Where(c => c.CountryId == countryId);
                
                if (activeOnly)
                    query = query.Where(c => c.IsActive);
                
                var cities = await query
                    .OrderBy(c => c.Name)
                    .Select(c => new CitySelectDto
                    {
                        Id = c.Id,
                        ProvinceId = c.ProvinceId,
                        CountryId = c.CountryId,
                        Name = c.Name,
                        NameEn = c.NameEn
                    })
                    .ToListAsync();

                return Ok(cities);
            }
            catch
            {
                // Return empty list if table doesn't exist (development mode)
                return Ok(new List<CitySelectDto>());
            }
        }

        /// <summary>
        /// الحصول على مدينة محددة
        /// </summary>
        [HttpGet("cities/{id}")]
        public async Task<ActionResult<CityDto>> GetCity(int id)
        {
            try
            {
                var city = await _context.Cities
                    .Include(c => c.Province)
                    .ThenInclude(p => p.Country)
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (city == null)
                    return NotFound();

                return Ok(new CityDto
                {
                    Id = city.Id,
                    ProvinceId = city.ProvinceId,
                    CountryId = city.CountryId,
                    Code = city.Code,
                    Name = city.Name,
                    NameEn = city.NameEn,
                    IsActive = city.IsActive,
                    Province = new ProvinceDto
                    {
                        Id = city.Province.Id,
                        CountryId = city.Province.CountryId,
                        Code = city.Province.Code,
                        Name = city.Province.Name,
                        NameEn = city.Province.NameEn,
                        IsActive = city.Province.IsActive,
                        Country = new CountryDto
                        {
                            Id = city.Province.Country.Id,
                            Code = city.Province.Country.Code,
                            Name = city.Province.Country.Name,
                            NameEn = city.Province.Country.NameEn
                        }
                    }
                });
            }
            catch
            {
                // Return not found if table doesn't exist (development mode)
                return NotFound();
            }
        }

        #endregion

        #region Complete Geographic Hierarchy

        /// <summary>
        /// الحصول على الهرم الكامل للبيانات الجغرافية لدولة محددة
        /// </summary>
        [HttpGet("hierarchy/{countryId}")]
        public async Task<ActionResult> GetGeographicHierarchy(int countryId)
        {
            try
            {
                var country = await _context.Countries
                    .Include(c => c.Provinces)
                    .ThenInclude(p => p.Cities)
                    .FirstOrDefaultAsync(c => c.Id == countryId);

                if (country == null)
                    return NotFound(new { message = "الدولة غير موجودة" });

                var result = new
                {
                    country = new CountryDto
                    {
                        Id = country.Id,
                        Code = country.Code,
                        Name = country.Name,
                        NameEn = country.NameEn,
                        IsActive = country.IsActive
                    },
                    provinces = country.Provinces
                        .Where(p => p.IsActive)
                        .Select(p => new
                        {
                            id = p.Id,
                            name = p.Name,
                            nameEn = p.NameEn,
                            cities = p.Cities
                                .Where(c => c.IsActive)
                                .Select(c => new { id = c.Id, name = c.Name, nameEn = c.NameEn })
                                .ToList()
                        })
                        .ToList()
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "خطأ في الحصول على الهرم الجغرافي");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        #endregion

        #region Search

        /// <summary>
        /// البحث عن عملاء حسب البيانات الجغرافية
        /// </summary>
        [HttpGet("customers-by-location")]
        public async Task<ActionResult<List<object>>> GetCustomersByLocation(
            [FromQuery] int? countryId = null,
            [FromQuery] int? provinceId = null,
            [FromQuery] int? cityId = null,
            [FromQuery] int? accountId = null)
        {
            try
            {
                var query = _context.Customers.AsQueryable();
                
                if (accountId.HasValue)
                    query = query.Where(c => c.AccountId == accountId);
                
                if (countryId.HasValue)
                    query = query.Where(c => c.CountryId == countryId);
                
                if (provinceId.HasValue)
                    query = query.Where(c => c.ProvinceId == provinceId);
                
                if (cityId.HasValue)
                    query = query.Where(c => c.CityId == cityId);
                
                var customers = await query
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.Code,
                        country = c.Country != null ? c.Country.Name : null,
                        province = c.Province != null ? c.Province.Name : null,
                        city = c.City != null ? c.City.Name : null
                    })
                    .ToListAsync();

                return Ok(customers);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "خطأ في البحث عن العملاء حسب الموقع");
                return StatusCode(500, new { message = "حدث خطأ" });
            }
        }

        #endregion
    }
}
