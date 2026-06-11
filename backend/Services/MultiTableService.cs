/*
 * File: MultiTableService.cs
 * Implements data fetching from database for multiple platform types.
 * Msan, Vpn, Slbn use CumulativeSched/CumulativeAchieved.
 * Tower uses raw Scheduled/Attended.
 */

using backend.Data;
using backend.DTOs;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class MultiTableService : IMultiTableService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;

        public MultiTableService(HttpClient httpClient, IConfiguration configuration, AppDbContext context)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _context = context;
        }

        public async Task<List<PlatformRecordDto>> FetchMsanDataAsync(int? year = null)
        {
            var rows = await _context.MsanMtcData
                .Where(x => year == null || x.Year == year)
                .Select(x => new CumulativeRow
                {
                    Designation = x.Designation,
                    Month = x.Month,
                    CumulativeSched = x.CumulativeSched,
                    CumulativeAchieved = x.CumulativeAchieved
                }).ToListAsync();

            return GroupToPlatformRecords(rows);
        }

        public async Task<List<PlatformRecordDto>> FetchVpnDataAsync(int? year = null)
        {
            var rows = await _context.IpnwMtcData
                .Where(x => year == null || x.Year == year)
                .Select(x => new CumulativeRow
                {
                    Designation = x.Designation,
                    Month = x.Month,
                    CumulativeSched = x.CumulativeSched,
                    CumulativeAchieved = x.CumulativeAchieved
                }).ToListAsync();

            return GroupToPlatformRecords(rows);
        }

        public async Task<List<PlatformRecordDto>> FetchSlbnDataAsync(int? year = null)
        {
            var rows = await _context.SlbnMtcData
                .Where(x => year == null || x.Year == year)
                .Select(x => new CumulativeRow
                {
                    Designation = x.Designation,
                    Month = x.Month,
                    CumulativeSched = x.CumulativeSched,
                    CumulativeAchieved = x.CumulativeAchieved
                }).ToListAsync();

            return GroupToPlatformRecords(rows);
        }

        public async Task<List<PlatformRecordDto>> FetchTowerDataAsync(int? year = null)
        {
            var rows = await _context.TowerMtcData
                .Where(x => year == null || x.Year == (short)year)
                .Select(x => new RawRow
                {
                    Designation = x.Designation,
                    Month = x.Month,
                    Scheduled = x.Scheduled ?? 0,
                    Attended = x.Attended ?? 0
                }).ToListAsync();

            return rows
                .GroupBy(x => NormalizeMonth(x.Month))
                .Select(g => new PlatformRecordDto
                {
                    Month = g.Key,
                    Details = new List<PlatformDetailDto>(),
                    Data = g
                        .Where(x => !string.IsNullOrWhiteSpace(x.Designation))
                        .ToDictionary(
                            x => x.Designation!.Trim(),
                            x => new PlatformDetailDto
                            {
                                Column2 = x.Scheduled.ToString(),
                                Column3 = x.Attended.ToString()
                            })
                }).ToList();
        }

        // -------------------------------------------------------
        // Groups cumulative rows into PlatformRecordDto per month.
        // Column2 = CumulativeSched, Column3 = CumulativeAchieved.
        // -------------------------------------------------------
        private static List<PlatformRecordDto> GroupToPlatformRecords(List<CumulativeRow> rows)
        {
            return rows
                .GroupBy(x => NormalizeMonth(x.Month))
                .Select(g => new PlatformRecordDto
                {
                    Month = g.Key,
                    Details = new List<PlatformDetailDto>(),
                    Data = g
                        .Where(x => !string.IsNullOrWhiteSpace(x.Designation))
                        .ToDictionary(
                            x => x.Designation!.Trim(),
                            x => new PlatformDetailDto
                            {
                                Column2 = x.CumulativeSched.ToString(),
                                Column3 = x.CumulativeAchieved.ToString()
                            })
                }).ToList();
        }

        private static string NormalizeMonth(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

            var trimmed = raw.Trim();

            if (int.TryParse(trimmed, out int monthNum) && monthNum >= 1 && monthNum <= 12)
                return new DateTime(2000, monthNum, 1).ToString("MMMM");

            if (DateTime.TryParse(trimmed, out DateTime parsed))
                return parsed.ToString("MMMM");

            if (DateTime.TryParseExact(trimmed, new[] { "MMM", "MMMM" },
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out DateTime abbr))
                return abbr.ToString("MMMM");

            return trimmed;
        }

        // -------------------------------------------------------
        // Private projection types — avoid anonymous type boxing
        // -------------------------------------------------------
        private class CumulativeRow
        {
            public string? Designation { get; set; }
            public string? Month { get; set; }
            public int CumulativeSched { get; set; }
            public int CumulativeAchieved { get; set; }
        }

        private class RawRow
        {
            public string? Designation { get; set; }
            public string? Month { get; set; }
            public int Scheduled { get; set; }
            public int Attended { get; set; }
        }
    }
}
