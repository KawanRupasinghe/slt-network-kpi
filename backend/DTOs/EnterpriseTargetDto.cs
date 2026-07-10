using System.Text.Json.Serialization;

namespace backend.DTOs
{
    public class EnterpriseTargetDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("enterpriseKpiId")]
        public int EnterpriseKpiId { get; set; }

        [JsonPropertyName("networkEngineerKpi")]
        public string? NetworkEngineerKpi { get; set; }

        [JsonPropertyName("division")]
        public string? Division { get; set; }

        [JsonPropertyName("section")]
        public string? Section { get; set; }

        [JsonPropertyName("month")]
        public byte Month { get; set; }

        [JsonPropertyName("year")]
        public short Year { get; set; }
    }

    public class CreateEnterpriseTargetDto
    {
        [JsonPropertyName("enterpriseKpiId")]
        public int EnterpriseKpiId { get; set; }

        [JsonPropertyName("section")]
        public string? Section { get; set; }

        [JsonPropertyName("month")]
        public byte Month { get; set; }

        [JsonPropertyName("year")]
        public short Year { get; set; }
    }
}
