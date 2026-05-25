/*
 * File: UpsertKpiDefinitionDto.cs
 * Data Transfer Object for creating or updating KPI definitions.
 */

using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    // =========================================================
    // UPSERT KPI DEFINITION DTO
    // Used for both creating and updating KPI definitions
    // =========================================================
    public class UpsertKpiDefinitionDto
    {
        // Balanced scorecard perspectives (required)
        [Required]
        public string Perspectives { get; set; } = "";

        // Strategic objectives related to the KPI (required)
        [Required]
        public string StrategicObjectives { get; set; } = "";

        // Key performance indicators description (required)
        [Required]
        public string KeyPerformanceIndicators { get; set; } = "";

        // Unit of measurement for the KPI (required)
        [Required]
        public string Unit { get; set; } = "";

        // Detailed description of the KPI (required)
        [Required]
        public string DescriptionOfKPI { get; set; } = "";

        // Maximum points applicable for this KPI (range 0-100000)
        [Range(0, 100000)]
        public int PointsApplicable { get; set; } = 0;

        // Total points used for weightage calculation (optional; defaults to 36000)
        [Range(1, 1000000)]
        public int? TotalPoints { get; set; }

        // Month for which this KPI applies (range 1-12, optional)
        [Range(1, 12)]
        public int? Month { get; set; }

        // Year for which this KPI applies (range 2000-2100, optional)
        [Range(2000, 2100)]
        public int? Year { get; set; }
    }
}
