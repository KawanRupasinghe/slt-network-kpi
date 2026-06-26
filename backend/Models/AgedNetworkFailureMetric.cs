using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    public class AgedNetworkFailureMetric
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string AreaCode { get; set; } = string.Empty;

        public int Month { get; set; }
        public int Year { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal Percentage { get; set; }

        [MaxLength(500)]
        public string Remarks { get; set; } = string.Empty;
    }
}
