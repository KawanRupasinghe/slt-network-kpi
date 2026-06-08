using System;
using System.Text.Json.Serialization;

namespace backend.DTOs
{
    public class OtherOperatorKpiMetricDto
    {
        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("otherOperatorKpiId")]
        public int OtherOperatorKpiId { get; set; }

        [JsonPropertyName("otherKpiId")]
        public int OtherKpiId
        {
            get => OtherOperatorKpiId;
            set => OtherOperatorKpiId = value;
        }

        [JsonPropertyName("networkEngineerKpi")]
        public string? NetworkEngineerKpi { get; set; }

        [JsonPropertyName("division")]
        public string? Division { get; set; }

        [JsonPropertyName("section")]
        public string? Section { get; set; }

        [JsonPropertyName("kpiPercent")]
        public decimal? KpiPercent { get; set; }

        [JsonPropertyName("site")]
        public string? Site { get; set; }

        [JsonPropertyName("kpiValue")]
        public decimal? KpiValue { get; set; }

        [JsonPropertyName("month")]
        public byte Month { get; set; }

        [JsonPropertyName("year")]
        public short Year { get; set; }
    }
}
