using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class AgedNetworkFailureMetric
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string AreaCode { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string PlatformType { get; set; } = string.Empty; // BB_ANW | OTN_OP | IP_NW_OP

        public bool HasUnavailability { get; set; }

        public int Month { get; set; }
        public int Year { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
