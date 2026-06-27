using backend.Data;
using backend.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PowerAndACController : ControllerBase
    {
        private readonly AppDbContext _db;

        public PowerAndACController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? year, [FromQuery] int? month)
        {
            var q = _db.PowerAndAC.AsNoTracking();
            if (year.HasValue) q = q.Where(x => x.Year == year.Value);
            if (month.HasValue) q = q.Where(x => x.Month == month.Value);

            var list = await q.OrderBy(x => x.Month).ThenBy(x => x.Designation).ToListAsync();

            var result = list.Select(p => new PowerAndACDto
            {
                Id = p.Id,
                Designation = p.Designation,
                Year = p.Year,
                Month = p.Month,
                Scheduled = p.Scheduled,
                Attended = p.Attended,
                Cumulative_Sched = p.Cumulative_Sched,
                Cumulative_Achieved = p.Cumulative_Achieved
            });

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _db.PowerAndAC.FindAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }
    }
}
