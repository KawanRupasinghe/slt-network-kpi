/*
 * File: CreateOtherKpiDto.cs
 * DTO for creating/updating Other KPI records.
 */

using System.Text.Json.Serialization;

namespace backend.DTOs
{
    public class CreateOtherKpiDto
    {
        [JsonPropertyName("networkEngineerKpi")]
        public string NetworkEngineerKpi { get; set; } = string.Empty;

        [JsonPropertyName("division")]
        public string? Division { get; set; }

        [JsonPropertyName("section")]
        public string? Section { get; set; }

        [JsonPropertyName("kpiPercent")]
        public decimal? KpiPercent { get; set; }
    }
}
