/*
 * File: EnterpriseKpiController.cs
 * CRUD endpoints for Enterprise KPI admin definitions.
 */

using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Helpers.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EnterpriseKpiController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IAuthorizationService _authorizationService;
        private const int PageId = 8;

        public EnterpriseKpiController(AppDbContext db, IAuthorizationService authorizationService)
        {
            _db = db;
            _authorizationService = authorizationService;
        }

        // GET all Enterprise KPI definitions
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EnterpriseKpiDto>>> GetAll()
        {
            var items = await _db.EnterpriseKpis
                .AsNoTracking()
                .OrderBy(x => x.Id)
                .Select(x => new EnterpriseKpiDto
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
        public async Task<IActionResult> GetMetrics([FromQuery] byte month, [FromQuery] short year, [FromQuery] string? area)
        {
            var authResult = await _authorizationService.AuthorizeAsync(User, PageId, "ViewPagePolicy");
            if (!authResult.Succeeded) return Forbid();

            if (month == 0 || year == 0)
                return BadRequest("Month and Year must be greater than zero.");

            var query =
                from metric in _db.EnterpriseKpiMetrics.AsNoTracking()
                join kpi in _db.EnterpriseKpis.AsNoTracking()
                    on metric.EnterpriseKpiId equals kpi.Id
                where metric.Month == month && metric.Year == year
                select new { metric, kpi };

            if (!string.IsNullOrWhiteSpace(area))
            {
                var normalized = area.Trim().ToUpper();
                query = query.Where(x => x.metric.AreaCode != null && x.metric.AreaCode.ToUpper() == normalized);
            }

            var result = await query
                .OrderBy(x => x.kpi.Id)
                .Select(x => new
                {
                    id = x.kpi.Id,
                    networkEngineerKpi = x.kpi.NetworkEngineerKpi,
                    division = x.kpi.Division,
                    section = x.kpi.Section,
                    kpiPercent = x.kpi.KpiPercent,
                    area = x.metric.AreaCode ?? string.Empty,
                    kpi_value = x.metric.KpiValue,
                    month = x.metric.Month,
                    year = x.metric.Year
                })
                .ToListAsync();

            return Ok(result);
        }

        // GET by ID
        [HttpGet("{id:int}")]
        public async Task<ActionResult<EnterpriseKpiDto>> GetById(int id)
        {
            var item = await _db.EnterpriseKpis
                .AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new EnterpriseKpiDto
                {
                    Id = x.Id,
                    NetworkEngineerKpi = x.NetworkEngineerKpi,
                    Division = x.Division,
                    Section = x.Section,
                    KpiPercent = x.KpiPercent
                })
                .FirstOrDefaultAsync();

            if (item == null) return NotFound();
            return Ok(item);
        }

        // POST create
        [HttpPost]
        [Authorize(Policy = "AdminOnly")]
        public async Task<ActionResult<EnterpriseKpiDto>> Create([FromBody] CreateEnterpriseKpiDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.NetworkEngineerKpi))
                return BadRequest("NetworkEngineerKpi is required.");

            var entity = new EnterpriseKpi
            {
                NetworkEngineerKpi = dto.NetworkEngineerKpi.Trim(),
                Division = dto.Division,
                Section = dto.Section,
                KpiPercent = dto.KpiPercent
            };

            _db.EnterpriseKpis.Add(entity);
            await _db.SaveChangesAsync();

            var result = new EnterpriseKpiDto
            {
                Id = entity.Id,
                NetworkEngineerKpi = entity.NetworkEngineerKpi,
                Division = entity.Division,
                Section = entity.Section,
                KpiPercent = entity.KpiPercent
            };

            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, result);
        }

        // PUT update
        [HttpPut("{id:int}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateEnterpriseKpiDto dto)
        {
            var entity = await _db.EnterpriseKpis.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound();

            if (string.IsNullOrWhiteSpace(dto.NetworkEngineerKpi))
                return BadRequest("NetworkEngineerKpi is required.");

            entity.NetworkEngineerKpi = dto.NetworkEngineerKpi.Trim();
            entity.Division = dto.Division;
            entity.Section = dto.Section;
            entity.KpiPercent = dto.KpiPercent;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE
        [HttpDelete("{id:int}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _db.EnterpriseKpis.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound();

            _db.EnterpriseKpis.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("metrics")]
        public async Task<IActionResult> UpsertMetrics([FromBody] UpsertEnterpriseKpiMetricDto dto)
        {
            var authResult = await _authorizationService.AuthorizeAsync(User, PageId, "EditPlatformKpiPolicy");
            if (!authResult.Succeeded) return Forbid();

            if (dto == null) return BadRequest("Request body is required.");
            if (dto.EnterpriseKpiId <= 0) return BadRequest("EnterpriseKpiId must be > 0.");
            if (dto.Month == 0 || dto.Year == 0) return BadRequest("Month and Year must be greater than zero.");

            var kpi = await _db.EnterpriseKpis.FirstOrDefaultAsync(x => x.Id == dto.EnterpriseKpiId);
            if (kpi == null)
                return NotFound($"Enterprise KPI with id '{dto.EnterpriseKpiId}' was not found.");

            var normalizedArea = (dto.AreaCode ?? string.Empty).Trim().ToUpper();
            if (string.IsNullOrWhiteSpace(normalizedArea))
                return BadRequest("AreaCode is required.");

            var metric = await _db.EnterpriseKpiMetrics.FirstOrDefaultAsync(x =>
                x.EnterpriseKpiId == dto.EnterpriseKpiId &&
                x.AreaCode.ToUpper() == normalizedArea &&
                x.Month == dto.Month &&
                x.Year == dto.Year);

            if (metric == null)
            {
                metric = new EnterpriseKpiMetric
                {
                    EnterpriseKpiId = dto.EnterpriseKpiId,
                    AreaCode = normalizedArea,
                    KpiValue = dto.KpiValue,
                    Month = dto.Month,
                    Year = dto.Year
                };

                _db.EnterpriseKpiMetrics.Add(metric);
            }
            else
            {
                metric.AreaCode = normalizedArea;
                metric.KpiValue = dto.KpiValue;
                metric.Month = dto.Month;
                metric.Year = dto.Year;
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                id = kpi.Id,
                networkEngineerKpi = kpi.NetworkEngineerKpi,
                division = kpi.Division,
                section = kpi.Section,
                kpiPercent = kpi.KpiPercent,
                area = metric.AreaCode,
                kpi_value = metric.KpiValue,
                month = metric.Month,
                year = metric.Year
            });
        }

        [HttpDelete("metrics/{metricId:int}")]
        public async Task<IActionResult> DeleteMetric(int metricId)
        {
            var authResult = await _authorizationService.AuthorizeAsync(User, PageId, "EditPlatformKpiPolicy");
            if (!authResult.Succeeded) return Forbid();

            var row = await _db.EnterpriseKpiMetrics.FirstOrDefaultAsync(x => x.Id == metricId);
            if (row == null) return NotFound();

            _db.EnterpriseKpiMetrics.Remove(row);
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}
