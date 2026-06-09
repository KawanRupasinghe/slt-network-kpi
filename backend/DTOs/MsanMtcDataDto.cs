using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class MsanMtcDataDto
    {
        public int Id { get; set; }
        public string Designation { get; set; } = string.Empty;
        public int Year { get; set; }
        public string Month { get; set; } = string.Empty;
        public int Scheduled { get; set; }
        public int Attended { get; set; }
        public int CumulativeSched { get; set; }
        public int CumulativeAchieved { get; set; }
    }

    public class UpsertMsanMtcDataDto
    {
        [Required, MaxLength(100)]
        public string Designation { get; set; } = string.Empty;

        [Range(2000, 2100)]
        public int Year { get; set; }

        [Required, MaxLength(10)]
        public string Month { get; set; } = string.Empty;

        [Range(0, int.MaxValue)]
        public int Scheduled { get; set; }

        [Range(0, int.MaxValue)]
        public int Attended { get; set; }
    }
}
