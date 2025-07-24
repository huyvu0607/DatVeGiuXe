using Microsoft.AspNetCore.Mvc;
using ParkingReservationSystem.Models;
using ParkingReservationSystem.ViewModels;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ParkingReservationSystem.Controllers
{
    public class ReservationController : Controller
    {
        private readonly ParkingDbContext _context;

        public ReservationController(ParkingDbContext context)
        {
            _context = context;
        }

        public IActionResult History()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            var reservations = _context.Reservations
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.ReservedAt)
                .Select(r => new ReservationHistoryViewModel
                {
                    Id = r.Id,
                    SlotCode = r.SlotCode,
                    ReservedAt = r.ReservedAt,
                    ExpiresAt = r.ExpiresAt,
                    IsConfirmed = r.IsConfirmed
                })
                .ToList();

            return View(reservations);
        }

        [HttpGet]
        public IActionResult CancelMultipleReservation()
        {
            if (TempData["ReservationIds"] is string idsStr && !string.IsNullOrEmpty(idsStr))
            {
                var ids = idsStr.Split(',').Select(int.Parse).ToList();

                var reservations = _context.Reservations
                    .Where(r => ids.Contains(r.Id))
                    .ToList();

                foreach (var res in reservations)
                {

                    var slot = _context.ParkingSlots.FirstOrDefault(s => s.SlotCode == res.SlotCode);
                    if (slot != null)
                    {
                        slot.IsAvailable = true;
                        _context.ParkingSlots.Update(slot);
                    }

                    // Huỷ luôn để test
                    _context.Reservations.Remove(res);
                }
                var affected = _context.SaveChanges();
  
            }

            return RedirectToAction("Index", "Home");
        }




    }
}
