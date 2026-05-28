using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OtherOperatorKpiController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IAuthorizationService _authorizationService;
        private const int PageId = 9;

        public OtherOperatorKpiController(AppDbContext db, IAuthorizationService authorizationService)
        {
            _db = db;
            _authorizationService = authorizationService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OtherKpiDto>>> GetAll()
        {
            var items = await _db.OtherOperatorKpis
                .AsNoTracking()
                .OrderBy(x => x.Id)
                .Select(x => new OtherKpiDto
                {
                    Id = x.Id,
                    NetworkEngineerKpi = x.NetworkEngineerKpi,
                    Division = x.Division,
                    Section = x.Section,
                    KpiPercent = x.KpiPercent
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpGet("metrics")]
        public async Task<ActionResult<IEnumerable<OtherKpiMetricDto>>> GetMetrics(
            [FromQuery] byte month,
            [FromQuery] short year,
            [FromQuery] string? site)
        {
            var authResult = await _authorizationService.AuthorizeAsync(User, PageId, "ViewPagePolicy");
            if (!authResult.Succeeded) return Forbid();
            if (month == 0 || year == 0) return BadRequest("Month and Year must be greater than zero.");

            var query =
                from metric in _db.OtherOperatorKpiMetrics.AsNoTracking()
                join kpi in _db.OtherOperatorKpis.AsNoTracking()
                    on metric.OtherOperatorKpiId equals kpi.Id
                where metric.Month == month && metric.Year == year
                select new { metric, kpi };

            if (!string.IsNullOrWhiteSpace(site))
            {
                var normalized = NormalizeSite(site);
                query = query.Where(x => x.metric.Site != null && x.metric.Site.ToUpper() == normalized);
            }

            var result = await query
                .OrderBy(x => x.kpi.Id)
                .Select(x => new OtherKpiMetricDto
                {
                    Id = x.metric.Id,
                    OtherKpiId = x.kpi.Id,
                    NetworkEngineerKpi = x.kpi.NetworkEngineerKpi,
                    Division = x.kpi.Division,
                    Section = x.kpi.Section,
                    KpiPercent = x.kpi.KpiPercent,
                    Site = x.metric.Site ?? string.Empty,
                    TotalFaults = x.metric.TotalFaults,
                    FaultsWithinSla = x.metric.FaultsWithinSla,
                    RepeatedFaults = x.metric.RepeatedFaults,
                    TotalCustomers = x.metric.TotalCustomers,
                    TotalClearanceFaults = x.metric.TotalClearanceFaults,
                    ClearedWithin4Hrs = x.metric.ClearedWithin4Hrs,
                    Month = x.metric.Month,
                    Year = x.metric.Year
                })
                .ToListAsync();

            return Ok(result);
        }

        [HttpPost("metrics")]
        public async Task<ActionResult<OtherKpiMetricDto>> UpsertMetrics([FromBody] UpsertOtherKpiMetricDto dto)
        {
            var authResult = await _authorizationService.AuthorizeAsync(User, PageId, "EditPlatformKpiPolicy");
            if (!authResult.Succeeded) return Forbid();

            if (dto == null) return BadRequest("Request body is required.");
            if (dto.OtherKpiId <= 0) return BadRequest("OtherKpiId must be greater than zero.");
            if (dto.Month == 0 || dto.Year == 0) return BadRequest("Month and Year must be greater than zero.");

            var kpi = await _db.OtherOperatorKpis.FirstOrDefaultAsync(x => x.Id == dto.OtherKpiId);
            if (kpi == null) return NotFound($"Other Operator KPI with id '{dto.OtherKpiId}' was not found.");

            var normalizedSite = NormalizeSite(dto.Site);
            if (string.IsNullOrWhiteSpace(normalizedSite)) return BadRequest("Site is required.");

            var metric = await _db.OtherOperatorKpiMetrics.FirstOrDefaultAsync(x =>
                x.OtherOperatorKpiId == dto.OtherKpiId &&
                x.Site != null &&
                x.Site.ToUpper() == normalizedSite &&
                x.Month == dto.Month &&
                x.Year == dto.Year);

            if (metric == null)
            {
                metric = new OtherOperatorKpiMetric
                {
                    OtherOperatorKpiId = dto.OtherKpiId,
                    Site = normalizedSite,
                    Month = dto.Month,
                    Year = dto.Year
                };
                _db.OtherOperatorKpiMetrics.Add(metric);
            }

            metric.TotalFaults = dto.TotalFaults;
            metric.FaultsWithinSla = dto.FaultsWithinSla;
            metric.RepeatedFaults = dto.RepeatedFaults;
            metric.TotalCustomers = dto.TotalCustomers;
            metric.TotalClearanceFaults = dto.TotalClearanceFaults;
            metric.ClearedWithin4Hrs = dto.ClearedWithin4Hrs;

            await _db.SaveChangesAsync();

            return Ok(ToMetricDto(metric, kpi));
        }

        [HttpDelete("metrics/{metricId:int}")]
        public async Task<IActionResult> DeleteMetric(int metricId)
        {
            var authResult = await _authorizationService.AuthorizeAsync(User, PageId, "EditPlatformKpiPolicy");
            if (!authResult.Succeeded) return Forbid();

            var row = await _db.OtherOperatorKpiMetrics.FirstOrDefaultAsync(x => x.Id == metricId);
            if (row == null) return NotFound();

            _db.OtherOperatorKpiMetrics.Remove(row);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        private static OtherKpiMetricDto ToMetricDto(OtherOperatorKpiMetric metric, OtherOperatorKpi kpi) => new()
        {
            Id = metric.Id,
            OtherKpiId = kpi.Id,
            NetworkEngineerKpi = kpi.NetworkEngineerKpi,
            Division = kpi.Division,
            Section = kpi.Section,
            KpiPercent = kpi.KpiPercent,
            Site = metric.Site ?? string.Empty,
            TotalFaults = metric.TotalFaults,
            FaultsWithinSla = metric.FaultsWithinSla,
            RepeatedFaults = metric.RepeatedFaults,
            TotalCustomers = metric.TotalCustomers,
            TotalClearanceFaults = metric.TotalClearanceFaults,
            ClearedWithin4Hrs = metric.ClearedWithin4Hrs,
            Month = metric.Month,
            Year = metric.Year
        };

        private static string NormalizeSite(string? value) => (value ?? string.Empty).Trim().ToUpperInvariant();
    }
}
