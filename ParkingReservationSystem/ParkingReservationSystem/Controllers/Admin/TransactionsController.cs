using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using ParkingReservationSystem.Models;
using ParkingReservationSystem.Services;

namespace ParkingReservationSystem.Controllers.Admin
{
    [Authorize(Roles = "Admin")]
    public class TransactionsController : Controller
    {
        private readonly ParkingDbContext _context;
        private readonly IEmailService _emailService;

        public TransactionsController(ParkingDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        // GET: Transactions
        public async Task<IActionResult> Index()
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");
            var parkingDbContext = _context.Reservations.Include(r => r.ParkingSlot).Include(r => r.User);
            return View(await parkingDbContext.ToListAsync());
        }
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> BulkConfirm([FromBody] int[] ids)
        {
            try
            {
                if (ids == null || ids.Length == 0)
                {
                    return Json(new { success = false, message = "Không có giao dịch nào được chọn" });
                }

                var reservations = await _context.Reservations
                    .Where(r => ids.Contains(r.Id) && !r.IsConfirmed)
                    .ToListAsync();

                if (reservations.Count == 0)
                {
                    return Json(new { success = false, message = "Không tìm thấy giao dịch phù hợp để xác nhận" });
                }

                // Cập nhật trạng thái IsConfirmed
                foreach (var reservation in reservations)
                {
                    reservation.IsConfirmed = true;
                }

                await _context.SaveChangesAsync();

                // Gửi email xác nhận cho từng reservation (tùy chọn)
                if (_emailService != null)
                {
                    foreach (var reservation in reservations)
                    {
                        try
                        {
                            await _emailService.SendReservationConfirmationAsync(reservation);
                        }
                        catch (Exception emailEx)
                        {
                            Console.WriteLine($"Error sending email for reservation {reservation.Id}: {emailEx.Message}");
                        }
                    }
                }

                return Json(new
                {
                    success = true,
                    message = $"Đã xác nhận thành công {reservations.Count} giao dịch",
                    confirmedIds = reservations.Select(r => r.Id).ToArray()
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in BulkConfirm: {ex.Message}");
                return Json(new { success = false, message = "Có lỗi xảy ra khi xác nhận giao dịch" });
            }
        }
        // GET: Transactions/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");
            if (id == null)
            {
                return NotFound();
            }

            var reservation = await _context.Reservations
                .Include(r => r.ParkingSlot)
                .Include(r => r.User)
                .FirstOrDefaultAsync(m => m.Id == id);
            if (reservation == null)
            {
                return NotFound();
            }

            return View(reservation);
        }

        // GET: Transactions/Create
        public IActionResult Create()
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");

            // Tạo SelectList cho ParkingSlots với thông tin mô tả
            var parkingSlots = _context.ParkingSlots
                .Where(s => s.IsAvailable == true)
                .Select(s => new {
                    Value = s.SlotCode,
                    Text = $"{s.SlotCode} - Tầng {s.Floor}"
                }).ToList();
            ViewData["SlotCode"] = new SelectList(parkingSlots, "Value", "Text");

            // Tạo SelectList cho Users với thông tin mô tả
            var users = _context.Users
                .Select(u => new {
                    Value = u.Id,
                    Text = $"{u.Id} - {u.Name} ({u.Email})"
                }).ToList();
            ViewData["UserId"] = new SelectList(users, "Value", "Text");

            return View();
        }

        // POST: Transactions/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([Bind("Id,SlotCode,Name,Email,Phone,ReservedAt,ExpiresAt,IsConfirmed,UserId")] Reservation reservation)
        {
            if (ModelState.IsValid)
            {
                // Cập nhật trạng thái slot khi tạo reservation
                var slot = await _context.ParkingSlots.FirstOrDefaultAsync(s => s.SlotCode == reservation.SlotCode);
                if (slot != null)
                {
                    slot.IsAvailable = false;
                }

                _context.Add(reservation);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }

            // Reload dropdown data nếu có lỗi
            var parkingSlots = _context.ParkingSlots
                .Where(s => s.IsAvailable == true || s.SlotCode == reservation.SlotCode)
                .Select(s => new {
                    Value = s.SlotCode,
                    Text = $"{s.SlotCode} - Tầng {s.Floor}"
                }).ToList();
            ViewData["SlotCode"] = new SelectList(parkingSlots, "Value", "Text", reservation.SlotCode);

            var users = _context.Users
                .Select(u => new {
                    Value = u.Id,
                    Text = $"{u.Id} - {u.Name} ({u.Email})"
                }).ToList();
            ViewData["UserId"] = new SelectList(users, "Value", "Text", reservation.UserId);

            return View(reservation);
        }

        // GET: Reservations/Edit/5
        public async Task<IActionResult> Edit(int? id)
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");

            if (id == null)
            {
                return NotFound();
            }

            var reservation = await _context.Reservations.FindAsync(id);
            if (reservation == null)
            {
                return NotFound();
            }

            try
            {
                // Debug: Kiểm tra dữ liệu
                var allSlots = await _context.ParkingSlots.ToListAsync();
                var allUsers = await _context.Users.ToListAsync();

                Console.WriteLine($"Total slots: {allSlots.Count}");
                Console.WriteLine($"Total users: {allUsers.Count}");
                Console.WriteLine($"Current SlotCode: {reservation.SlotCode}");
                Console.WriteLine($"Current UserId: {reservation.UserId}");

                // Tạo dropdown cho ParkingSlots
                var parkingSlots = allSlots
                    .Where(s => s.IsAvailable == true || s.SlotCode == reservation.SlotCode)
                    .Select(s => new SelectListItem
                    {
                        Value = s.SlotCode,
                        Text = $"{s.SlotCode} - Tầng {s.Floor} {(s.IsAvailable ? "" : "(Đang sử dụng)")}"
                    }).ToList();

                // Tạo dropdown cho Users
                var users = allUsers
                    .Select(u => new SelectListItem
                    {
                        Value = u.Id.ToString(),
                        Text = $"{u.Name} - {u.Email}"
                    }).ToList();

                // Gán vào ViewBag
                ViewBag.SlotCode = new SelectList(parkingSlots, "Value", "Text", reservation.SlotCode);
                ViewBag.UserId = new SelectList(users, "Value", "Text", reservation.UserId.ToString());

                // Debug output
                Console.WriteLine($"SlotCode options: {parkingSlots.Count}");
                Console.WriteLine($"UserId options: {users.Count}");

                return View(reservation);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Edit GET: {ex.Message}");
                ViewBag.ErrorMessage = $"Lỗi tải dữ liệu: {ex.Message}";
                return View(reservation);
            }
        }

        // POST: Reservations/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, Reservation reservation)
        {
            if (id != reservation.Id)
            {
                return NotFound();
            }

            // Debug: In ra thông tin nhận được
            Console.WriteLine($"Received - Id: {reservation.Id}");
            Console.WriteLine($"Received - SlotCode: {reservation.SlotCode}");
            Console.WriteLine($"Received - UserId: {reservation.UserId}");
            Console.WriteLine($"Received - Name: {reservation.Name}");
            Console.WriteLine($"Received - IsConfirmed: {reservation.IsConfirmed}");

            // Tự động tính thời gian hết hạn
            if (reservation.ReservedAt != default(DateTime))
            {
                reservation.ExpiresAt = reservation.ReservedAt.AddMinutes(10);
            }

            // Kiểm tra ModelState
            if (!ModelState.IsValid)
            {
                Console.WriteLine("ModelState is invalid:");
                foreach (var modelError in ModelState)
                {
                    foreach (var error in modelError.Value.Errors)
                    {
                        Console.WriteLine($"Field: {modelError.Key}, Error: {error.ErrorMessage}");
                    }
                }

                // Reload dropdown data
                await LoadDropdownData(reservation);
                return View(reservation);
            }

            try
            {
                // Lấy reservation cũ để so sánh trạng thái IsConfirmed
                var oldReservation = await _context.Reservations.AsNoTracking()
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (oldReservation == null)
                {
                    return NotFound();
                }

                // Biến để kiểm tra có cần gửi email xác nhận không
                bool needSendConfirmationEmail = false;

                // Kiểm tra nếu IsConfirmed thay đổi từ false thành true
                if (!oldReservation.IsConfirmed && reservation.IsConfirmed)
                {
                    needSendConfirmationEmail = true;
                    Console.WriteLine("IsConfirmed changed from false to true - will send confirmation email");
                }

                // Nếu slot code thay đổi, cập nhật trạng thái slots (giữ nguyên logic cũ)
                if (oldReservation.SlotCode != reservation.SlotCode)
                {
                    // Trả lại slot cũ
                    var oldSlot = await _context.ParkingSlots
                        .FirstOrDefaultAsync(s => s.SlotCode == oldReservation.SlotCode);
                    if (oldSlot != null)
                    {
                        oldSlot.IsAvailable = true;
                    }

                    // Đánh dấu slot mới là không available
                    var newSlot = await _context.ParkingSlots
                        .FirstOrDefaultAsync(s => s.SlotCode == reservation.SlotCode);
                    if (newSlot != null)
                    {
                        newSlot.IsAvailable = false;
                    }
                }

                // Cập nhật reservation
                _context.Update(reservation);
                await _context.SaveChangesAsync();

                Console.WriteLine("Reservation updated successfully");

                // Gửi email xác nhận nếu cần
                if (needSendConfirmationEmail && _emailService != null)
                {
                    try
                    {
                        Console.WriteLine("Sending confirmation email...");
                        await _emailService.SendReservationConfirmationAsync(reservation);
                        TempData["SuccessMessage"] = "Cập nhật đặt chỗ và gửi email xác nhận thành công!";

                    }
                    catch (Exception emailEx)
                    {
                        Console.WriteLine($"Error sending confirmation email: {emailEx.Message}");
                        TempData["SuccessMessage"] = "Cập nhật đặt chỗ thành công! Tuy nhiên không thể gửi email xác nhận.";
                    }
                }
                else
                {
                    TempData["SuccessMessage"] = "Cập nhật đặt chỗ thành công!";
                }

                return RedirectToAction(nameof(Index));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving: {ex.Message}");
                TempData["ErrorMessage"] = $"Có lỗi xảy ra: {ex.Message}";
                ModelState.AddModelError("", "Có lỗi xảy ra khi cập nhật dữ liệu.");

                await LoadDropdownData(reservation);
                return View(reservation);
            }
        }

        // Helper method để load dropdown data
        private async Task LoadDropdownData(Reservation reservation)
        {
            try
            {
                var parkingSlots = await _context.ParkingSlots
                    .Where(s => s.IsAvailable == true || s.SlotCode == reservation.SlotCode)
                    .Select(s => new SelectListItem
                    {
                        Value = s.SlotCode,
                        Text = $"{s.SlotCode} - Tầng {s.Floor} {(s.IsAvailable ? "" : "(Đang sử dụng)")}"
                    }).ToListAsync();

                var users = await _context.Users
                    .Select(u => new SelectListItem
                    {
                        Value = u.Id.ToString(),
                        Text = $"{u.Name} - {u.Email}"
                    }).ToListAsync();

                ViewBag.SlotCode = new SelectList(parkingSlots, "Value", "Text", reservation.SlotCode);
                ViewBag.UserId = new SelectList(users, "Value", "Text", reservation.UserId.ToString());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading dropdown data: {ex.Message}");
                ViewBag.SlotCode = new SelectList(new List<SelectListItem>(), "Value", "Text");
                ViewBag.UserId = new SelectList(new List<SelectListItem>(), "Value", "Text");
            }
        }


        // GET: Transactions/Delete/5
        public async Task<IActionResult> Delete(int? id)
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");
            if (id == null)
            {
                return NotFound();
            }

            var reservation = await _context.Reservations
                .Include(r => r.ParkingSlot)
                .Include(r => r.User)
                .FirstOrDefaultAsync(m => m.Id == id);
            if (reservation == null)
            {
                return NotFound();
            }

            return View(reservation);
        }

        // POST: Transactions/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var reservation = await _context.Reservations.FindAsync(id);
            if (reservation != null)
            {
                var slot = await _context.ParkingSlots.FirstOrDefaultAsync(s => s.SlotCode == reservation.SlotCode);
                if (slot != null)
                {
                    slot.IsAvailable = true;
                }
                _context.Reservations.Remove(reservation);
            }

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        private bool ReservationExists(int id)
        {
            return _context.Reservations.Any(e => e.Id == id);
        }
    }
}