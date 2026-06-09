using System;
using System.Text.Json.Serialization;

namespace backend.DTOs
{
    public class OtherKpiMetricDto
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("otherKpiId")]
        public int OtherKpiId { get; set; }

        [JsonPropertyName("networkEngineerKpi")]
        public string? NetworkEngineerKpi { get; set; }

        [JsonPropertyName("division")]
        public string? Division { get; set; }

        [JsonPropertyName("section")]
        public string? Section { get; set; }

        [JsonPropertyName("kpiPercent")]
        public decimal? KpiPercent { get; set; }

        [JsonPropertyName("areaCode")]
        public string AreaCode { get; set; } = string.Empty;

        [JsonPropertyName("site")]
        public string Site { get; set; } = string.Empty;

        [JsonPropertyName("totalFaults")]
        public int? TotalFaults { get; set; }

        [JsonPropertyName("faultsWithinSla")]
        public int? FaultsWithinSla { get; set; }

        [JsonPropertyName("repeatedFaults")]
        public int? RepeatedFaults { get; set; }

        [JsonPropertyName("totalCustomers")]
        public int? TotalCustomers { get; set; }

        [JsonPropertyName("totalClearanceFaults")]
        public int? TotalClearanceFaults { get; set; }

        [JsonPropertyName("clearedWithin4Hrs")]
        public int? ClearedWithin4Hrs { get; set; }

        [JsonPropertyName("kpiValue")]
        public decimal? KpiValue { get; set; }

        [JsonPropertyName("month")]
        public int Month { get; set; }

        [JsonPropertyName("year")]
        public int Year { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
    }
}
