using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    // Response DTO — returned by GET, POST, PUT
    public class KpiDefinitionDto
    {
        public int Id { get; set; }
        public string Perspectives { get; set; } = "";
        public string StrategicObjectives { get; set; } = "";
        public string KeyPerformanceIndicators { get; set; } = "";
        public string Unit { get; set; } = "";
        public string DescriptionOfKPI { get; set; } = "";
        public decimal Weightage { get; set; }
        public int PointsApplicable { get; set; }
        public int TotalPoints { get; set; }
        public string? Category { get; set; }
        public string? CreatedAt { get; set; }
        public string? UpdatedAt { get; set; }
    }

    // Request DTO — used for POST (create) and PUT (update) request bodies
    public class UpsertKpiDefinitionDto
    {
        [Required, MaxLength(50)]
        public string Perspectives { get; set; } = "";

        [Required, MaxLength(50)]
        public string StrategicObjectives { get; set; } = "";

        [Required, MaxLength(100)]
        public string KeyPerformanceIndicators { get; set; } = "";

        [Required, MaxLength(50)]
        public string Unit { get; set; } = "";

        [Required, MaxLength(50)]
        public string DescriptionOfKPI { get; set; } = "";

        [Range(0, 100000)]
        public int PointsApplicable { get; set; } = 0;

        [Range(1, 1000000)]
        public int? TotalPoints { get; set; }

        [MaxLength(50)]
        public string? Category { get; set; }
    }
}
