/*
 * File: KpiDefinitionDto.cs
 * Data Transfer Object representing KPI definitions with perspectives,
 * strategic objectives, and weightage information.
 */

namespace backend.DTOs
{
    // =========================================================
    // KPI DEFINITION DTO
    // Contains KPI definition data including perspectives and weightage
    // =========================================================
    public class KpiDefinitionDto
    {
        // Unique identifier for the KPI definition
        public int Id { get; set; }

        // Balanced scorecard perspectives
        public string Perspectives { get; set; } = "";

        // Strategic objectives related to the KPI
        public string StrategicObjectives { get; set; } = "";

        // Key performance indicators description
        public string KeyPerformanceIndicators { get; set; } = "";

        // Unit of measurement for the KPI
        public string Unit { get; set; } = "";

        // Detailed description of the KPI
        public string DescriptionOfKPI { get; set; } = "";

        // Weightage percentage for the KPI (decimal with 4 decimal places)
        public decimal Weightage { get; set; }

        // Maximum points applicable for this KPI
        public int PointsApplicable { get; set; }

        // Total points used for KPI weightage calculation
        public int TotalPoints { get; set; }

        // Timestamp when the KPI definition was created
        public string? CreatedAt { get; set; }

        // Timestamp when the KPI definition was last updated
        public string? UpdatedAt { get; set; }

        // Month for which this KPI definition applies
        public int Month { get; set; }

        // Year for which this KPI definition applies
        public int Year { get; set; }
    }
}
