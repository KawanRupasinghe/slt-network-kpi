namespace backend.DTOs
{
    public class PlatformDetailDto
    {
        // First column: identifier or key value

        public object? Column2 { get; set; }
        public object? Column3 { get; set; }
        public int Id { get; set; }
        public bool IsVerified { get; set; }
        public int Scheduled { get; set; }
        public int Attended { get; set; }
        public int CumulativeSched { get; set; }
        public int CumulativeAchieved { get; set; }
    }
}
