using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("OtherOperatorKpiMetrics")]
    public class OtherOperatorKpiMetric
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int OtherOperatorKpiId { get; set; }

        public string? Site { get; set; }

        public int? TotalFaults { get; set; }

        public int? FaultsWithinSla { get; set; }

        public int? RepeatedFaults { get; set; }

        public int? TotalCustomers { get; set; }

        public int? TotalClearanceFaults { get; set; }

        public int? ClearedWithin4Hrs { get; set; }

        public short Year { get; set; }

        public byte Month { get; set; }

        [ForeignKey(nameof(OtherOperatorKpiId))]
        public OtherOperatorKpi? OtherOperatorKpi { get; set; }
    }
}
