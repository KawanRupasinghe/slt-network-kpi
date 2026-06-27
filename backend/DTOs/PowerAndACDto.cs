namespace backend.DTOs
{
    public class PowerAndACDto
    {
        public int Id { get; set; }
        public string Designation { get; set; } = null!;
        public int Year { get; set; }
        public int Month { get; set; }
        public int Scheduled { get; set; }
        public int Attended { get; set; }
        public int Cumulative_Sched { get; set; }
        public int Cumulative_Achieved { get; set; }
    }
}
