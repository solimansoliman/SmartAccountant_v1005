using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartAccountant.API.Data;
using SmartAccountant.API.Models;
using System.Security.Claims;
using System.Text.Json;

namespace SmartAccountant.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GdprController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GdprController> _logger;

    public GdprController(ApplicationDbContext context, ILogger<GdprController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private int GetAccountId()
    {
        var accountId = User.FindFirst("accountId")?.Value;
        if (string.IsNullOrEmpty(accountId) || !int.TryParse(accountId, out var id))
            throw new UnauthorizedAccessException("Account ID not found");
        return id;
    }

    private string GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
        ?? throw new UnauthorizedAccessException("User ID not found");

    private int GetUserIntId()
    {
        var userId = GetUserId();
        if (int.TryParse(userId, out var id))
            return id;
        throw new UnauthorizedAccessException("Invalid User ID format");
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportAccountData()
    {
        try
        {
            var accountId = GetAccountId();
            var userId = GetUserIntId();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.AccountId == accountId);
            if (user == null || !user.IsSuperAdmin)
                return Forbid("Only admins can export");

            _logger.LogInformation($"Export by {user.Username}");

            var data = new
            {
                ExportDate = DateTime.UtcNow,
                Users = await _context.Users.Where(u => u.AccountId == accountId).ToListAsync(),
                Customers = await _context.Customers.Where(c => c.AccountId == accountId).ToListAsync(),
                Invoices = await _context.Invoices.Where(i => i.AccountId == accountId).ToListAsync(),
                Products = await _context.Products.Where(p => p.AccountId == accountId).ToListAsync()
            };

            var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
            return File(System.Text.Encoding.UTF8.GetBytes(json), "application/json", $"export-{accountId}.json");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Export failed: {ex.Message}");
            return StatusCode(500, "Export failed");
        }
    }

    [HttpGet("my-data")]
    public async Task<IActionResult> GetMyPersonalData()
    {
        try
        {
            var userId = GetUserIntId();
            var accountId = GetAccountId();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.AccountId == accountId);
            if (user == null)
                return Unauthorized("User not found");

            return Ok(new
            {
                user.Id,
                user.Username,
                user.Email,
                user.FullName,
                user.IsActive
            });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed: {ex.Message}");
            return StatusCode(500, "Failed");
        }
    }

    [HttpPut("my-data")]
    public async Task<IActionResult> UpdateMyData([FromBody] UpdatePersonalDataRequest request)
    {
        try
        {
            var userId = GetUserIntId();
            var accountId = GetAccountId();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.AccountId == accountId);
            if (user == null)
                return Unauthorized();

            if (!string.IsNullOrEmpty(request.FullName))
                user.FullName = request.FullName;

            if (!string.IsNullOrEmpty(request.Phone))
                user.Phone = request.Phone;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Updated" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Update failed: {ex.Message}");
            return StatusCode(500, "Failed");
        }
    }

    [HttpPost("request-deletion")]
    public async Task<IActionResult> RequestAccountDeletion()
    {
        try
        {
            var accountId = GetAccountId();
            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Id == accountId);
            if (account == null)
                return NotFound();

            account.ScheduledDeletionDate = DateTime.UtcNow.AddDays(30);
            _context.Accounts.Update(account);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Scheduled", deletesAt = account.ScheduledDeletionDate });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed: {ex.Message}");
            return StatusCode(500, "Failed");
        }
    }

    [HttpDelete("cancel-deletion")]
    public async Task<IActionResult> CancelDeletion()
    {
        try
        {
            var accountId = GetAccountId();
            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Id == accountId);
            if (account == null)
                return NotFound();

            account.ScheduledDeletionDate = null;
            _context.Accounts.Update(account);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Cancelled" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Failed: {ex.Message}");
            return StatusCode(500, "Failed");
        }
    }

    [HttpDelete("delete-account")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
    {
        try
        {
            var accountId = GetAccountId();
            var userId = GetUserIntId();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.AccountId == accountId);
            if (user == null || !user.IsSuperAdmin)
                return Forbid();

            if (request.ConfirmationCode != "DELETE_PERMANENTLY")
                return BadRequest();

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var invoices = await _context.Invoices.Where(i => i.AccountId == accountId).ToListAsync();
                _context.Invoices.RemoveRange(invoices);

                var customers = await _context.Customers.Where(c => c.AccountId == accountId).ToListAsync();
                _context.Customers.RemoveRange(customers);

                var products = await _context.Products.Where(p => p.AccountId == accountId).ToListAsync();
                _context.Products.RemoveRange(products);

                var users = await _context.Users.Where(u => u.AccountId == accountId).ToListAsync();
                _context.Users.RemoveRange(users);

                var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Id == accountId);
                if (account != null)
                    _context.Accounts.Remove(account);

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                return Ok(new { message = "Deleted", deletedAt = DateTime.UtcNow });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Delete failed: {ex.Message}");
            return StatusCode(500, "Failed");
        }
    }
}

public class DeleteAccountRequest
{
    public string ConfirmationCode { get; set; } = "";
}

public class UpdatePersonalDataRequest
{
    public string? FullName { get; set; }
    public string? Phone { get; set; }
}
