/*
 * File: CreateEnterpriseKpiDto.cs
 * DTO for creating/updating Enterprise KPI records.
 */

namespace backend.DTOs
{
    public class CreateEnterpriseKpiDto
    {
        public string NetworkEngineerKpi { get; set; } = string.Empty;
        public string? Division { get; set; }
        public string? Section { get; set; }
        public decimal? KpiPercent { get; set; }
    }
}
