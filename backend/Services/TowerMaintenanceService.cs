using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class TowerMaintenanceService
    {
        private readonly AppDbContext _db;

        public TowerMaintenanceService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<RoutineMaintenanceResult>> GetTowerPercentagesAsync(
            short year,
            byte month,
            Dictionary<string, string> designationToArea)
        {
            var selectedMonthNum = (int)month;

            var monthNames = CultureInfo.InvariantCulture.DateTimeFormat.MonthNames
                .Where(x => !string.IsNullOrWhiteSpace(x)).ToArray();

            var monthSeq = monthNames
                .Select((name, idx) => new { Name = name, Num = idx + 1 })
                .ToDictionary(x => x.Name, x => x.Num, System.StringComparer.OrdinalIgnoreCase);

            var rows = await _db.TowerMtcData
                .AsNoTracking()
                .ToListAsync();

            rows = rows
                .Where(x => int.TryParse(x.Year?.ToString(), out var y) && y == year)
                .ToList();

            var results = new List<RoutineMaintenanceResult>();

            var groups = rows.GroupBy(x => (x.Designation ?? string.Empty).Trim());

            foreach (var group in groups)
            {
                var candidate = group
                    .Select(r => new { Row = r, MonthNum = monthSeq.TryGetValue(r.Month?.Trim() ?? string.Empty, out var mnum) ? mnum : 0 })
                    .Where(x => x.MonthNum > 0 && x.MonthNum <= selectedMonthNum)
                    .OrderByDescending(x => x.MonthNum)
                    .FirstOrDefault();

                if (candidate == null) continue;

                var selected = candidate.Row;
                var designation = (selected.Designation ?? string.Empty).Trim();

                var sched = (decimal)selected.CumulativeScheduled;
                var achieved = (decimal)selected.CumulativeAttended;

                var percent = RoutineMaintenanceServiceHelpers.CalculatePercentage(sched, achieved);

                designationToArea.TryGetValue(designation, out var areaCode);
                areaCode ??= string.Empty;

                results.Add(new RoutineMaintenanceResult(designation, areaCode, percent));
            }

            Console.WriteLine($"Tower rows = {results.Count}");
            return results;
        }
    }

    // Small helper holder to reuse CalculatePercentage without circular dependencies
    internal static class RoutineMaintenanceServiceHelpers
    {
        public static decimal CalculatePercentage(decimal sched, decimal achieved)
        {
            if (sched == 0m) return 0m;
            return decimal.Round((achieved / sched) * 100m, 2);
        }
    }
}
