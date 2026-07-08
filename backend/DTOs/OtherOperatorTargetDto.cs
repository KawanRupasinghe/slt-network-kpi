using System.Text.Json.Serialization;

namespace backend.DTOs
{
    public class OtherOperatorTargetDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("otherOperatorKpiId")]
        public int OtherOperatorKpiId { get; set; }

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

    public class CreateOtherOperatorTargetDto
    {
        [JsonPropertyName("otherOperatorKpiId")]
        public int OtherOperatorKpiId { get; set; }

        [JsonPropertyName("section")]
        public string? Section { get; set; }

        [JsonPropertyName("month")]
        public byte Month { get; set; }

        [JsonPropertyName("year")]
        public short Year { get; set; }
    }
}
