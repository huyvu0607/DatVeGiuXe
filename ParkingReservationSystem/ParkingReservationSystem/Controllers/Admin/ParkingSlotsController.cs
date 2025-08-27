using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ParkingReservationSystem.Hubs;
using ParkingReservationSystem.Models;

namespace ParkingReservationSystem.Controllers.Admin
{
    [Authorize(Roles = "Admin")]
    public class ParkingSlotsController : Controller
    {
        private readonly ParkingDbContext _context;
        private readonly IHubContext<ParkingHub> _hubContext;
        public ParkingSlotsController(ParkingDbContext context, IHubContext<ParkingHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;

        }

        // GET: ParkingSlots
        public async Task<IActionResult> Index()
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");
            return View(await _context.ParkingSlots.ToListAsync());
        }

        // GET: ParkingSlots/Details/5
        public async Task<IActionResult> Details(int? id)
        {

            // Kiểm tra quyền truy cập
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");
            if (id == null)
            {
                return NotFound();
            }

            var parkingSlot = await _context.ParkingSlots
                .FirstOrDefaultAsync(m => m.Id == id);
            if (parkingSlot == null)
            {
                return NotFound();
            }

            return View(parkingSlot);
        }

        // GET: ParkingSlots/Create
        public IActionResult Create()
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");
            return View();
        }

        // POST: ParkingSlots/Create
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("Id,SlotCode,IsAvailable,Floor")] ParkingSlot parkingSlot)
        {
            if (ModelState.IsValid)
            {
                parkingSlot.IsAvailable = true;
                _context.Add(parkingSlot);
                await _context.SaveChangesAsync();

                // Gửi thông báo realtime
                await _hubContext.Clients.All.SendAsync("ReceiveSlotUpdate", "created", parkingSlot);

                return RedirectToAction(nameof(Index));
            }
            return View(parkingSlot);
        }

        // GET: ParkingSlots/Edit/5
        public async Task<IActionResult> Edit(int? id)
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");
            if (id == null)
            {
                return NotFound();
            }

            var parkingSlot = await _context.ParkingSlots.FindAsync(id);
            if (parkingSlot == null)
            {
                return NotFound();
            }
            return View(parkingSlot);
        }

        // POST: ParkingSlots/Edit/5
        // To protect from overposting attacks, enable the specific properties you want to bind to.
        // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, [Bind("Id,SlotCode,IsAvailable,Floor")] ParkingSlot parkingSlot)
        {
            if (id != parkingSlot.Id)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    _context.Update(parkingSlot);
                    await _context.SaveChangesAsync();
                    // Gửi thông báo realtime
                    await _hubContext.Clients.All.SendAsync("ReceiveSlotUpdate", "updated", parkingSlot);
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!ParkingSlotExists(parkingSlot.Id))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
                return RedirectToAction(nameof(Index));
            }
            return View(parkingSlot);
        }

        // GET: ParkingSlots/Delete/5
        public async Task<IActionResult> Delete(int? id)
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");
            if (id == null)
            {
                return NotFound();
            }

            var parkingSlot = await _context.ParkingSlots
                .FirstOrDefaultAsync(m => m.Id == id);
            if (parkingSlot == null)
            {
                return NotFound();
            }

            return View(parkingSlot);
        }

        // POST: ParkingSlots/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var parkingSlot = await _context.ParkingSlots.FindAsync(id);
            if (parkingSlot != null)
            {
                _context.ParkingSlots.Remove(parkingSlot);
                await _hubContext.Clients.All.SendAsync("ReceiveSlotUpdate", "deleted", parkingSlot);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        private bool ParkingSlotExists(int id)
        {
            return _context.ParkingSlots.Any(e => e.Id == id);
        }
    }
}
