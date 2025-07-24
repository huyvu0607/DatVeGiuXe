using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParkingReservationSystem.Models;
using ParkingReservationSystem.ViewModels;
using System.Diagnostics;

namespace ParkingReservationSystem.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly ParkingDbContext _context;

        public HomeController(ILogger<HomeController> logger, ParkingDbContext context)
        {
            _logger = logger;
            _context = context;
        }

        //hàm dọn slot khi hết hạn thanh toán 
        private void ClearExpiredReservations()
        {
            var now = DateTime.Now;
            var expiredReservations = _context.Reservations
                .Where(r => !r.IsConfirmed && r.ExpiresAt <= now)
                .ToList();

            foreach (var reservation in expiredReservations)
            {
                var slot = _context.ParkingSlots.FirstOrDefault(s => s.SlotCode == reservation.SlotCode);
                if (slot != null)
                {
                    slot.IsAvailable = true;
                }

                _context.Reservations.Remove(reservation);
            }

            _context.SaveChanges();
        }
      
        public IActionResult Index()
        {
            ClearExpiredReservations(); // Dọn dẹp các reservation hết hạn
            var slots = _context.ParkingSlots.ToList();

            var viewModel = slots.Select(s => new ParkingSlotViewModel
            {
                SlotCode = s.SlotCode,
                IsConfirmed = !s.IsAvailable, // slot đã bị giữ
                IsSelected = false // mặc định chưa chọn
            }).ToList();
            
            return View(viewModel);
        }


        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
        public IActionResult History()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return RedirectToAction("Login", "Account");

            var history = _context.Reservations
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.ReservedAt)
                .ToList();

            return View(history);
        }

       
    }
}
