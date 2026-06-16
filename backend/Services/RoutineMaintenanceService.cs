using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class RoutineMaintenanceService
    {
        private readonly AppDbContext _db;

        public RoutineMaintenanceService(AppDbContext db)
        {
            _db = db;
        }

        public Task<List<RoutineMaintenanceResult>> GetResultsAsync()
        {
            // TODO: implement retrieval logic using _db
            return Task.FromResult(new List<RoutineMaintenanceResult>());
        }

        public async Task<List<RoutineMaintenanceResult>> GetIpnwPercentagesAsync(
            short year,
            byte month,
            Dictionary<string, string> designationToArea)
        {
            // Determine the 2-month cycle for the provided month
            var cycle = (month + 1) / 2; // 1..6
            var firstMonthNum = (cycle * 2) - 1;
            var secondMonthNum = cycle * 2;

            var monthNames = CultureInfo.InvariantCulture.DateTimeFormat.MonthNames
                .Where(x => !string.IsNullOrWhiteSpace(x)).ToArray();

            var m1 = monthNames[firstMonthNum - 1];
            var m2 = monthNames[secondMonthNum - 1];

            var rows = await _db.IpnwMtcData
                .AsNoTracking()
                .ToListAsync();

            rows = rows
                .Where(x =>
                    int.TryParse(x.Year?.ToString(), out var y)
                    && y == year
                    && (
                        string.Equals(x.Month?.Trim(), m1, System.StringComparison.OrdinalIgnoreCase)
                        || string.Equals(x.Month?.Trim(), m2, System.StringComparison.OrdinalIgnoreCase)
                    ))
                .ToList();

            var results = new List<RoutineMaintenanceResult>();

            var groups = rows.GroupBy(x => (x.Designation ?? string.Empty).Trim());

            foreach (var group in groups)
            {
                // Prefer the later month (m2) if present, else m1
                var selected = group.FirstOrDefault(r => string.Equals(r.Month?.Trim(), m2, System.StringComparison.OrdinalIgnoreCase))
                               ?? group.FirstOrDefault(r => string.Equals(r.Month?.Trim(), m1, System.StringComparison.OrdinalIgnoreCase));

                if (selected == null) continue; // nothing to compute

                var designation = (selected.Designation ?? string.Empty).Trim();

                var sched = (decimal)selected.CumulativeSched;
                var achieved = (decimal)selected.CumulativeAchieved;

                var percent = CalculatePercentage(sched, achieved);

                designationToArea.TryGetValue(designation, out var areaCode);
                areaCode ??= string.Empty;

                results.Add(new RoutineMaintenanceResult(designation, areaCode, percent, sched));
            }

            Console.WriteLine($"IPNW rows = {results.Count}");
            return results;
        }

        public async Task<List<RoutineMaintenanceResult>> GetSlbnPercentagesAsync(
            short year,
            byte month,
            Dictionary<string, string> designationToArea)
        {
            // Determine the 2-month cycle for the provided month
            var cycle = (month + 1) / 2; // 1..6
            var firstMonthNum = (cycle * 2) - 1;
            var secondMonthNum = cycle * 2;

            var monthNames = CultureInfo.InvariantCulture.DateTimeFormat.MonthNames
                .Where(x => !string.IsNullOrWhiteSpace(x)).ToArray();

            var m1 = monthNames[firstMonthNum - 1];
            var m2 = monthNames[secondMonthNum - 1];

            var rows = await _db.SlbnMtcData
                .AsNoTracking()
                .ToListAsync();

            rows = rows
                .Where(x =>
                    int.TryParse(x.Year?.ToString(), out var y)
                    && y == year
                    && (
                        string.Equals(x.Month?.Trim(), m1, System.StringComparison.OrdinalIgnoreCase)
                        || string.Equals(x.Month?.Trim(), m2, System.StringComparison.OrdinalIgnoreCase)
                    ))
                .ToList();

            var results = new List<RoutineMaintenanceResult>();

            var groups = rows.GroupBy(x => (x.Designation ?? string.Empty).Trim());

            foreach (var group in groups)
            {
                // Prefer the later month (m2) if present, else m1
                var selected = group.FirstOrDefault(r => string.Equals(r.Month?.Trim(), m2, System.StringComparison.OrdinalIgnoreCase))
                               ?? group.FirstOrDefault(r => string.Equals(r.Month?.Trim(), m1, System.StringComparison.OrdinalIgnoreCase));

                if (selected == null) continue;

                var designation = (selected.Designation ?? string.Empty).Trim();

                var sched = (decimal)selected.CumulativeSched;
                var achieved = (decimal)selected.CumulativeAchieved;

                var percent = CalculatePercentage(sched, achieved);

                designationToArea.TryGetValue(designation, out var areaCode);
                areaCode ??= string.Empty;

                results.Add(new RoutineMaintenanceResult(designation, areaCode, percent, sched));
            }

            Console.WriteLine($"SLBN rows = {results.Count}");
            return results;
        }

        public async Task<List<RoutineMaintenanceResult>> GetMsanPercentagesAsync(
            short year,
            byte month,
            Dictionary<string, string> designationToArea)
        {
            // Determine half-year cycle start/end
            var selectedMonthNum = (int)month;
            var cycleStart = selectedMonthNum <= 6 ? 1 : 7;
            var cycleEnd = selectedMonthNum <= 6 ? 6 : 12;

            var monthNames = CultureInfo.InvariantCulture.DateTimeFormat.MonthNames
                .Where(x => !string.IsNullOrWhiteSpace(x)).ToArray();

            var monthSeq = monthNames
                .Select((name, idx) => new { Name = name, Num = idx + 1 })
                .ToDictionary(x => x.Name, x => x.Num, System.StringComparer.OrdinalIgnoreCase);

            var rows = await _db.MsanMtcData
                .AsNoTracking()
                .ToListAsync();

            rows = rows
                .Where(x =>
                    int.TryParse(x.Year?.ToString(), out var y)
                    && y == year
                    && (monthSeq.TryGetValue(x.Month?.Trim() ?? string.Empty, out var mn)
                        && mn >= cycleStart && mn <= cycleEnd)
                )
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

                var sched = (decimal)selected.CumulativeSched;
                var achieved = (decimal)selected.CumulativeAchieved;

                var percent = CalculatePercentage(sched, achieved);

                designationToArea.TryGetValue(designation, out var areaCode);
                areaCode ??= string.Empty;

                results.Add(new RoutineMaintenanceResult(designation, areaCode, percent, sched));
            }

            Console.WriteLine($"MSAN rows = {results.Count}");
            return results;
        }

        private static decimal CalculatePercentage(
            decimal sched,
            decimal achieved)
        {
            if (sched == 0m) return 0m;
            return decimal.Round((achieved / sched) * 100m, 2);
        }
    }
}
