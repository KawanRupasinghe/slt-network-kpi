using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class AgedNetworkFailureMetricDto
    {
        public int Id { get; set; }
        public string AreaCode { get; set; } = string.Empty;
        public decimal Percentage { get; set; }
        public string Remarks { get; set; } = string.Empty;
        public byte Month { get; set; }
        public short Year { get; set; }
    }

    public class UpsertAgedNetworkFailureMetricDto
    {
        [Required, MaxLength(50)]
        public string AreaCode { get; set; } = string.Empty;

        [Range(0.00, 100.00)]
        public decimal Percentage { get; set; }

        [MaxLength(500)]
        public string Remarks { get; set; } = string.Empty;

        [Range(1, 12)]
        public byte Month { get; set; }

        [Range(2000, 2100)]
        public short Year { get; set; }
    }
}
