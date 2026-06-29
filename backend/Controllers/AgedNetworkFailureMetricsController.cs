using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/aged-network-failure-metrics")]
    [Authorize]
    public class AgedNetworkFailureMetricsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<AgedNetworkFailureMetricsController> _logger;

        public AgedNetworkFailureMetricsController(
            AppDbContext db,
            ILogger<AgedNetworkFailureMetricsController> logger)
        {
            _db = db;
            _logger = logger;
        }

        // GET: optional filters by area_code + month + year
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] string? areaCode,
            [FromQuery] byte? month,
            [FromQuery] short? year)
        {
            var q = _db.AgedNetworkFailureMetrics.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(areaCode))
                q = q.Where(x => x.AreaCode == areaCode.Trim().ToLower());
            if (month.HasValue) q = q.Where(x => x.Month == month.Value);
            if (year.HasValue) q = q.Where(x => x.Year == year.Value);

            var rows = await q.ToListAsync();
            return Ok(rows.Select(ToDto));
        }

        // POST: upsert by business key (area_code + month + year)
        [HttpPost]
        public async Task<IActionResult> Upsert([FromBody] UpsertAgedNetworkFailureMetricDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var areaCode = dto.AreaCode.Trim().ToLower();

            var existingId = await _db.AgedNetworkFailureMetrics
                .AsNoTracking()
                .Where(x => x.AreaCode == areaCode && x.Month == dto.Month && x.Year == dto.Year)
                .Select(x => (int?)x.Id)
                .FirstOrDefaultAsync();

            if (existingId.HasValue)
            {
                var toUpdate = new AgedNetworkFailureMetric
                {
                    Id = existingId.Value,
                    AreaCode = areaCode,
                    Percentage = dto.Percentage,
                    Remarks = dto.Remarks ?? string.Empty,
                    Month = dto.Month,
                    Year = dto.Year
                };

                _db.AgedNetworkFailureMetrics.Attach(toUpdate);
                _db.Entry(toUpdate).Property(x => x.Percentage).IsModified = true;
                _db.Entry(toUpdate).Property(x => x.Remarks).IsModified = true;

                await _db.SaveChangesAsync();

                _logger.LogInformation(
                    "Updated AgedNetworkFailureMetric id={Id} area={Area} month={Month} year={Year} percentage={Pct} remarks={Remarks}",
                    existingId.Value, areaCode, dto.Month, dto.Year, dto.Percentage, dto.Remarks);

                return Ok(new { message = "Updated successfully", id = existingId.Value, percentage = dto.Percentage, remarks = dto.Remarks });
            }

            var entity = new AgedNetworkFailureMetric
            {
                AreaCode = areaCode,
                Percentage = dto.Percentage,
                Remarks = dto.Remarks ?? string.Empty,
                Month = dto.Month,
                Year = dto.Year
            };

            _db.AgedNetworkFailureMetrics.Add(entity);
            await _db.SaveChangesAsync();

            _logger.LogInformation(
                "Created AgedNetworkFailureMetric id={Id} area={Area} month={Month} year={Year} percentage={Pct} remarks={Remarks}",
                entity.Id, areaCode, dto.Month, dto.Year, dto.Percentage, dto.Remarks);

            return Ok(new { message = "Saved successfully", id = entity.Id, percentage = dto.Percentage, remarks = dto.Remarks });
        }

        // PUT: update by id
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpsertAgedNetworkFailureMetricDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var rows = await _db.AgedNetworkFailureMetrics
                .Where(x => x.Id == id)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.Percentage, dto.Percentage)
                    .SetProperty(x => x.Remarks, dto.Remarks ?? string.Empty));

            if (rows == 0) return NotFound();

            _logger.LogInformation("Updated AgedNetworkFailureMetric id={Id} percentage={Pct} remarks={Remarks}", id, dto.Percentage, dto.Remarks);
            return Ok(new { message = "Updated successfully", id, percentage = dto.Percentage, remarks = dto.Remarks });
        }

        // DELETE
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var rows = await _db.AgedNetworkFailureMetrics
                .Where(x => x.Id == id)
                .ExecuteDeleteAsync();

            if (rows == 0) return NotFound();
            return NoContent();
        }

        private static AgedNetworkFailureMetricDto ToDto(AgedNetworkFailureMetric x) => new()
        {
            Id = x.Id,
            AreaCode = x.AreaCode,
            Percentage = x.Percentage,
            Remarks = x.Remarks ?? string.Empty,
            Month = (byte)x.Month,
            Year = (short)x.Year
        };
    }
}

