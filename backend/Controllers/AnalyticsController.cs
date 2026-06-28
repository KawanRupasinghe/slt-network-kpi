using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/analytics")]
    [Authorize]
    public class AnalyticsController : ControllerBase
    {
        private readonly AnalyticsService _analyticsService;

        public AnalyticsController(AnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        [HttpGet]
        public async Task<ActionResult<List<AnalyticsResultDto>>> GetCumulativeAnalytics(
            [FromQuery] short year,
            [FromQuery] byte startMonth,
            [FromQuery] byte endMonth)
        {
            if (startMonth > endMonth)
            {
                return BadRequest("Start month must be less than or equal to end month.");
            }

            var results = await _analyticsService.GetCumulativeAnalyticsAsync(year, startMonth, endMonth);
            return Ok(results);
        }
    }
}
