namespace backend.DTOs
{
    public class UpsertOtherKpiMetricDto
    {
        public int OtherKpiId { get; set; }
        public string? AreaCode { get; set; }
        public string? Site { get; set; }
        public decimal? KpiValue { get; set; }

        public int? TotalFaults { get; set; }
        public int? FaultsWithinSla { get; set; }
        public int? RepeatedFaults { get; set; }
        public int? TotalCustomers { get; set; }
        public int? TotalClearanceFaults { get; set; }
        public int? ClearedWithin4Hrs { get; set; }

        public byte Month { get; set; }
        public short Year { get; set; }
    }
}
