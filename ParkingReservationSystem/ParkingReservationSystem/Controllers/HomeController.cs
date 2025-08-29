using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParkingReservationSystem.Models;
using ParkingReservationSystem.ViewModels;
using System.Diagnostics;
using ParkingReservationSystem.ViewModels.User;

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

        [HttpPost]
        public async Task<IActionResult> UpdateProfile(UpdateProfileViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return Json(new { success = false, message = "Dữ liệu không hợp lệ" });
            }

            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null)
            {
                return Json(new { success = false, message = "Phiên đăng nhập hết hạn" });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return Json(new { success = false, message = "Không tìm thấy người dùng" });
            }

            // Cập nhật thông tin
            user.Name = model.FullName;
            user.Email = model.Email;
            user.Phone = model.Phone;
            user.Address = model.Address;


            try
            {
                await _context.SaveChangesAsync();

                // Cập nhật session
                HttpContext.Session.SetString("UserName", user.Name ?? "");
                HttpContext.Session.SetString("UserEmail", user.Email);
                HttpContext.Session.SetString("UserPhone", user.Phone ?? "");

                return Json(new { success = true, message = "Cập nhật thành công" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Có lỗi xảy ra khi cập nhật" });
            }
        }
        [HttpGet]
        public async Task<IActionResult> GetUserProfile()
        {
            try
            {
                var userId = HttpContext.Session.GetInt32("UserId");
                if (userId == null)
                {
                    return Json(new { success = false, message = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." });
                }

                var user = await _context.Users.FindAsync(userId.Value);
                if (user == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy thông tin người dùng." });
                }

                var userData = new
                {
                    name = user.Name ?? "",
                    email = user.Email ?? "",
                    phone = user.Phone ?? "",
                    address = user.Address ?? ""
                };

                return Json(new { success = true, user = userData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy thông tin profile người dùng.");
                return Json(new { success = false, message = "Có lỗi xảy ra khi tải thông tin. Vui lòng thử lại." });
            }
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
                IsSelected = false, // mặc định chưa chọn
                Floor = s.Floor //số tầng   
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
