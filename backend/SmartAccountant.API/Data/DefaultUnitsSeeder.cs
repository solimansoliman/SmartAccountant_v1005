using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Models;

namespace SmartAccountant.API.Data
{
    public static class DefaultUnitsSeeder
    {
        private sealed record UnitTemplate(
            string Name,
            string NameEn,
            string Symbol,
            bool IsBase,
            string? BaseUnitName,
            decimal ConversionFactor
        );

        private static readonly IReadOnlyList<UnitTemplate> Templates = new List<UnitTemplate>
        {
            new("قطعة", "Piece", "PCS", true, null, 1m),
            new("كيلوجرام", "Kilogram", "KG", true, null, 1m),
            new("لتر", "Liter", "L", true, null, 1m),
            new("متر", "Meter", "M", true, null, 1m),
            new("علبة", "Box", "BOX", false, "قطعة", 1m),
            new("كرتون", "Carton", "CTN", false, "قطعة", 12m),
        };

        public static async Task EnsureForAccountAsync(
            ApplicationDbContext context,
            int accountId,
            int? createdByUserId,
            CancellationToken cancellationToken = default)
        {
            var units = await context.Units
                .Where(u => u.AccountId == accountId)
                .ToListAsync(cancellationToken);

            bool changed = false;

            foreach (var template in Templates.Where(t => t.IsBase))
            {
                var existing = FindByName(units, template.Name);
                if (existing == null)
                {
                    units.Add(new Unit
                    {
                        AccountId = accountId,
                        Name = template.Name,
                        NameEn = template.NameEn,
                        Symbol = template.Symbol,
                        IsBase = true,
                        BaseUnitId = null,
                        ConversionFactor = 1m,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        CreatedByUserId = createdByUserId,
                    });
                    changed = true;
                    continue;
                }

                if (!existing.IsActive)
                {
                    existing.IsActive = true;
                    existing.UpdatedAt = DateTime.UtcNow;
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(existing.Symbol))
                {
                    existing.Symbol = template.Symbol;
                    existing.UpdatedAt = DateTime.UtcNow;
                    changed = true;
                }
            }

            if (changed)
            {
                await context.SaveChangesAsync(cancellationToken);
                units = await context.Units
                    .Where(u => u.AccountId == accountId)
                    .ToListAsync(cancellationToken);
                changed = false;
            }

            foreach (var template in Templates.Where(t => !t.IsBase))
            {
                var existing = FindByName(units, template.Name);
                var baseUnit = FindByName(units, template.BaseUnitName ?? string.Empty);
                if (baseUnit == null)
                {
                    continue;
                }

                if (existing == null)
                {
                    units.Add(new Unit
                    {
                        AccountId = accountId,
                        Name = template.Name,
                        NameEn = template.NameEn,
                        Symbol = template.Symbol,
                        IsBase = false,
                        BaseUnitId = baseUnit.Id,
                        ConversionFactor = template.ConversionFactor,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        CreatedByUserId = createdByUserId,
                    });
                    changed = true;
                    continue;
                }

                if (!existing.IsActive)
                {
                    existing.IsActive = true;
                    existing.UpdatedAt = DateTime.UtcNow;
                    changed = true;
                }

                if (!existing.BaseUnitId.HasValue)
                {
                    existing.BaseUnitId = baseUnit.Id;
                    existing.UpdatedAt = DateTime.UtcNow;
                    changed = true;
                }

                if (existing.ConversionFactor <= 0)
                {
                    existing.ConversionFactor = template.ConversionFactor;
                    existing.UpdatedAt = DateTime.UtcNow;
                    changed = true;
                }
            }

            if (changed)
            {
                await context.SaveChangesAsync(cancellationToken);
            }
        }

        public static async Task EnsureForAllAccountsAsync(
            ApplicationDbContext context,
            CancellationToken cancellationToken = default)
        {
            var accountIds = await context.Accounts
                .Select(a => a.Id)
                .ToListAsync(cancellationToken);

            foreach (var accountId in accountIds)
            {
                var userId = await context.Users
                    .Where(u => u.AccountId == accountId && u.IsActive)
                    .OrderByDescending(u => u.IsSuperAdmin)
                    .ThenBy(u => u.RoleType)
                    .ThenBy(u => u.Id)
                    .Select(u => (int?)u.Id)
                    .FirstOrDefaultAsync(cancellationToken);

                await EnsureForAccountAsync(context, accountId, userId, cancellationToken);
            }
        }

        private static Unit? FindByName(IEnumerable<Unit> units, string name)
        {
            return units.FirstOrDefault(u =>
                !string.IsNullOrWhiteSpace(u.Name) &&
                string.Equals(u.Name.Trim(), name.Trim(), StringComparison.OrdinalIgnoreCase));
        }
    }
}
