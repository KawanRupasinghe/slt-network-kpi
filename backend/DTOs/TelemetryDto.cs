namespace backend.DTOs
{
    public class TelemetryDto
    {
        public int Id { get; set; }
        public string Designation { get; set; } = null!;
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal Percentage { get; set; }
        public short? Node_Count { get; set; }

        // Joined from RegionData
        public string Region { get; set; } = string.Empty;
        public string Province { get; set; } = string.Empty;
        public string NetworkEngineer { get; set; } = string.Empty;
        public string FriendlyName { get; set; } = string.Empty;
    }
}
