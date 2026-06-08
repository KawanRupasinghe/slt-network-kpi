namespace backend.DTOs
{
    public class EnterpriseKpiMetricDto
    {
        public int EnterpriseKpiId { get; set; }
        public string Site { get; set; } = string.Empty;
        public string? AreaCode { get; set; }
        public decimal? KpiValue { get; set; }
        public byte Month { get; set; }
        public short Year { get; set; }
    }
}
