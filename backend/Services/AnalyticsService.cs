using backend.Data;
using backend.DTOs;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class AnalyticsService
    {
        private readonly AppDbContext _db;

        public AnalyticsService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<AnalyticsResultDto>> GetCumulativeAnalyticsAsync(short year, byte startMonth, byte endMonth)
        {
            var results = await _db.OverallKpiResults
                .AsNoTracking()
                .Where(x => x.Year == year && x.Month >= startMonth && x.Month <= endMonth)
                .GroupBy(x => new { x.KpiDefinitionId, x.AreaCode })
                .Select(g => new AnalyticsResultDto
                {
                    KpiDefinitionId = g.Key.KpiDefinitionId,
                    AreaCode = g.Key.AreaCode,
                    KpiName = g.First().KpiName,
                    Year = year,
                    AchievedKpi = g.Average(x => x.AchievedKpi),
                    MaximumPointsPerKpi = g.Average(x => x.MaximumPointsPerKpi),
                    PointsAchieved = g.Average(x => x.PointsAchieved),
                    OverallKpiValuePercent = 0m
                })
                .ToListAsync();

            return results;
        }
    }
}
