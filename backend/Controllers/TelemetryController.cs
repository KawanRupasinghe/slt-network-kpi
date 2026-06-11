using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TelemetryController : ControllerBase
    {
        private readonly AppDbContext _db;

        public TelemetryController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? designation, [FromQuery] int? year, [FromQuery] int? month)
        {
            var q = _db.Telemetry.AsQueryable();
            if (!string.IsNullOrWhiteSpace(designation)) q = q.Where(x => x.Designation == designation);
            if (year.HasValue) q = q.Where(x => x.Year == year.Value);
            if (month.HasValue) q = q.Where(x => x.Month == month.Value);

            var list = await q.ToListAsync();
            return Ok(list);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _db.Telemetry.FindAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }
    }
}
