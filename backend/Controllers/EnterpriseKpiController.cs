/*
 * File: EnterpriseKpiController.cs
 * CRUD endpoints for Enterprise KPI admin definitions.
 */

using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EnterpriseKpiController : ControllerBase
    {
        private readonly AppDbContext _db;

        public EnterpriseKpiController(AppDbContext db)
        {
            _db = db;
        }

        // GET all Enterprise KPI definitions
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EnterpriseKpiDto>>> GetAll()
        {
            var items = await _db.EnterpriseKpis
                .AsNoTracking()
                .OrderBy(x => x.Id)
                .Select(x => new EnterpriseKpiDto
                {
                    Id = x.Id,
                    NetworkEngineerKpi = x.NetworkEngineerKpi,
                    Division = x.Division,
                    Section = x.Section,
                    KpiPercent = x.KpiPercent
                })
                .ToListAsync();

            return Ok(items);
        }

        // GET by ID
        [HttpGet("{id:int}")]
        public async Task<ActionResult<EnterpriseKpiDto>> GetById(int id)
        {
            var item = await _db.EnterpriseKpis
                .AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new EnterpriseKpiDto
                {
                    Id = x.Id,
                    NetworkEngineerKpi = x.NetworkEngineerKpi,
                    Division = x.Division,
                    Section = x.Section,
                    KpiPercent = x.KpiPercent
                })
                .FirstOrDefaultAsync();

            if (item == null) return NotFound();
            return Ok(item);
        }

        // POST create
        [HttpPost]
        [Authorize(Policy = "AdminOnly")]
        public async Task<ActionResult<EnterpriseKpiDto>> Create([FromBody] CreateEnterpriseKpiDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.NetworkEngineerKpi))
                return BadRequest("NetworkEngineerKpi is required.");

            var entity = new EnterpriseKpi
            {
                NetworkEngineerKpi = dto.NetworkEngineerKpi.Trim(),
                Division = dto.Division,
                Section = dto.Section,
                KpiPercent = dto.KpiPercent
            };

            _db.EnterpriseKpis.Add(entity);
            await _db.SaveChangesAsync();

            var result = new EnterpriseKpiDto
            {
                Id = entity.Id,
                NetworkEngineerKpi = entity.NetworkEngineerKpi,
                Division = entity.Division,
                Section = entity.Section,
                KpiPercent = entity.KpiPercent
            };

            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, result);
        }

        // PUT update
        [HttpPut("{id:int}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateEnterpriseKpiDto dto)
        {
            var entity = await _db.EnterpriseKpis.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound();

            if (string.IsNullOrWhiteSpace(dto.NetworkEngineerKpi))
                return BadRequest("NetworkEngineerKpi is required.");

            entity.NetworkEngineerKpi = dto.NetworkEngineerKpi.Trim();
            entity.Division = dto.Division;
            entity.Section = dto.Section;
            entity.KpiPercent = dto.KpiPercent;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE
        [HttpDelete("{id:int}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _db.EnterpriseKpis.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound();

            _db.EnterpriseKpis.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
