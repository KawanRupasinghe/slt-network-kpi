/*
 * File: UsersController.cs
 * Provides API endpoints for managing users, roles, page access,
 * and platform KPI assignments within the system.
 */

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using System.Linq;

namespace backend.Controllers
{
    // =========================================================
    // USERS CONTROLLER
    // Handles user management including roles, page access,
    // status updates, and platform KPI assignments
    // =========================================================
    [ApiController]
    [Route("api/users")]
    [Authorize(Policy = "AdminOnly")]
    public class UsersController : ControllerBase
    {
        // Database context
        private readonly AppDbContext _db;
        private static readonly HashSet<int> AssignablePageIds = new() { 1, 2, 3, 4, 6, 7, 8, 9, 10 };
        private static readonly byte[] AssignablePageIdBytes = AssignablePageIds.Select(pageId => (byte)pageId).ToArray();

        // Inject database context
        public UsersController(AppDbContext db)
        {
            _db = db;
        }

        // =========================================================
        // GET ALL USERS
        // =========================================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers()
        {
            try
            {
                // Load users with their roles
                var users = await _db.Users
                    .Include(u => u.Role)
                    .ToListAsync();

                // Load all page access entries to map pages per user
                var allAccess = await _db.UserPageAccess
                    .Include(upa => upa.Page)
                    .ToListAsync();

                // Map database entities to DTO objects
                var result = users.Select(u =>
                {
                    var userAccess = allAccess
                        .Where(a => a.UserId == u.UserId)
                        .Where(a => AssignablePageIds.Contains(a.PageId))
                        .ToList();

                    return new UserDto
                    {
                        UserId = u.UserId,
                        ServiceId = u.ServiceId,
                        Name = u.Name,
                        Role = u.Role?.RoleName ?? "",
                        IsActive = u.IsActive,
                        LastLogin = u.LastLogin,
                        CreatedAt = u.CreatedAt,
                        UpdatedAt = u.UpdatedAt,
                        Pages = userAccess
                            .Select(a => a.Page?.PageName ?? "")
                            .Where(pageName => !string.IsNullOrWhiteSpace(pageName))
                            .ToList(),
                        PageIds = userAccess
                            .Select(a => (int)a.PageId)
                            .Distinct()
                            .ToList()
                    };
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        // =========================================================
        // GET USER BY ID
        // =========================================================
        [HttpGet("{id}")]
        public async Task<ActionResult<UserDto>> GetUser(int id)
        {
            try
            {
                // Retrieve user with role information
                var user = await _db.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(x => x.UserId == id);

                if (user == null) return NotFound();

                // Retrieve page access for the user
                var pageAccess = await _db.UserPageAccess
                    .Include(upa => upa.Page)
                    .Where(upa => upa.UserId == id)
                    .Where(upa => AssignablePageIdBytes.Contains(upa.PageId))
                    .ToListAsync();

                return new UserDto
                {
                    UserId = user.UserId,
                    ServiceId = user.ServiceId,
                    Name = user.Name,
                    Role = user.Role?.RoleName ?? "",
                    IsActive = user.IsActive,
                    LastLogin = user.LastLogin,
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = user.UpdatedAt,
                    Pages = pageAccess
                        .Select(upa => upa.Page?.PageName ?? "")
                        .Where(pageName => !string.IsNullOrWhiteSpace(pageName))
                        .ToList(),
                    PageIds = pageAccess
                        .Select(upa => (int)upa.PageId)
                        .Distinct()
                        .ToList()
                };
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        // =========================================================
        // CREATE USER
        // =========================================================
        [HttpPost]
        public async Task<ActionResult<UserDto>> CreateUser(CreateUserDto dto)
        {
            try
            {
                // Locate role from database
                var role = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == dto.Role);
                if (role == null)
                {
                    return BadRequest(new { message = $"Role '{dto.Role}' not found." });
                }

                // Create new user entity
                var user = new User
                {
                    ServiceId = dto.ServiceId,
                    Name = dto.Name,
                    RoleId = role.RoleId,
                    IsActive = dto.IsActive,
                    CreatedAt = DateTime.UtcNow,

                    // Generate internal email to satisfy unique constraint
                    Email = $"{dto.ServiceId}@internal.slt"
                };

                _db.Users.Add(user);
                await _db.SaveChangesAsync();

                var pageIds = await ResolvePageIdsAsync(dto.PageIds, dto.Pages);

                // Assign page access permissions if provided
                foreach (var pageId in pageIds)
                {
                    _db.UserPageAccess.Add(new UserPageAccess
                    {
                        UserId = user.UserId,
                        PageId = pageId
                    });
                }

                // Synchronize platform KPI assignments for PlatformAdmin users
                await SyncPlatformAssignments(user.UserId, role.RoleName, pageIds);

                await _db.SaveChangesAsync();

                var pageNames = await GetPageNamesAsync(pageIds);

                return CreatedAtAction(nameof(GetUser), new { id = user.UserId }, new UserDto
                {
                    UserId = user.UserId,
                    ServiceId = user.ServiceId,
                    Name = user.Name,
                    Role = role.RoleName,
                    IsActive = user.IsActive,
                    Pages = pageNames,
                    PageIds = pageIds.Select(pageId => (int)pageId).ToList(),
                    CreatedAt = user.CreatedAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error creating user: {ex.Message}" });
            }
        }

        // =========================================================
        // UPDATE USER
        // =========================================================
        [HttpPut("{id}")]
        public async Task<ActionResult> UpdateUser(int id, UpdateUserDto dto)
        {
            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(x => x.UserId == id);
                if (user == null) return NotFound();

                // Update user basic information
                if (!string.IsNullOrEmpty(dto.ServiceId)) user.ServiceId = dto.ServiceId;
                if (!string.IsNullOrEmpty(dto.Name)) user.Name = dto.Name;
                if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;

                // Update role if provided
                if (!string.IsNullOrEmpty(dto.Role))
                {
                    var role = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == dto.Role);
                    if (role != null)
                    {
                        user.RoleId = role.RoleId;
                    }
                }

                user.UpdatedAt = DateTime.UtcNow;

                var pageAccessProvided = dto.PageIds != null || dto.Pages != null;
                List<byte>? pageIdsForAssignments = null;

                // Update page access if provided
                if (pageAccessProvided)
                {
                    pageIdsForAssignments = await ResolvePageIdsAsync(dto.PageIds, dto.Pages);

                    var existing = _db.UserPageAccess.Where(x => x.UserId == id);
                    _db.UserPageAccess.RemoveRange(existing);

                    foreach (var pageId in pageIdsForAssignments)
                    {
                        _db.UserPageAccess.Add(new UserPageAccess
                        {
                            UserId = user.UserId,
                            PageId = pageId
                        });
                    }
                }

                // Determine final role for assignment logic
                var finalRoleName = (await _db.Roles
                    .Where(r => r.RoleId == user.RoleId)
                    .Select(r => r.RoleName)
                    .FirstOrDefaultAsync()) ?? string.Empty;

                if (pageIdsForAssignments == null &&
                    string.Equals(finalRoleName, "PlatformAdmin", StringComparison.OrdinalIgnoreCase))
                {
                    pageIdsForAssignments = await _db.UserPageAccess
                        .Where(x => x.UserId == id)
                        .Where(x => AssignablePageIdBytes.Contains(x.PageId))
                        .Select(x => x.PageId)
                        .ToListAsync();
                }

                // Synchronize platform assignments
                await SyncPlatformAssignments(user.UserId, finalRoleName, pageIdsForAssignments);

                await _db.SaveChangesAsync();

                return Ok(new { message = "User updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error updating user: {ex.Message}");
            }
        }

        // =========================================================
        // DELETE USER
        // =========================================================
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteUser(int id)
        {
            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(x => x.UserId == id);
                if (user == null) return NotFound();

                _db.Users.Remove(user);
                await _db.SaveChangesAsync();

                return Ok(new { message = "User deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error deleting user: {ex.Message}");
            }
        }

        // =========================================================
        // GET ADMIN USERS ONLY
        // =========================================================
        [HttpGet("admins")]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetAdmins()
        {
            try
            {
                var users = await _db.Users
                    .Include(u => u.Role)
                    .Where(u => u.Role != null && (u.Role.RoleName == "SuperAdmin" || u.Role.RoleName == "Admin"))
                    .ToListAsync();

                var allAccess = await _db.UserPageAccess
                    .Include(upa => upa.Page)
                    .ToListAsync();

                var result = users.Select(u =>
                {
                    var userAccess = allAccess
                        .Where(a => a.UserId == u.UserId)
                        .Where(a => AssignablePageIds.Contains(a.PageId))
                        .ToList();

                    return new UserDto
                    {
                        UserId = u.UserId,
                        ServiceId = u.ServiceId,
                        Name = u.Name,
                        Role = u.Role?.RoleName ?? "",
                        IsActive = u.IsActive,
                        LastLogin = u.LastLogin,
                        CreatedAt = u.CreatedAt,
                        UpdatedAt = u.UpdatedAt,
                        Pages = userAccess
                            .Select(a => a.Page?.PageName ?? "")
                            .Where(pageName => !string.IsNullOrWhiteSpace(pageName))
                            .ToList(),
                        PageIds = userAccess
                            .Select(a => (int)a.PageId)
                            .Distinct()
                            .ToList()
                    };
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error fetching admins: {ex.Message}");
            }
        }

        // =========================================================
        // CREATE ADMIN USER
        // =========================================================
        [HttpPost("admins")]
        public async Task<ActionResult<UserDto>> CreateAdmin(CreateUserDto dto)
        {
            // Normalize role name for admin creation
            if (string.Equals(dto.Role, "admin", StringComparison.OrdinalIgnoreCase))
                dto.Role = "Admin";

            return await CreateUser(dto);
        }

        // =========================================================
        // TOGGLE USER ACTIVE STATUS
        // =========================================================
        [HttpPatch("{id}/status")]
        public async Task<ActionResult> ToggleStatus(int id)
        {
            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(x => x.UserId == id);
                if (user == null) return NotFound();

                // Toggle active state
                user.IsActive = !user.IsActive;
                user.UpdatedAt = DateTime.UtcNow;

                await _db.SaveChangesAsync();

                return Ok(new { message = $"User status changed to {(user.IsActive ? "Active" : "Inactive")}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error updating status: {ex.Message}");
            }
        }

        // =========================================================
        // DEMOTE ADMIN TO STANDARD USER
        // =========================================================
        [HttpPatch("{id}/demote")]
        public async Task<ActionResult> DemoteAdmin(int id)
        {
            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(x => x.UserId == id);
                if (user == null) return NotFound();

                var userRole = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == "User");
                if (userRole == null) return StatusCode(500, "User role not found.");

                user.RoleId = userRole.RoleId;
                user.UpdatedAt = DateTime.UtcNow;

                await _db.SaveChangesAsync();

                return Ok(new { message = "Admin demoted to User successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error demoting admin: {ex.Message}");
            }
        }

        // =========================================================
        // PROMOTE USER TO ADMIN
        // =========================================================
        [HttpPatch("{id}/promote")]
        public async Task<ActionResult> PromoteToAdmin(int id)
        {
            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(x => x.UserId == id);
                if (user == null) return NotFound();

                var adminRole = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == "Admin");
                if (adminRole == null) return StatusCode(500, "Admin role not found.");

                user.RoleId = adminRole.RoleId;
                user.UpdatedAt = DateTime.UtcNow;

                await _db.SaveChangesAsync();

                return Ok(new { message = "User promoted to Admin successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error promoting user: {ex.Message}");
            }
        }

        // =========================================================
        // SYNCHRONIZE PLATFORM KPI ASSIGNMENTS
        // =========================================================
        private Task SyncPlatformAssignments(int userId, string roleName, List<byte>? pageIds)
        {
            // Remove existing assignments
            var existingAssignments = _db.PlatformKpiAssignments.Where(x => x.UserId == userId);
            _db.PlatformKpiAssignments.RemoveRange(existingAssignments);

            // Only PlatformAdmin users receive assignments
            if (string.IsNullOrWhiteSpace(roleName) ||
                !string.Equals(roleName, "PlatformAdmin", StringComparison.OrdinalIgnoreCase))
                return Task.CompletedTask;

            if (pageIds == null || !pageIds.Any())
                return Task.CompletedTask;

            // Assign only one platform page
            var pageId = pageIds.FirstOrDefault(id => AssignablePageIds.Contains(id));
            if (pageId == 0)
                return Task.CompletedTask;

            _db.PlatformKpiAssignments.Add(new PlatformKpiAssignment
            {
                UserId = userId,
                PageId = pageId
            });

            return Task.CompletedTask;
        }

        // =========================================================
        // RESOLVE PAGE IDS FROM NEW IDS OR LEGACY NAMES
        // =========================================================
        private async Task<List<byte>> ResolvePageIdsAsync(List<int>? pageIds, List<string>? pageNames)
        {
            if (pageIds != null)
            {
                return pageIds
                    .Where(AssignablePageIds.Contains)
                    .Distinct()
                    .Select(pageId => (byte)pageId)
                    .ToList();
            }

            if (pageNames == null || !pageNames.Any())
                return new List<byte>();

            var resolvedIds = new List<byte>();

            foreach (var pageName in pageNames)
            {
                var mappedPageId = MapKnownPageId(pageName);
                if (mappedPageId.HasValue && AssignablePageIds.Contains(mappedPageId.Value))
                {
                    resolvedIds.Add((byte)mappedPageId.Value);
                    continue;
                }

                var page = await FindPageByLooseMatch(pageName);
                if (page != null && AssignablePageIds.Contains(page.PageId))
                {
                    resolvedIds.Add(page.PageId);
                }
            }

            return resolvedIds.Distinct().ToList();
        }

        // =========================================================
        // GET PAGE NAMES FOR DTO RESPONSES
        // =========================================================
        private async Task<List<string>> GetPageNamesAsync(List<byte> pageIds)
        {
            if (!pageIds.Any())
                return new List<string>();

            return await _db.Pages
                .Where(page => pageIds.Contains(page.PageId))
                .OrderBy(page => page.PageId)
                .Select(page => page.PageName)
                .ToListAsync();
        }

        // =========================================================
        // NORMALIZE STRING KEY FOR COMPARISON
        // =========================================================
        private static string NormalizeKey(string? value)
        {
            return new string((value ?? string.Empty)
                .ToLowerInvariant()
                .Where(char.IsLetterOrDigit)
                .ToArray());
        }

        // =========================================================
        // MAP KNOWN PAGE NAMES TO PAGE IDs
        // =========================================================
        private static int? MapKnownPageId(string? input)
        {
            var key = NormalizeKey(input);
            if (string.IsNullOrEmpty(key)) return null;

            return key switch
            {
                "ipnwop" => 1,
                "servicefulfilment" => 2,
                "servicefulfillment" => 2,
                "bbanw" => 3,
                "otnop" => 4,
                "otonop" => 4,
                "routinemtnc" => 6,
                "routinemaintenance" => 6,
                "towermtceachievement" => 7,
                "towermtce" => 7,
                "towermaintenance" => 7,
                "towermaintainance" => 7,
                "enterprisekpi" => 8,
                "otheroperatorkpi" => 9,
                "otherkpi" => 10,
                _ => null
            };
        }

        // =========================================================
        // FIND PAGE USING FLEXIBLE NAME MATCHING
        // =========================================================
        private async Task<Page?> FindPageByLooseMatch(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return null;

            var normalized = NormalizeKey(input);
            if (string.IsNullOrEmpty(normalized)) return null;

            var pages = await _db.Pages.ToListAsync();

            return pages.FirstOrDefault(p =>
                NormalizeKey(p.PageName) == normalized ||
                NormalizeKey(p.PageCode) == normalized);
        }
    }
}
