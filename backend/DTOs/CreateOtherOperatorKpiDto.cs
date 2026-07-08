using System.Text.Json.Serialization;

namespace backend.DTOs
{
    public class CreateOtherOperatorKpiDto
    {
        [JsonPropertyName("networkEngineerKpi")]
        public string NetworkEngineerKpi { get; set; } = string.Empty;

        [JsonPropertyName("division")]
        public string? Division { get; set; }
    }
}
