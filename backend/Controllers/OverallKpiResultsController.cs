/*
 * File: OverallKpiResultsController.cs
 * Calculates and retrieves overall KPI results by aggregating data from multiple KPI platforms.
 * Includes logic for matching KPI definitions, calculating availability, scoring, and persisting results.
 */

using System.Text.RegularExpressions;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace backend.Controllers
{
    // =========================================================
    // OVERALL KPI RESULTS CONTROLLER
    // Handles calculation and retrieval of aggregated KPI results
    // Combines metrics from IP, BB&ANW, OTN Op1/Op2, and Service Fulfilment platforms
    // Persists calculated results for performance and audit purposes
    // =========================================================
    [ApiController]
    [Route("api/overall-kpi-results")]
    [Authorize]
    public class OverallKpiResultsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public OverallKpiResultsController(AppDbContext db)
        {
            _db = db;
        }

        // =========================================================
        // GET OVERALL KPI RESULTS
        // Retrieves pre-calculated overall KPI results for a given month and year
        // Returns stored results from OverallKpiResult table without recalculation
        // Parameters: month (1-12), year (e.g., 2025)
        // Returns: List of KPI results with achievements and scores by area
        // =========================================================
        [HttpGet]
        public async Task<ActionResult<List<OverallKpiResultDto>>> GetAll(
            [FromQuery] int? month,
            [FromQuery] int? year)
        {
            var now = DateTime.UtcNow;
            byte m = (byte)(month ?? now.Month);
            short y = (short)(year ?? now.Year);

            var rows = await _db.OverallKpiResults
                .AsNoTracking()
                .Where(x => x.Month == m && x.Year == y)
                .OrderBy(x => x.KpiDefinitionId)
                .ThenBy(x => x.AreaCode)
                .ToListAsync();

            return Ok(rows.Select(ToDto).ToList());
        }

        // =========================================================
        // CALCULATE AND PERSIST OVERALL KPI RESULTS
        // Triggers recalculation of overall KPI results for specified month/year
        // Steps:
        // 1. Load KPI definitions (fallback to latest if not found)
        // 2. Retrieve all metrics from platform-specific tables
        // 3. Load area codes from actual metrics (not RegionData)
        // 4. Match KPI definitions with platform metrics (IP, BB, OTN, SF)
        // 5. Calculate per-area KPI values based on platform calculations
        // 6. Compute overall KPI percentage per area
        // 7. Persist results to database for audit and performance
        // Returns: List of newly calculated KPI results
        // =========================================================
        [HttpPost("calculate")]
        [Authorize]
        public async Task<ActionResult<List<OverallKpiResultDto>>> Calculate(
            [FromQuery] int? month,
            [FromQuery] int? year)
        {
            var now = DateTime.UtcNow;
            //byte m = (byte)(month ?? now.Month);
            byte m = (byte)(month ?? 2);
            short y = (short)(year ?? now.Year);

            var calculated = await CalculateAndPersistAsync(m, y);
            return Ok(calculated.Select(ToDto).ToList());
        }

        // =========================================================
        // CORE CALCULATION LOGIC
        // Performs end-to-end KPI aggregation and persistence
        // =========================================================
        private async Task<List<OverallKpiResult>> CalculateAndPersistAsync(byte month, short year)
        {
            Console.WriteLine("month: "+month);
            // =========================================================
            // STEP 1: LOAD KPI DEFINITIONS
            // Fetch master KPI definitions for selected month/year
            // Fallback to latest definitions if none exist for selected period
            // =========================================================
            var kpis = await _db.KpiDefinitions
                .AsNoTracking()
                .Where(x => x.Month == month && x.Year == year)
                .OrderBy(x => x.Id)
                .ToListAsync();

            if (!kpis.Any())
            {
                var latest = await _db.KpiDefinitions
                    .AsNoTracking()
                    .OrderByDescending(x => x.Year)
                    .ThenByDescending(x => x.Month)
                    .Select(x => new { x.Month, x.Year })
                    .FirstOrDefaultAsync();

                if (latest != null)
                {
                    kpis = await _db.KpiDefinitions
                        .AsNoTracking()
                        .Where(x => x.Month == latest.Month && x.Year == latest.Year)
                        .OrderBy(x => x.Id)
                        .ToListAsync();
                }
            }

            // =========================================================
            // STEP 2: LOAD ALL PLATFORM METRICS
            // Retrieve raw metrics from all KPI platforms for month/year
            // Metrics are loaded early so area codes can be extracted from actual data
            // This fixes NullReferenceException that occurred when RegionData was empty
            // =========================================================
            // Load metrics first to extract area codes
            var ipMetrics = await _db.IpNwOpKpiMetrics.AsNoTracking()
                .Where(x => x.Month == month && x.Year == year)
                .ToListAsync();

            var bbMetrics = await _db.BbAnwKpiNodes.AsNoTracking()
                .Where(x => x.Month == month && x.Year == year)
                .ToListAsync();

            var otn1Metrics = await _db.OtnOp1Metrics.AsNoTracking()
                .Where(x => x.Month == month && x.Year == year)
                .ToListAsync();

            var otn2Metrics = await _db.OtnOp2Metrics.AsNoTracking()
                .Where(x => x.Month == month && x.Year == year)
                .ToListAsync();

            var sfMetrics = await _db.ServiceFulfilmentKpiMetrics.AsNoTracking()
                .Where(x => x.Month == month && x.Year == year)
                .ToListAsync();

            var entMetrics = await _db.EnterpriseKpiMetrics.AsNoTracking()
                .Where(x => x.Month == month && x.Year == year)
                .ToListAsync();

            var otherMetrics = await _db.OtherKpiMetrics.AsNoTracking()
                .Where(x => x.Month == month && x.Year == year)
                .ToListAsync();

            // =========================================================
            // STEP 3: EXTRACT AREA CODES FROM METRICS
            // Aggregate all unique area codes from actual metric data
            // Different platforms use different field names for areas:
            // - IP: AreaCode
            // - BB&ANW: NodeCode
            // - OTN Op1/Op2: Site
            // - Service Fulfilment: AreaCode
            // =========================================================
            // Retrieve all distinct area codes from metrics (not RegionData)
            var allAreaCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            
            allAreaCodes.UnionWith(ipMetrics
                .Select(x => x.AreaCode)
                .Where(x => x != null && x.Trim() != string.Empty)
                .Select(x => x.Trim()));

            allAreaCodes.UnionWith(bbMetrics
                .Select(x => x.NodeCode)
                .Where(x => x != null && x.Trim() != string.Empty)
                .Select(x => x.Trim()));

            allAreaCodes.UnionWith(otn1Metrics
                .Select(x => x.Site)
                .Where(x => x != null && x.Trim() != string.Empty)
                .Select(x => x.Trim()));

            allAreaCodes.UnionWith(otn2Metrics
                .Select(x => x.Site)
                .Where(x => x != null && x.Trim() != string.Empty)
                .Select(x => x.Trim()));

            allAreaCodes.UnionWith(sfMetrics
                .Select(x => x.AreaCode)
                .Where(x => x != null && x.Trim() != string.Empty)
                .Select(x => x.Trim()));

            allAreaCodes.UnionWith(entMetrics
                .Select(x => x.AreaCode)
                .Where(x => x != null && x.Trim() != string.Empty)
                .Select(x => x.Trim()));

            allAreaCodes.UnionWith(otherMetrics
                .Select(x => x.AreaCode)
                .Where(x => x != null && x.Trim() != string.Empty)
                .Select(x => x.Trim()));

            // Normalize area codes
            var normalizedAreas = allAreaCodes
                .Select(a => NormalizeArea(a))
                .Where(x => x != string.Empty)
                .ToList();

            // =========================================================
            // STEP 4: VALIDATE DATA AVAILABILITY
            // Return empty results if no KPI definitions or area codes exist
            // =========================================================
            if (!kpis.Any() || !normalizedAreas.Any())
            {
                var emptyExisting = await _db.OverallKpiResults
                    .Where(x => x.Month == month && x.Year == year)
                    .ToListAsync();
                if (emptyExisting.Any())
                {
                    _db.OverallKpiResults.RemoveRange(emptyExisting);
                    await _db.SaveChangesAsync();
                }
                return new List<OverallKpiResult>();
            }

            // =========================================================
            // STEP 5: LOAD PLATFORM KPI DEFINITIONS
            // Fetch all platform-specific KPI names/codes for matching with master KPIs
            // =========================================================
            var ipKpis = await _db.IpNwOpKpis.AsNoTracking()
                .Select(x => new NamedKpi("ip", x.Id, x.NetworkEngineerKpi ?? string.Empty))
                .ToListAsync();
            var bbKpis = await _db.BbAnwKpis.AsNoTracking()
                .Select(x => new NamedKpi("bb", x.Id, x.NetworkEngineerKpi ?? string.Empty))
                .ToListAsync();
            var otn1Kpis = await _db.OtnOp1.AsNoTracking()
                .Select(x => new NamedKpi("otn1", x.Id, x.NetworkEngineerKpi ?? string.Empty))
                .ToListAsync();
            var otn2Kpis = await _db.OtnOp2.AsNoTracking()
                .Select(x => new NamedKpi("otn2", x.Id, x.NetworkEngineerKpi ?? string.Empty))
                .ToListAsync();
            var sfKpis = await _db.ServiceFulfilmentKpis.AsNoTracking()
                .Where(x => x.Month == month && x.Year == year)
                .Select(x => new NamedKpi("sf", x.Id, x.Kpi ?? string.Empty))
                .ToListAsync();

            var entKpis = await _db.EnterpriseKpis.AsNoTracking()
                .Select(x => new NamedKpi("ent", x.Id, x.NetworkEngineerKpi ?? string.Empty))
                .ToListAsync();

            var otherKpis = await _db.OtherKpis.AsNoTracking()
                .Select(x => new NamedKpi("other", x.Id, x.NetworkEngineerKpi ?? string.Empty))
                .ToListAsync();

            var allNamedKpis = ipKpis
                .Concat(bbKpis)
                .Concat(otn1Kpis)
                .Concat(otn2Kpis)
                .Concat(entKpis)
                .Concat(otherKpis)
                .Concat(sfKpis)
                .ToList();

            var enterpriseTargets = await _db.EnterpriseKpis.AsNoTracking()
                .ToDictionaryAsync(x => x.Id, x => x.KpiPercent ?? 0m);

            var otherTargets = await _db.OtherKpis.AsNoTracking()
                .ToDictionaryAsync(x => x.Id, x => x.KpiPercent ?? 0m);

            var daysInMonth = DateTime.DaysInMonth(year, month);
            var results = new List<OverallKpiResult>();
            var nowUtc = DateTime.UtcNow;

            // =========================================================
            // STEP 6: PROCESS EACH KPI DEFINITION
            // For each master KPI:
            // 1. Match platform KPI using fuzzy text matching
            // 2. Build area snapshots with calculated achieved values
            // 3. Allocate points based on node-weighted or equal-share method
            // 4. Calculate final points achieved using target-based scaling
            // =========================================================
            foreach (var kpi in kpis)
            {
                var matchedKpi = FindBestMatch(kpi.KeyPerformanceIndicators, allNamedKpis);
                var snapshots = BuildAreaSnapshots(matchedKpi, ipMetrics, bbMetrics, otn1Metrics, otn2Metrics, sfMetrics, entMetrics, otherMetrics, enterpriseTargets, otherTargets, daysInMonth);

                var areaSnapshots = normalizedAreas
                    .Select(area => (area, snapshot: FindSnapshotForArea(snapshots, NormalizeArea(area))))
                    .ToList();

                var snapshotNodeValues = snapshots.Values.ToList();
                bool hasNodeBasedWeight = snapshotNodeValues.Any(x => x.TotalNodes > 0m);
                decimal totalNodes = hasNodeBasedWeight
                    ? snapshotNodeValues.Sum(x => x.TotalNodes)
                    : 0m;
                decimal equalShare = normalizedAreas.Count > 0
                    ? (decimal)kpi.PointsApplicable / normalizedAreas.Count
                    : 0m;

                foreach (var (area, snapshot) in areaSnapshots)
                {
                    var achieved = Math.Round(Math.Clamp(snapshot?.Achieved ?? 0m, 0m, 100m), 4);
                    var maxPoints = hasNodeBasedWeight && totalNodes > 0m
                        ? Math.Round(((decimal)kpi.PointsApplicable * (snapshot?.TotalNodes ?? 0m)) / totalNodes, 4)
                        : Math.Round(equalShare, 4);
                    
                    // Calculate pointsAchieved based on target value
                    var targetValue = TryParseTargetValue(kpi.DescriptionOfKPI);
                    var pointsAchieved = snapshot?.NormalizedAchieved is decimal normalizedAchieved
                        ? Math.Round(maxPoints * normalizedAchieved, 4)
                        : CalculatePointsAchieved(maxPoints, achieved, targetValue);

                    results.Add(new OverallKpiResult
                    {
                        KpiCode = $"KPI-{kpi.Id}",
                        KpiDefinitionId = kpi.Id,
                        KpiName = kpi.KeyPerformanceIndicators,
                        Platform = kpi.Perspectives,
                        AreaCode = area,
                        TargetValue = targetValue,
                        AchievedKpi = achieved,
                        MaximumPointsPerKpi = maxPoints,
                        PointsAchieved = pointsAchieved,
                        Month = month,
                        Year = year,
                        CalculatedAt = nowUtc
                    });
                }
            }

            var overallPercentByArea = results
                .GroupBy(x => x.AreaCode, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    g => g.Key,
                    g =>
                    {
                        var totalMax = g.Sum(x => x.MaximumPointsPerKpi);
                        var totalAchieved = g.Sum(x => x.PointsAchieved);
                        return totalMax > 0m
                            ? Math.Round((totalAchieved / totalMax) * 100m, 4)
                            : 0m;
                    },
                    StringComparer.OrdinalIgnoreCase);

            foreach (var row in results)
            {
                if (overallPercentByArea.TryGetValue(row.AreaCode, out var percent))
                {
                    row.OverallKpiValuePercent = percent;
                }
            }

            var existing = await _db.OverallKpiResults
                .Where(x => x.Month == month && x.Year == year)
                .ToListAsync();

            if (existing.Any())
            {
                _db.OverallKpiResults.RemoveRange(existing);
            }

            _db.OverallKpiResults.AddRange(results);
            await _db.SaveChangesAsync();

            return results
                .OrderBy(x => x.KpiDefinitionId)
                .ThenBy(x => x.AreaCode)
                .ToList();
        }

        // =========================================================
        // AREA SNAPSHOT BUILDER
        // Constructs a dictionary of area codes to calculated achieved KPI values
        // Each platform uses different calculation methods:
        // - IP/BB: Availability = (TotalMinutes - UnavailableMinutes) / (24*60*days*nodes) * 100
        // - OTN Op1: Same availability calculation as IP/BB
        // - OTN Op2: SLA Ratio = LinksSlaNotViolated / TotalFailedLinks * 100
        // - Service Fulfilment: Direct KPI value (already calculated)
        // =========================================================
        private static Dictionary<string, AreaSnapshot> BuildAreaSnapshots(
            NamedKpi? matchedKpi,
            List<IpNwOpKpiMetric> ipMetrics,
            List<BbAnwKpiNode> bbMetrics,
            List<OtnOp1Metrics> otn1Metrics,
            List<OtnOp2Metrics> otn2Metrics,
            List<ServiceFulfilmentKpiMetric> sfMetrics,
            List<EnterpriseKpiMetric> entMetrics,
            List<OtherKpiMetric> otherMetrics,
            IReadOnlyDictionary<int, decimal> enterpriseTargets,
            IReadOnlyDictionary<int, decimal> otherTargets,
            int daysInMonth)
        {
            var result = new Dictionary<string, AreaSnapshot>();
            if (matchedKpi == null) return result;

            if (matchedKpi.Source == "ip")
            {
                foreach (var row in ipMetrics.Where(x => x.IpNwOpKpiId == matchedKpi.Id))
                {
                    var area = NormalizeArea(row.AreaCode);
                    if (area == string.Empty) continue;
                    var nodeWeight = GetIpNodeWeight(row, daysInMonth);
                    var achieved = CalculateAvailability(row.TotalMinutes, row.UnavailableMinutes, nodeWeight, daysInMonth);
                    result[area] = new AreaSnapshot(achieved, nodeWeight);
                }
                return result;
            }

            if (matchedKpi.Source == "bb")
            {
                foreach (var row in bbMetrics.Where(x => x.BbAnwKpiId == matchedKpi.Id))
                {
                    var area = NormalizeArea(row.NodeCode);
                    if (area == string.Empty) continue;
                    var achieved = CalculateAvailability(row.TotalMinutes, row.UnavailableMinutes, row.TotalNodes, daysInMonth);
                    result[area] = new AreaSnapshot(achieved, row.TotalNodes ?? 0);
                }
                return result;
            }

            if (matchedKpi.Source == "otn1")
            {
                foreach (var row in otn1Metrics.Where(x => x.OtnOp1Id == matchedKpi.Id))
                {
                    var area = NormalizeArea(row.Site);
                    if (area == string.Empty) continue;
                    var achieved = CalculateAvailability(row.TotalMinutes, row.UnavailableMinutes, row.TotalNodes, daysInMonth);
                    result[area] = new AreaSnapshot(achieved, row.TotalNodes);
                }
                return result;
            }

            if (matchedKpi.Source == "otn2")
            {
                foreach (var row in otn2Metrics.Where(x => x.OtnOp2Id == matchedKpi.Id))
                {
                    var area = NormalizeArea(row.Site);
                    if (area == string.Empty) continue;
                    var achieved = CalculateSlaRatio(row.TotalFailedLinks, row.LinksSlaNotViolated);
                    result[area] = new AreaSnapshot(achieved, row.TotalFailedLinks);
                }
                return result;
            }

            if (matchedKpi.Source == "ent")
            {
                var target = enterpriseTargets.TryGetValue(matchedKpi.Id, out var targetValue) ? targetValue : 0m;

                foreach (var row in entMetrics.Where(x => x.EnterpriseKpiId == matchedKpi.Id))
                {
                    var area = NormalizeArea(row.AreaCode);
                    if (area == string.Empty) continue;

                    var actual = row.KpiValue ?? 0m;
                    var normalized = CalculateEnterpriseOrOtherNormalized(matchedKpi.Name, actual, target);
                    result[area] = new AreaSnapshot(normalized * 100m, 0m, normalized);
                }

                return result;
            }

            if (matchedKpi.Source == "other")
            {
                var target = otherTargets.TryGetValue(matchedKpi.Id, out var targetValue) ? targetValue : 0m;

                foreach (var row in otherMetrics.Where(x => x.OtherKpiId == matchedKpi.Id))
                {
                    var area = NormalizeArea(row.AreaCode);
                    if (area == string.Empty) continue;

                    var actual = row.KpiValue ?? 0m;
                    var normalized = CalculateEnterpriseOrOtherNormalized(matchedKpi.Name, actual, target);
                    result[area] = new AreaSnapshot(normalized * 100m, 0m, normalized);
                }

                return result;
            }

            foreach (var row in sfMetrics.Where(x => x.ServiceFulfilmentKpiId == matchedKpi.Id))
            {
                var area = NormalizeArea(row.AreaCode);
                if (area == string.Empty) continue;
                var achieved = Math.Clamp(row.KpiValue ?? 0m, 0m, 100m);
                result[area] = new AreaSnapshot(achieved, 0);
            }
            return result;
        }

        // =========================================================
        // KPI MATCHING ALGORITHM
        // Finds best-matching platform KPI given a master KPI name
        // Uses fuzzy text matching with normalized scores:
        // - 100: Exact match (ignoring spaces/special chars)
        // - 85: Substring containment
        // - 0-84: Token overlap ratio (Jaccard similarity)
        // Minimum score threshold: 35 points
        // =========================================================
        private static NamedKpi? FindBestMatch(string kpiName, List<NamedKpi> sourceKpis)
        {
            var normalizedTarget = NormalizeText(kpiName);
            if (normalizedTarget == string.Empty) return null;

            NamedKpi? best = null;
            decimal bestScore = 0m;

            foreach (var candidate in sourceKpis)
            {
                var score = Score(normalizedTarget, NormalizeText(candidate.Name));
                if (score > bestScore)
                {
                    bestScore = score;
                    best = candidate;
                }
            }

            return bestScore >= 35m ? best : null;
        }

        // =========================================================
        // TEXT MATCHING SCORE
        // Calculates similarity score between target and candidate text
        // Scoring rules:
        // - 100: Exact match (ignoring spaces/special chars)
        // - 85: Substring match on both directions
        // - 0-84: Jaccard token overlap ratio * 100
        // Returns score as decimal (0-100)
        // =========================================================
        private static decimal Score(string target, string candidate)
        {
            if (target == string.Empty || candidate == string.Empty) return 0m;
            var targetCompact = target.Replace(" ", string.Empty);
            var candidateCompact = candidate.Replace(" ", string.Empty);

            if (targetCompact == candidateCompact) return 100m;
            if (targetCompact.Contains(candidateCompact) || candidateCompact.Contains(targetCompact)) return 85m;

            var targetTokens = Tokenize(target);
            var candidateTokens = Tokenize(candidate);
            if (!targetTokens.Any() || !candidateTokens.Any()) return 0m;

            var overlap = targetTokens.Intersect(candidateTokens).Count();
            if (overlap == 0) return 0m;

            var ratio = (decimal)(2 * overlap) / (targetTokens.Count + candidateTokens.Count);
            return ratio * 100m;
        }

        // =========================================================
        // FIND SNAPSHOT FOR AREA
        // Locates the AreaSnapshot for a given area code
        // First tries exact match, then partial match with longest common prefix
        // Handles area code variations and mappings
        // =========================================================
        private static AreaSnapshot? FindSnapshotForArea(Dictionary<string, AreaSnapshot> snapshots, string normalizedArea)
        {
            if (normalizedArea == string.Empty || snapshots.Count == 0) return null;
            if (snapshots.TryGetValue(normalizedArea, out var exact)) return exact;

            var partial = snapshots
                .Where(kv => kv.Key.Contains(normalizedArea) || normalizedArea.Contains(kv.Key))
                .OrderByDescending(kv => CommonPrefixLength(kv.Key, normalizedArea))
                .Select(kv => (AreaSnapshot?)kv.Value)
                .FirstOrDefault();

            return partial;
        }

        // =========================================================
        // COMMON PREFIX LENGTH
        // Calculates length of matching prefix between two strings
        // Used for partial area code matching to find best available data
        // =========================================================
        private static int CommonPrefixLength(string a, string b)
        {
            var len = Math.Min(a.Length, b.Length);
            int i = 0;
            while (i < len && a[i] == b[i]) i++;
            return i;
        }

        // =========================================================
        // AVAILABILITY CALCULATIONS (OVERLOADED)
        // Computes network availability percentage from minutes data
        // Formula: ((TotalMinutes - UnavailableMinutes) / (24*60*days*nodes)) * 100
        // Multiple overloads support different input types (long?, int?, decimal)
        // Clamped to 0-100 range
        // Returns 100% if denominator is 0 (no data available)
        // =========================================================
        private static decimal CalculateAvailability(long? totalMinutes, int? unavailableMinutes, int? totalNodes, int daysInMonth)
        {
            decimal tm = totalMinutes ?? 0;
            decimal um = unavailableMinutes ?? 0;
            decimal tn = totalNodes ?? 0;

            var denominator = 24m * 60m * daysInMonth * tn;
            if (denominator <= 0m) return 100m;

            var numerator = tm - um;
            var pct = (numerator / denominator) * 100m;
            return Math.Clamp(pct, 0m, 100m);
        }

        private static decimal CalculateAvailability(long? totalMinutes, int? unavailableMinutes, decimal totalNodes, int daysInMonth)
        {
            decimal tm = totalMinutes ?? 0;
            decimal um = unavailableMinutes ?? 0;
            decimal tn = totalNodes;

            var denominator = 24m * 60m * daysInMonth * tn;
            if (denominator <= 0m) return 100m;

            var numerator = tm - um;
            var pct = (numerator / denominator) * 100m;
            return Math.Clamp(pct, 0m, 100m);
        }

        private static decimal CalculateAvailability(int totalMinutes, int unavailableMinutes, int totalNodes, int daysInMonth)
            => CalculateAvailability((long)totalMinutes, unavailableMinutes, (int?)totalNodes, daysInMonth);
        // =========================================================
        // SLA RATIO CALCULATION
        // Calculates Service Level Agreement compliance ratio
        // Used for OTN Op2 (failed link SLA tracking)
        // Formula: (LinksSlaNotViolated / TotalFailedLinks) * 100
        // Returns 100% if no failed links reported
        // =========================================================
        private static decimal CalculateSlaRatio(int totalFailedLinks, int linksSlaNotViolated)
        {
            if (totalFailedLinks <= 0) return 100m;
            var pct = ((decimal)linksSlaNotViolated / totalFailedLinks) * 100m;
            return Math.Clamp(pct, 0m, 100m);
        }

        // =========================================================
        // TEXT NORMALIZATION HELPERS
        // NormalizeText: For KPI name matching (preserves spaces for tokenization)
        // NormalizeArea: For area code matching (compact representation, no spaces)
        // Removes special characters, converts to lowercase for comparison
        // =========================================================
        private static string NormalizeText(string value)
            => Regex.Replace(value ?? string.Empty, "[^A-Za-z0-9]+", " ").Trim().ToLowerInvariant();

        private static string NormalizeArea(string value)
            => Regex.Replace(value ?? string.Empty, "[^A-Za-z0-9]+", "").ToLowerInvariant();

        // =========================================================
        // TOKENIZATION FOR MATCHING
        // Splits normalized text into meaningful word tokens
        // Handles camelCase splitting (KPI -> k pi)
        // Filters out single-character tokens
        // Used for fuzzy KPI matching via token overlap
        // =========================================================
        private static List<string> Tokenize(string normalized)
        {
            var raw = Regex.Replace(normalized ?? string.Empty, "([a-z])([A-Z])", "$1 $2");
            return Regex.Split(raw, @"[^A-Za-z0-9]+")
                .Where(x => x.Trim().Length >= 2)
                .Select(x => x.Trim().ToLowerInvariant())
                .Distinct()
                .ToList();
        }

        // =========================================================
        // ENTITY TO DTO MAPPING
        // Converts OverallKpiResult entity to DTO for API response
        // Excludes internal fields like CalculatedAt
        // =========================================================
        private static OverallKpiResultDto ToDto(OverallKpiResult x) => new()
        {
            Id = x.Id,
            KpiDefinitionId = x.KpiDefinitionId,
            KpiName = x.KpiName,
            AreaCode = x.AreaCode,
            AchievedKpi = x.AchievedKpi,
            MaximumPointsPerKpi = x.MaximumPointsPerKpi,
            PointsAchieved = x.PointsAchieved,
            OverallKpiValuePercent = x.OverallKpiValuePercent,
            Month = x.Month,
            Year = x.Year
        };

        // =========================================================
        // HELPER RECORD TYPES
        // NamedKpi: Platform-specific KPI definition (source, id, name)
        // AreaSnapshot: Calculated KPI value and node weight for an area
        // =========================================================
        private sealed record NamedKpi(string Source, int Id, string Name);
        private sealed record AreaSnapshot(decimal Achieved, decimal TotalNodes, decimal? NormalizedAchieved = null);

        // =========================================================
        // POINT CALCULATION WITH TARGET-BASED SCALING
        // Calculates points achieved based on target value:
        // - No target: Linear scaling (points = maxPoints * achieved / 100)
        // - With target:
        //   * If achieved > target: Full maxPoints awarded
        //   * Otherwise: Scaled by ratio (points = maxPoints * achieved / target)
        // This provides incentive to exceed targets
        // =========================================================
        private static decimal CalculatePointsAchieved(decimal maxPoints, decimal achieved, decimal? targetValue)
        {
            // If no target value or target is 0 or negative, use simple linear scaling: points = maxPoints * achieved / 100
            if (!targetValue.HasValue || targetValue.Value <= 0)
            {
                return Math.Round((maxPoints * achieved) / 100m, 4);
            }

            // Target-based formula:
            // If achieved > target: pointsAchieved = maxPoints
            // Else: pointsAchieved = maxPoints * achieved / target
            var target = targetValue.Value;
            var points = achieved > target
                ? maxPoints
                : Math.Round((maxPoints * achieved) / target, 4);

            return points;
        }

        // =========================================================
        // TARGET VALUE EXTRACTION
        // Extracts numeric target value from KPI description text
        // Looks for first decimal number using regex pattern \d+(\.\d+)?
        // Returns null if no numeric value found
        // Example: "99.5% availability target" -> 99.5
        // =========================================================
        private static decimal? TryParseTargetValue(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;
            var m = Regex.Match(text, @"\d+(\.\d+)?");
            if (!m.Success) return null;
            return decimal.TryParse(m.Value, out var value) ? value : null;
        }

        private static decimal CalculateEnterpriseOrOtherNormalized(string kpiName, decimal actual, decimal target)
        {
            var normalizedName = NormalizeText(kpiName);

            if (normalizedName.Contains("fault clearance rate") || normalizedName.Contains("clearance rate"))
            {
                return actual > 0.9m ? 1m : actual / 0.9m;
            }

            if (target <= 0m)
            {
                return 0m;
            }

            return actual < target
                ? 1m
                : 1m - ((actual - target) / target);
        }

        // =========================================================
        // IP NODE WEIGHT CALCULATION
        // Determines node count for IP metrics when not provided
        // If TotalNodes is available, use directly
        // Otherwise, derive from TotalMinutes / minutes per node per month
        // Supports metric records with missing node counts
        // =========================================================
        private static decimal GetIpNodeWeight(IpNwOpKpiMetric row, int daysInMonth)
        {
            var nodes = (decimal)(row.TotalNodes ?? 0);
            if (nodes > 0m) return nodes;

            if (daysInMonth <= 0) return 0m;
            var totalMinutes = (decimal)(row.TotalMinutes ?? 0);
            if (totalMinutes <= 0m) return 0m;

            var minutesPerNode = 24m * 60m * daysInMonth;
            return totalMinutes / minutesPerNode;
        }
    }
}