/*
 * File: EnterpriseKpiDto.cs
 * DTO for Enterprise KPI records.
 */

namespace backend.DTOs
{
    public class EnterpriseKpiDto
    {
        public int Id { get; set; }
        public string NetworkEngineerKpi { get; set; } = string.Empty;
        public string? Division { get; set; }
        public string? Section { get; set; }
        public decimal? KpiPercent { get; set; }
    }
}
