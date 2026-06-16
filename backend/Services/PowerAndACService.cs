using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class PowerAndACService
    {
        private readonly AppDbContext _db;

        public PowerAndACService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<RoutineMaintenanceResult>> GetPowerAndACPercentagesAsync(
            short year,
            byte month,
            Dictionary<string, string> designationToArea)
        {
            var selectedMonthNum = (int)month;
            var quarter = ((selectedMonthNum - 1) / 3) + 1;
            var startMonth = (quarter - 1) * 3 + 1;

            var rows = await _db.PowerAndAC
                .AsNoTracking()
                .Where(x => x.Year == year)
                .ToListAsync();

            Console.WriteLine($"DEBUG: Retrieved {rows.Count} rows from PowerAndAC table for year {year}");
            foreach (var r in rows)
            {
                Console.WriteLine($"DEBUG ROW: Designation='{r.Designation}', Year={r.Year}, Month={r.Month}, Sched={r.Scheduled}, Attended={r.Attended}");
            }

            var results = new List<RoutineMaintenanceResult>();
            var groups = rows.GroupBy(x => (x.Designation ?? string.Empty).Trim());

            foreach (var group in groups)
            {
                var designation = group.Key;
                if (string.IsNullOrEmpty(designation)) continue;

                // Calculate cumulative scheduled and attended on-the-fly for the current quarter up to the queried month
                var quarterRows = group
                    .Where(x => x.Month >= startMonth && x.Month <= selectedMonthNum)
                    .ToList();

                if (!quarterRows.Any()) continue;

                var sched = (decimal)quarterRows.Sum(x => x.Scheduled);
                var achieved = (decimal)quarterRows.Sum(x => x.Attended);

                var percent = RoutineMaintenanceServiceHelpers.CalculatePercentage(sched, achieved);

                designationToArea.TryGetValue(designation, out var areaCode);
                areaCode ??= string.Empty;

                results.Add(new RoutineMaintenanceResult(designation, areaCode, percent, sched));
            }

            Console.WriteLine($"Power & AC rows = {results.Count}");
            return results;
        }
    }
}
