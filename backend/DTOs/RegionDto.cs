/*
 * File: RegionDto.cs
 * Data Transfer Object representing region information.
 */

namespace backend.DTOs
{
    public class RegionDto
    {
        public int Id { get; set; }
        public string Region { get; set; } = string.Empty;
        public string Province { get; set; } = string.Empty;
        public string NetworkEngineer { get; set; } = string.Empty;
        public string EngName { get; set; } = string.Empty;
        public string LeaCode { get; set; } = string.Empty;
    }
}

