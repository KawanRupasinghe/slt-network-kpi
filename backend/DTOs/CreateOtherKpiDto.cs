/*
 * File: CreateOtherKpiDto.cs
 * DTO for creating/updating Other KPI records.
 */

namespace backend.DTOs
{
    public class CreateOtherKpiDto
    {
        public string NetworkEngineerKpi { get; set; } = string.Empty;
        public string? Division { get; set; }
        public string? Section { get; set; }
        public decimal? KpiPercent { get; set; }
    }
}
