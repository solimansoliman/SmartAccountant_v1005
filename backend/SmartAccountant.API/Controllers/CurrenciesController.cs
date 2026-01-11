using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CurrenciesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CurrenciesController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// الحصول على جميع العملات المتاحة
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Currency>>> GetCurrencies()
        {
            return await _context.Currencies
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        /// <summary>
        /// الحصول على العملات العربية فقط
        /// </summary>
        [HttpGet("arabic")]
        public async Task<ActionResult<IEnumerable<Currency>>> GetArabicCurrencies()
        {
            var arabicCodes = new[] { "SAR", "EGP", "AED", "KWD", "QAR", "BHD", "OMR", "JOD", "IQD", "LBP", "SYP", "SDG", "MAD", "TND", "DZD", "LYD" };
            
            return await _context.Currencies
                .Where(c => c.IsActive && arabicCodes.Contains(c.Code))
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        /// <summary>
        /// الحصول على عملة بالمعرف
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Currency>> GetCurrency(int id)
        {
            var currency = await _context.Currencies.FindAsync(id);
            if (currency == null)
            {
                return NotFound();
            }
            return currency;
        }

        /// <summary>
        /// الحصول على عملة بالكود
        /// </summary>
        [HttpGet("code/{code}")]
        public async Task<ActionResult<Currency>> GetCurrencyByCode(string code)
        {
            var currency = await _context.Currencies
                .FirstOrDefaultAsync(c => c.Code == code.ToUpper());
            if (currency == null)
            {
                return NotFound();
            }
            return currency;
        }

        /// <summary>
        /// تحديث سعر الصرف
        /// </summary>
        [HttpPut("{id}/exchange-rate")]
        public async Task<IActionResult> UpdateExchangeRate(int id, [FromBody] decimal exchangeRate)
        {
            var currency = await _context.Currencies.FindAsync(id);
            if (currency == null)
            {
                return NotFound();
            }

            currency.ExchangeRate = exchangeRate;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// تحويل مبلغ من عملة لأخرى
        /// </summary>
        [HttpGet("convert")]
        public async Task<ActionResult<object>> ConvertCurrency(
            [FromQuery] decimal amount,
            [FromQuery] string fromCode,
            [FromQuery] string toCode)
        {
            var fromCurrency = await _context.Currencies.FirstOrDefaultAsync(c => c.Code == fromCode.ToUpper());
            var toCurrency = await _context.Currencies.FirstOrDefaultAsync(c => c.Code == toCode.ToUpper());

            if (fromCurrency == null || toCurrency == null)
            {
                return NotFound("إحدى العملات غير موجودة");
            }

            // تحويل للعملة الأساسية ثم للعملة المطلوبة
            var baseAmount = amount * fromCurrency.ExchangeRate;
            var convertedAmount = baseAmount / toCurrency.ExchangeRate;

            return new
            {
                OriginalAmount = amount,
                OriginalCurrency = fromCode,
                ConvertedAmount = Math.Round(convertedAmount, toCurrency.DecimalPlaces),
                TargetCurrency = toCode,
                ExchangeRate = fromCurrency.ExchangeRate / toCurrency.ExchangeRate
            };
        }
    }
}
