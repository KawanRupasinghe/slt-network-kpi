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

        public int HasUnavailability { get; set; } // 0 or 1

        public byte Month { get; set; }
        public short Year { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
