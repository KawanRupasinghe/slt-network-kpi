namespace backend.DTOs
{
    public class AnalyticsResultDto
    {
        public int KpiDefinitionId { get; set; }
        public string? KpiName { get; set; }
        public string AreaCode { get; set; } = string.Empty;
        
        public decimal AchievedKpi { get; set; }
        public decimal MaximumPointsPerKpi { get; set; }
        public decimal PointsAchieved { get; set; }
        public decimal OverallKpiValuePercent { get; set; }
        
        public short Year { get; set; }
    }
}
