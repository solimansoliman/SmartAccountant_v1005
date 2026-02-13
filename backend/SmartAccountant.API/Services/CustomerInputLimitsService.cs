using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;

namespace SmartAccountant.API.Services
{
    public sealed class CustomerInputLimits
    {
        public int CustomerNameMaxLength { get; init; }
        public int CustomerAddressMaxLength { get; init; }
        public int CustomerNotesMaxLength { get; init; }
        public int CustomerPhoneMaxLength { get; init; }
        public int CustomerEmailMaxLength { get; init; }
        public int ProductNameMaxLength { get; init; }
        public int ProductNotesMaxLength { get; init; }
        public int InvoiceNotesMaxLength { get; init; }
    }

    public interface ICustomerInputLimitsService
    {
        Task<CustomerInputLimits> GetLimitsAsync(int accountId, CancellationToken cancellationToken = default);
    }

    public class CustomerInputLimitsService : ICustomerInputLimitsService
    {
        private readonly ApplicationDbContext _context;

        private sealed record LimitSpec(string Key, int FallbackValue, int MinValue, int MaxValue);

        public CustomerInputLimitsService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<CustomerInputLimits> GetLimitsAsync(int accountId, CancellationToken cancellationToken = default)
        {
            var specs = new[]
            {
                new LimitSpec("customerNameMaxLength", 120, 20, 200),
                new LimitSpec("customerAddressMaxLength", 220, 40, 400),
                new LimitSpec("customerNotesMaxLength", 300, 50, 1000),
                new LimitSpec("customerPhoneMaxLength", 20, 8, 30),
                new LimitSpec("customerEmailMaxLength", 120, 30, 200),
                new LimitSpec("productNameMaxLength", 120, 20, 200),
                new LimitSpec("productNotesMaxLength", 300, 20, 500),
                new LimitSpec("invoiceNotesMaxLength", 300, 20, 1000)
            };

            var keys = specs.Select(spec => spec.Key).ToArray();

            var settings = await _context.SystemSettings
                .Where(s => keys.Contains(s.SettingKey) && (s.AccountId == accountId || s.AccountId == null))
                .OrderByDescending(s => s.AccountId.HasValue)
                .ThenByDescending(s => s.UpdatedAt)
                .ToListAsync(cancellationToken);

            var effectiveSettings = settings
                .GroupBy(s => s.SettingKey)
                .ToDictionary(g => g.Key, g => g.First());

            var normalizedValues = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var hasUpdates = false;

            foreach (var spec in specs)
            {
                if (!effectiveSettings.TryGetValue(spec.Key, out var setting))
                {
                    normalizedValues[spec.Key] = spec.FallbackValue;
                    continue;
                }

                var normalizedValue = ResolveLimit(setting.SettingValue, spec.FallbackValue, spec.MinValue, spec.MaxValue);
                normalizedValues[spec.Key] = normalizedValue;

                if (!string.Equals(setting.SettingValue, normalizedValue.ToString(), StringComparison.Ordinal))
                {
                    setting.SettingValue = normalizedValue.ToString();
                    setting.UpdatedAt = DateTime.UtcNow;
                    hasUpdates = true;
                }
            }

            if (hasUpdates)
            {
                await _context.SaveChangesAsync(cancellationToken);
            }

            return new CustomerInputLimits
            {
                CustomerNameMaxLength = normalizedValues["customerNameMaxLength"],
                CustomerAddressMaxLength = normalizedValues["customerAddressMaxLength"],
                CustomerNotesMaxLength = normalizedValues["customerNotesMaxLength"],
                CustomerPhoneMaxLength = normalizedValues["customerPhoneMaxLength"],
                CustomerEmailMaxLength = normalizedValues["customerEmailMaxLength"],
                ProductNameMaxLength = normalizedValues["productNameMaxLength"],
                ProductNotesMaxLength = normalizedValues["productNotesMaxLength"],
                InvoiceNotesMaxLength = normalizedValues["invoiceNotesMaxLength"]
            };
        }

        private static int ResolveLimit(string? rawValue, int fallbackValue, int minValue, int maxValue)
        {
            if (string.IsNullOrWhiteSpace(rawValue))
            {
                return fallbackValue;
            }

            if (!int.TryParse(rawValue, out var parsedValue))
            {
                return fallbackValue;
            }

            if (parsedValue < minValue)
            {
                return minValue;
            }

            if (parsedValue > maxValue)
            {
                return maxValue;
            }

            return parsedValue;
        }
    }
}
