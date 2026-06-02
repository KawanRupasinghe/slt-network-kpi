using backend.Data;
using backend.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ? Add JSON options to ignore cycles (Form7Kpi -> Nodes -> Kpi -> Nodes...)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// Auth Services
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "KPI_Backend",
            ValidAudience = builder.Configuration["JwtSettings:Audience"] ?? "KPI_Frontend",
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:Secret"] ?? "SuperSecretKeyForDevelopmentOnly12345!@#$%"))
        };
    });

builder.Services.AddScoped<Microsoft.AspNetCore.Authentication.IClaimsTransformation, backend.Helpers.ClaimsTransformation>();
builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
builder.Services.AddScoped<backend.Helpers.IDateHelper, backend.Helpers.DateHelper>();

// Authorization Handlers
builder.Services.AddScoped<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, backend.Helpers.Authorization.PageAccessHandler>();
builder.Services.AddScoped<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, backend.Helpers.Authorization.PlatformKpiEditHandler>();

// Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("SuperAdminOnly", policy => policy.RequireClaim("role", "SuperAdmin"));
    options.AddPolicy("AdminOnly", policy => policy.RequireClaim("role", "Admin", "SuperAdmin"));
    options.AddPolicy("PlatformAdminOnly", policy => policy.RequireClaim("role", "PlatformAdmin", "SuperAdmin"));

    options.AddPolicy("ViewPagePolicy", policy =>
        policy.AddRequirements(new backend.Helpers.Authorization.PageAccessRequirement()));

    options.AddPolicy("EditPlatformKpiPolicy", policy =>
        policy.AddRequirements(new backend.Helpers.Authorization.PlatformKpiEditRequirement()));
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Register MultiTable Service for SOAP UI data fetching
builder.Services.AddHttpClient<IMultiTableService, MultiTableService>();
builder.Services.AddScoped<backend.Services.IKpiDefinitionService, backend.Services.KpiDefinitionService>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAngular");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Auto-migration and cleanup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();

        var roleNames = new[] { "SuperAdmin", "Admin", "PlatformAdmin", "User" };
        var existingRoles = context.Roles.Select(r => r.RoleName).ToList();
        var missingRoles = roleNames.Except(existingRoles).ToList();
        if (missingRoles.Any())
        {
            foreach (var roleName in missingRoles)
            {
                context.Roles.Add(new backend.Models.Role { RoleName = roleName });
            }
            context.SaveChanges();
        }

        var pageSeeds = new[]
        {
            new backend.Models.Page { PageId = 1, PageCode = "IP_NW_OP", PageName = "IP NW OP" },
            new backend.Models.Page { PageId = 2, PageCode = "SERVICE_FULFILMENT", PageName = "SERVICE FULFILMENT" },
            new backend.Models.Page { PageId = 3, PageCode = "BB_ANW", PageName = "BB ANW" },
            new backend.Models.Page { PageId = 4, PageCode = "OTN_OP", PageName = "OTN OP" },
            new backend.Models.Page { PageId = 5, PageCode = "TM_ACTIVITY", PageName = "Other Operator" },
            new backend.Models.Page { PageId = 6, PageCode = "ROUTINE_MTNC", PageName = "ROUTINE MTNC" },
            new backend.Models.Page { PageId = 7, PageCode = "TOWER_MTCE", PageName = "TOWER MTCE ACHIEVEMENT" },
            new backend.Models.Page { PageId = 8, PageCode = "ENTERPRISE_KPI", PageName = "Enterprise KPI" },
            new backend.Models.Page { PageId = 9, PageCode = "OTHER_OPERATOR_KPI", PageName = "Other Operator KPI" },
            new backend.Models.Page { PageId = 10, PageCode = "OTHER_KPI", PageName = "Other KPI" }
        };

        var existingPageIds = context.Pages.Select(p => p.PageId).ToList();
        var missingPages = pageSeeds.Where(p => !existingPageIds.Contains(p.PageId)).ToList();
        if (missingPages.Any())
        {
            try
            {
                // Ensure we use the same physical connection for SET IDENTITY_INSERT and the insert.
                await context.Database.OpenConnectionAsync();
                try
                {
                    await context.Database.ExecuteSqlRawAsync("SET IDENTITY_INSERT dbo.Page ON;");
                    context.Pages.AddRange(missingPages);
                    context.SaveChanges();
                    await context.Database.ExecuteSqlRawAsync("SET IDENTITY_INSERT dbo.Page OFF;");
                }
                finally
                {
                    await context.Database.CloseConnectionAsync();
                }
            }
            catch (Exception ex)
            {
                // If enabling IDENTITY_INSERT fails (e.g., PageId is not an identity column), fall back to normal insert.
                try
                {
                    context.Pages.AddRange(missingPages);
                    context.SaveChanges();
                }
                catch (Exception innerEx)
                {
                    Console.WriteLine($"Failed inserting pages: {innerEx.Message}");
                    throw;
                }
            }
        }

        // Fix: Ensure Admin has correct Role (SuperAdmin = 1) and Password hash if missing
        var adminUser = context.Users.FirstOrDefault(u => u.ServiceId == "admin");
        if (adminUser != null)
        {
            if (adminUser.RoleId != 1) // 1 = SuperAdmin
            {
                adminUser.RoleId = 1;
                context.SaveChanges();
                Console.WriteLine("Admin user role updated to SuperAdmin.");
            }
        }

        var platformAdminRole = context.Roles.FirstOrDefault(r => r.RoleName == "PlatformAdmin");
        if (platformAdminRole != null)
        {
            const string defaultPlatformAdminServiceId = "30001";
            var platformAdmin = context.Users.FirstOrDefault(u => u.ServiceId == defaultPlatformAdminServiceId);
            if (platformAdmin == null)
            {
                context.Users.Add(new backend.Models.User
                {
                    ServiceId = defaultPlatformAdminServiceId,
                    Name = "Platform Admin",
                    RoleId = platformAdminRole.RoleId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    Email = $"{defaultPlatformAdminServiceId}@internal.slt"
                });
                context.SaveChanges();
                Console.WriteLine("Default PlatformAdmin user created.");
            }
            else
            {
                if (!platformAdmin.IsActive || platformAdmin.RoleId != platformAdminRole.RoleId)
                {
                    platformAdmin.IsActive = true;
                    platformAdmin.RoleId = platformAdminRole.RoleId;
                    platformAdmin.UpdatedAt = DateTime.UtcNow;
                    context.SaveChanges();
                    Console.WriteLine("PlatformAdmin user updated.");
                }
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"An error occurred during migration/seeding: {ex.Message}");
    }
}

app.Run();
