using System.Text.Json.Serialization;

namespace backend.DTOs
{
    public class EnterpriseKpiMetricDto
    {
        [JsonPropertyName("enterpriseKpiId")]
        public int EnterpriseKpiId { get; set; }

        [JsonPropertyName("site")]
        public string Site { get; set; } = string.Empty;

        [JsonPropertyName("areaCode")]
        public string? AreaCode { get; set; }

        [JsonPropertyName("kpiValue")]
        public decimal? KpiValue { get; set; }

        [JsonPropertyName("month")]
        public int Month { get; set; }

        [JsonPropertyName("year")]
        public int Year { get; set; }
    }
}
