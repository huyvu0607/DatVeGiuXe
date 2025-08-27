using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParkingReservationSystem.Models;
using ParkingReservationSystem.ViewModels;
using Microsoft.AspNetCore.SignalR;
using ParkingReservationSystem.Hubs;
using ParkingReservationSystem.Services;

namespace ParkingReservationSystem.Controllers
{
    public class BookingController : Controller
    {
        private readonly ParkingDbContext _context;
        private readonly IHubContext<ParkingHub> _hubContext;
        private readonly IEmailService _emailService;
        private readonly ILogger<BookingController> _logger;

        public BookingController(ParkingDbContext context, IHubContext<ParkingHub> hubContext,
            IEmailService emailService, ILogger<BookingController> logger)
        {
            _context = context;
            _hubContext = hubContext;
            _emailService = emailService;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Hold(string slotCode, string email, string phone, string name)
        {
            var slot = _context.ParkingSlots.FirstOrDefault(s => s.SlotCode == slotCode && s.IsAvailable == true);
            if (slot == null)
            {
                // Thông báo cho tất cả client rằng chỗ này đã được đặt
                await _hubContext.Clients.Group("ParkingLot").SendAsync("SlotTaken", slotCode, "Chỗ này đã được người khác đặt!");
                return BadRequest("Slot is not available.");
            }

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
                UserId = userId
            };

            slot.IsAvailable = false;
            _context.Reservations.Add(reservation);
            _context.SaveChanges();

            // Thông báo real-time cho tất cả client khác
            await _hubContext.Clients.Group("ParkingLot").SendAsync("SlotReserved", slotCode, name);

            return RedirectToAction("ThanhToan", new { id = reservation.Id });
        }

        [HttpPost]
        public async Task<IActionResult> Confirm(int reservationId)
        {
            var reservation = _context.Reservations
                .Include(r => r.ParkingSlot)
                .FirstOrDefault(r => r.Id == reservationId);

            if (reservation == null)
            {
                ViewBag.Error = "Không tìm thấy đặt chỗ";
                return View("ThanhToan");
            }

            if (reservation.IsConfirmed)
            {
                ViewBag.PaymentSuccess = true;
                ViewBag.AlreadyConfirmed = true;
                return View("ThanhToan", reservation);
            }

            if (reservation.ExpiresAt < DateTime.Now)
            {
                var slot = _context.ParkingSlots.FirstOrDefault(s => s.SlotCode == reservation.SlotCode);
                if (slot != null)
                {
                    slot.IsAvailable = true;
                    // Thông báo chỗ được giải phóng
                    await _hubContext.Clients.Group("ParkingLot").SendAsync("SlotReleased", reservation.SlotCode);
                }

                _context.Reservations.Remove(reservation);
                _context.SaveChanges();

                ViewBag.Error = "Đã hết thời gian giữ chỗ";
                return View("ThanhToan");
            }

            // Xác nhận thanh toán
            reservation.IsConfirmed = true;
            _context.SaveChanges();

            // Thông báo chỗ đã được xác nhận
            await _hubContext.Clients.Group("ParkingLot").SendAsync("SlotConfirmed", reservation.SlotCode, reservation.Name);

            // GỬI EMAIL VỚI QR CODE
            try
            {
                await _emailService.SendReservationConfirmationAsync(reservation);
                ViewBag.EmailSent = true;
                _logger.LogInformation("Email confirmation sent successfully for reservation {ReservationId}", reservationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email confirmation for reservation {ReservationId}", reservationId);
                ViewBag.EmailError = "Không thể gửi email xác nhận. Vui lòng liên hệ hỗ trợ.";
            }

            // QUAN TRỌNG: Thay vì redirect, return view với success flag
            ViewBag.PaymentSuccess = true;

            return View("ThanhToan", reservation); // Return về view ThanhToan với success state
        }

        [HttpGet]
        public IActionResult ThanhToan(int id)
        {
            var reservation = _context.Reservations.Include(r => r.ParkingSlot).FirstOrDefault(r => r.Id == id);
            if (reservation == null) return NotFound();

            return View(reservation);
        }

        [HttpPost]
        public async Task<IActionResult> HoldMultiple(List<string> selectedSlots, string name, string email, string phone)
        {
            if (selectedSlots == null || !selectedSlots.Any())
                return RedirectToAction("Index", new { error = "Bạn chưa chọn chỗ nào." });

            var userId = HttpContext.Session.GetInt32("UserId");
            var now = DateTime.Now;
            var reservationIds = new List<int>();
            var reservedSlots = new List<string>();

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

                    if (userId != null)
                    {
                        reservation.UserId = userId;
                    }
                    _context.Reservations.Add(reservation);
                    _context.SaveChanges();

                    reservationIds.Add(reservation.Id);
                    reservedSlots.Add(slot.SlotCode);
                }
            }

            // Thông báo nhiều chỗ được đặt cùng lúc
            if (reservedSlots.Any())
            {
                await _hubContext.Clients.Group("ParkingLot").SendAsync("MultipleSlotsReserved", reservedSlots, name);
            }

            if (reservationIds.Any())
            {
                TempData["ReservationIds"] = string.Join(",", reservationIds);
                return RedirectToAction("ThanhToanNhieu");
            }

            return RedirectToAction("Index", new { error = "Không thể giữ chỗ nào cả." });
        }

        [HttpGet]
        public IActionResult ThanhToanNhieu()
        {
            if (TempData["ReservationIds"] == null)
                return RedirectToAction("Index");

            TempData.Keep("ReservationIds");

            var idsStr = TempData["ReservationIds"].ToString();
            var ids = idsStr.Split(',').Select(int.Parse).ToList();

            var reservations = _context.Reservations
                .Include(r => r.ParkingSlot)
                .Where(r => ids.Contains(r.Id))
                .ToList();

            return View(reservations);
        }

        [HttpPost]
        public async Task<IActionResult> ConfirmMultiple(List<int> reservationIds)
        {
            var now = DateTime.Now;
            var reservations = _context.Reservations
                .Include(r => r.ParkingSlot)
                .Where(r => reservationIds.Contains(r.Id))
                .ToList();

            var confirmedSlotCodes = new List<string>();
            var releasedSlotCodes = new List<string>();
            var confirmedReservations = new List<Reservation>();

            foreach (var res in reservations)
            {
                if (res.IsConfirmed)
                {
                    confirmedSlotCodes.Add(res.SlotCode);
                    confirmedReservations.Add(res);
                }
                else if (res.ExpiresAt >= now)
                {
                    res.IsConfirmed = true;
                    confirmedSlotCodes.Add(res.SlotCode);
                    confirmedReservations.Add(res);
                }
                else
                {
                    var slot = _context.ParkingSlots.FirstOrDefault(s => s.SlotCode == res.SlotCode);
                    if (slot != null)
                    {
                        slot.IsAvailable = true;
                        releasedSlotCodes.Add(res.SlotCode);
                    }
                    _context.Reservations.Remove(res);
                }
            }

            _context.SaveChanges();

            // Thông báo các chỗ được xác nhận và giải phóng
            if (confirmedSlotCodes.Any())
            {
                await _hubContext.Clients.Group("ParkingLot").SendAsync("MultipleSlotsConfirmed", confirmedSlotCodes, confirmedReservations[0].Name);
            }
            if (releasedSlotCodes.Any())
            {
                await _hubContext.Clients.Group("ParkingLot").SendAsync("MultipleSlotsReleased", releasedSlotCodes);
            }

            // GỬI EMAIL CHO NHIỀU CHỖ
            if (confirmedReservations.Any())
            {
                try
                {
                    await _emailService.SendMultipleReservationConfirmationAsync(confirmedReservations);
                    ViewBag.EmailSent = true;
                    ViewBag.EmailCount = confirmedReservations.Count;
                    _logger.LogInformation("Email confirmation sent successfully for {Count} reservations", confirmedReservations.Count);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send email confirmation for multiple reservations");
                    ViewBag.EmailError = "Không thể gửi email xác nhận. Vui lòng liên hệ hỗ trợ.";
                }
            }

            // QUAN TRỌNG: Thay vì redirect, return view với success flag
            ViewBag.PaymentSuccess = true;

            // Return về view ThanhToanNhieu với success state
            return View("ThanhToanNhieu", confirmedReservations.Any() ? confirmedReservations : reservations);
        }
    }
}