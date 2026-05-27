/*
 * File: OtherKpiDto.cs
 * DTO for Other KPI records.
 */

namespace backend.DTOs
{
    public class OtherKpiDto
    {
        public int Id { get; set; }
        public string NetworkEngineerKpi { get; set; } = string.Empty;
        public string? Division { get; set; }
        public string? Section { get; set; }
        public decimal? KpiPercent { get; set; }
    }
}
