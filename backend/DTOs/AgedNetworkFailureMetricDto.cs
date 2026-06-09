using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class AgedNetworkFailureMetricDto
    {
        public int Id { get; set; }
        public string AreaCode { get; set; } = string.Empty;
        public string PlatformType { get; set; } = string.Empty;
        public int HasUnavailability { get; set; }
        public byte Month { get; set; }
        public short Year { get; set; }
    }

    public class UpsertAgedNetworkFailureMetricDto
    {
        [Required, MaxLength(50)]
        public string AreaCode { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^(BB_ANW|OTN_OP|IP_NW_OP)$", ErrorMessage = "PlatformType must be BB_ANW, OTN_OP, or IP_NW_OP.")]
        public string PlatformType { get; set; } = string.Empty;

        [Range(0, 1)]
        public int HasUnavailability { get; set; }

        [Range(1, 12)]
        public byte Month { get; set; }

        [Range(2000, 2100)]
        public short Year { get; set; }
    }
}
