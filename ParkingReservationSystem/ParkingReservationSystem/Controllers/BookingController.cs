using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParkingReservationSystem.Models;
using ParkingReservationSystem.ViewModels;

namespace ParkingReservationSystem.Controllers
{
    public class BookingController : Controller
    {
        private readonly ParkingDbContext _context;
        public BookingController(ParkingDbContext context)
        {
            _context = context;
        }



        [HttpPost]
        public IActionResult Hold(string slotCode, string email, string phone, string name)
        {
            var slot = _context.ParkingSlots.FirstOrDefault(s => s.SlotCode == slotCode && s.IsAvailable == true);
            if (slot == null)
                return BadRequest("Slot is not available.");

            // Nếu đã đăng nhập, dùng email từ session
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId != null)
            {
                email = HttpContext.Session.GetString("UserEmail");
            }

            var now = DateTime.Now;
            var reservation = new Reservation
            {
                SlotCode = slotCode,
                Name = name,
                Email = email,
                Phone = phone,
                ReservedAt = now,
                ExpiresAt = now.AddMinutes(10),
                IsConfirmed = false,
                UserId = userId // nếu đăng nhập thì gán vào
            };

            slot.IsAvailable = false;
            _context.Reservations.Add(reservation);
            _context.SaveChanges();

            return RedirectToAction("ThanhToan", new { id = reservation.Id });
        }


        [HttpPost]
        public IActionResult Confirm(int reservationId)
        {
            // Sau khi thanh toán thành công
            var reservation = _context.Reservations
            .Include(r => r.ParkingSlot) // bây giờ dùng đúng tên navigation
            .FirstOrDefault(r => r.Id == reservationId);

            if (reservation == null)
                return NotFound("Reservation not found.");

            if (reservation.IsConfirmed)
                return Ok("Already confirmed.");

            if (reservation.ExpiresAt < DateTime.Now)
            {
                // Hết hạn – huỷ giữ chỗ
                var slot = _context.ParkingSlots.FirstOrDefault(s => s.SlotCode == reservation.SlotCode);
                if (slot != null) slot.IsAvailable = true;

                _context.Reservations.Remove(reservation);
                _context.SaveChanges();

                return BadRequest("Reservation expired.");
            }

            reservation.IsConfirmed = true;
            _context.SaveChanges();

            return RedirectToAction("Index", "Home", new { success = true });
        }

        [HttpGet]
        public IActionResult ThanhToan(int id)
        {
            var reservation = _context.Reservations.FirstOrDefault(r => r.Id == id);
            if (reservation == null) return NotFound();

            return View(reservation);
        }


        [HttpPost]
        public IActionResult HoldMultiple(List<string> selectedSlots, string name, string email, string phone)
        {
            if (selectedSlots == null || !selectedSlots.Any())
                return RedirectToAction("Index", new { error = "Bạn chưa chọn chỗ nào." });

            var userId = HttpContext.Session.GetInt32("UserId");
            var now = DateTime.Now;
            var reservationIds = new List<int>();

            foreach (var code in selectedSlots)
            {
                var slot = _context.ParkingSlots.FirstOrDefault(s => s.SlotCode == code && s.IsAvailable);
                if (slot != null)
                {
                    slot.IsAvailable = false;

                    var reservation = new Reservation
                    { 
                        SlotCode = slot.SlotCode,
                        Name = name,
                        Email = email,
                        Phone = phone,
                        ReservedAt = now,
                        ExpiresAt = now.AddMinutes(10),
                        IsConfirmed = false
                    };

                    // Nếu có đăng nhập thì mới gán UserId
                    if (userId != null)
                    {
                        reservation.UserId = userId;
                    }
                    _context.Reservations.Add(reservation);
                    _context.SaveChanges();

                    reservationIds.Add(reservation.Id);
                }
            }

            if (reservationIds.Any())
            {
                TempData["ReservationIds"] = string.Join(",", reservationIds); // Lưu danh sách ID dạng chuỗi
                return RedirectToAction("ThanhToanNhieu"); // chuyển sang action mới
            }

            return RedirectToAction("Index", new { error = "Không thể giữ chỗ nào cả." });
        }

        [HttpGet]
        public IActionResult ThanhToanNhieu()
        {
            if (TempData["ReservationIds"] == null)
                return RedirectToAction("Index");

            // Giữ lại cho lần request kế tiếp
            TempData.Keep("ReservationIds");

            var idsStr = TempData["ReservationIds"].ToString();
            var ids = idsStr.Split(',').Select(int.Parse).ToList();

            var reservations = _context.Reservations
                .Where(r => ids.Contains(r.Id))
                .ToList();

            return View(reservations);
        }


        [HttpPost]
        public IActionResult ConfirmMultiple(List<int> reservationIds)
        {
            var now = DateTime.Now;

            var reservations = _context.Reservations
                .Include(r => r.ParkingSlot)
                .Where(r => reservationIds.Contains(r.Id))
                .ToList();

            foreach (var res in reservations)
            {
                if (res.IsConfirmed || res.ExpiresAt < now)
                {
                    // Nếu đã hết hạn thì mở lại chỗ
                    var slot = _context.ParkingSlots.FirstOrDefault(s => s.SlotCode == res.SlotCode);
                    if (slot != null) slot.IsAvailable = true;

                    _context.Reservations.Remove(res);
                }
                else
                {
                    res.IsConfirmed = true;
                }
            }

            _context.SaveChanges();
            return RedirectToAction("Index","Home", new { success = true });
        }


    }
}
