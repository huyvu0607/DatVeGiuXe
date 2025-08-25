using Microsoft.AspNetCore.Mvc;
using ParkingReservationSystem.Models;
using ParkingReservationSystem.ViewModels;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using QRCoder;
using Microsoft.AspNetCore.SignalR;

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

        public IActionResult Details(int id)
        {
            var reservation = _context.Reservations
                .Include(r => r.ParkingSlot)
                .FirstOrDefault(r => r.Id == id);

            if (reservation == null)
            {
                return NotFound();
            }

            // Tạo nội dung QR
            string qrContent = $"Mã chỗ: {reservation.SlotCode}\n";

            using (QRCodeGenerator qrGenerator = new QRCodeGenerator())
            using (QRCodeData qrCodeData = qrGenerator.CreateQrCode(qrContent, QRCodeGenerator.ECCLevel.Q))
            {
                var qrCode = new PngByteQRCode(qrCodeData);  // KHÔNG dùng QRCode (bitmap)
                byte[] qrBytes = qrCode.GetGraphic(20);
                ViewBag.QRCode = "data:image/png;base64," + Convert.ToBase64String(qrBytes);
            }

            return View(reservation);
        }
        [HttpPost]
        public async Task<IActionResult> ConfirmMultiple(List<int> reservationIds)
        {
            try
            {
                if (reservationIds == null || !reservationIds.Any())
                {
                    TempData["ErrorMessage"] = "Không có đặt chỗ nào để xác nhận.";
                    return RedirectToAction("Index", "Home");
                }

                // Lấy thông tin reservations
                var reservations = _context.Reservations
                    .Where(r => reservationIds.Contains(r.Id))
                    .ToList();

                if (!reservations.Any())
                {
                    TempData["ErrorMessage"] = "Không tìm thấy đặt chỗ cần xác nhận.";
                    return RedirectToAction("Index", "Home");
                }

                var slotCodes = reservations.Select(r => r.SlotCode).ToList();
                var customerName = reservations.First().Name;

                // Xác nhận đặt chỗ
                foreach (var reservation in reservations)
                {
                    reservation.IsConfirmed = true;
                    _context.Reservations.Update(reservation);
                }

                var affected = _context.SaveChanges();
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi xác nhận: " + ex.Message;
            }

            return RedirectToAction("Index", "Home");
        }

        // THÊM MỚI: Phương thức để hiển thị trang thanh toán
        public IActionResult PaymentMultiple(List<int> reservationIds)
        {
            if (reservationIds == null || !reservationIds.Any())
            {
                return RedirectToAction("Index", "Home");
            }

            var reservations = _context.Reservations
                .Include(r => r.ParkingSlot)
                .Where(r => reservationIds.Contains(r.Id))
                .ToList();

            if (!reservations.Any())
            {
                return RedirectToAction("Index", "Home");
            }

            return View(reservations);
        }


    }
}
