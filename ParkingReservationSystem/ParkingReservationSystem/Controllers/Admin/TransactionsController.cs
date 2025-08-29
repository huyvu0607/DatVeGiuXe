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
<<<<<<< HEAD
using ParkingReservationSystem.ViewModels;
=======
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd

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
<<<<<<< HEAD

            var reservations = await _context.Reservations
                .Include(r => r.ParkingSlot)
                .Include(r => r.User)
                .OrderByDescending(r => r.ReservedAt)
                .ToListAsync();

            // Nhóm các reservation theo User, ReservedAt và ExpiresAt
            var groupedReservations = reservations
                .GroupBy(r => new {
                    r.UserId, 
                    r.Name, 
                    r.Email, 
                    r.Phone,
                    ReservedDate = r.ReservedAt.Date,
                    ReservedTime = r.ReservedAt.TimeOfDay,
                    ExpiresDate = r.ExpiresAt?.Date,
                    ExpiresTime = r.ExpiresAt?.TimeOfDay
                })
                .Select(g => new GroupedReservationViewModel
                {
                    // Thông tin chung của group
                    UserId = g.Key.UserId,
                    Name = g.Key.Name,
                    Email = g.Key.Email,
                    Phone = g.Key.Phone,
                    ReservedAt = new DateTime(g.Key.ReservedDate.Ticks + g.Key.ReservedTime.Ticks),
                    ExpiresAt = g.Key.ExpiresDate.HasValue && g.Key.ExpiresTime.HasValue 
                        ? new DateTime(g.Key.ExpiresDate.Value.Ticks + g.Key.ExpiresTime.Value.Ticks)
                        : (DateTime?)null,
            
                    // Danh sách các reservation trong group
                    Reservations = g.ToList(),
            
                    // Thống kê
                    TotalSlots = g.Count(),
                    ConfirmedSlots = g.Count(r => r.IsConfirmed),
                    PendingSlots = g.Count(r => !r.IsConfirmed && r.ExpiresAt > DateTime.Now),
                    ExpiredSlots = g.Count(r => !r.IsConfirmed && r.ExpiresAt < DateTime.Now),
            
                    // Trạng thái chung
                    IsAllConfirmed = g.All(r => r.IsConfirmed),
                    HasExpired = g.Any(r => !r.IsConfirmed && r.ExpiresAt < DateTime.Now),
            
                    // Danh sách slot codes
                    SlotCodes = g.Select(r => r.ParkingSlot.SlotCode).ToList()
                })
                .OrderByDescending(g => g.ReservedAt)
                .ToList();

            return View(groupedReservations);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> BulkConfirm([FromBody] string[] groupIds)
        {
            try
            {
                if (groupIds == null || groupIds.Length == 0)
=======
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
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                {
                    return Json(new { success = false, message = "Không có giao dịch nào được chọn" });
                }

<<<<<<< HEAD
                // Lấy tất cả reservations chưa xác nhận
                var allReservations = await _context.Reservations
                    .Include(r => r.User)
                    .Include(r => r.ParkingSlot)
                    .Where(r => !r.IsConfirmed)
                    .ToListAsync();

                // Nhóm reservations theo cùng logic như trong Index
                var allGroups = allReservations
                    .GroupBy(r => new
                    {
                        r.UserId,
                        r.Name,
                        r.Email,
                        r.Phone,
                        ReservedDate = r.ReservedAt.Date,
                        ReservedTime = r.ReservedAt.TimeOfDay
                    })
                    .Select(g => new GroupedReservationViewModel
                    {
                        GroupId = $"{g.Key.UserId}_{g.Key.ReservedDate.Ticks}_{g.Key.ReservedTime.Ticks}", // Tạo GroupId duy nhất
                        UserId = g.Key.UserId,
                        Name = g.Key.Name,
                        Email = g.Key.Email,
                        Phone = g.Key.Phone,
                        ReservedAt = new DateTime(g.Key.ReservedDate.Ticks + g.Key.ReservedTime.Ticks),
                        Reservations = g.ToList(),
                        TotalSlots = g.Count(),
                        ConfirmedSlots = g.Count(r => r.IsConfirmed),
                        PendingSlots = g.Count(r => !r.IsConfirmed && r.ExpiresAt > DateTime.Now),
                        ExpiredSlots = g.Count(r => !r.IsConfirmed && r.ExpiresAt < DateTime.Now),
                        IsAllConfirmed = g.All(r => r.IsConfirmed),
                        HasExpired = g.Any(r => !r.IsConfirmed && r.ExpiresAt < DateTime.Now),
                        SlotCodes = g.Select(r => r.ParkingSlot.SlotCode).ToList()
                    })
                    .ToList();

                // Tìm groups có GroupId khớp với groupIds được gửi
                var groupedReservations = allGroups.Where(vm => groupIds.Contains(vm.GroupId)).ToList();

                if (groupedReservations.Count == 0)
                {
                    return Json(new
                    {
                        success = false,
                        message = "Không tìm thấy giao dịch nào cần xác nhận trong số các mục đã chọn",
                        debug = new
                        {
                            receivedGroupIds = groupIds,
                            availableGroupIds = allGroups.Select(g => g.GroupId).ToList(),
                            totalUnconfirmedReservations = allReservations.Count,
                            totalGroups = allGroups.Count
                        }
                    });
                }

                var confirmedGroupIds = new List<string>();
                var emailsSent = 0;
                var emailErrors = 0;
                var totalReservationsConfirmed = 0;

                // Xử lý từng group
                foreach (var group in groupedReservations)
                {
                    // Cập nhật trạng thái IsConfirmed cho tất cả reservation trong group
                    foreach (var reservation in group.Reservations)
                    {
                        reservation.IsConfirmed = true;
                        totalReservationsConfirmed++;
                    }

                    confirmedGroupIds.Add(group.GroupId); // Lưu GroupId

                    // Gửi email xác nhận cho group
                    if (_emailService != null)
                    {
                        try
                        {
                            await _emailService.SendMultipleReservationConfirmationAsync(group.Reservations);
                            emailsSent++;
                        }
                        catch (Exception emailEx)
                        {
                            Console.WriteLine($"Lỗi gửi email cho group GroupId {group.GroupId}: {emailEx.Message}");
                            emailErrors++;
=======
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
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                        }
                    }
                }

<<<<<<< HEAD
                // Lưu thay đổi vào database
                await _context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    message = $"Đã xác nhận thành công {groupedReservations.Count} nhóm giao dịch ({totalReservationsConfirmed} reservation)",
                    confirmedGroupIds = confirmedGroupIds.ToArray(),
                    emailsSent = emailsSent,
                    emailErrors = emailErrors
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi trong BulkConfirm: {ex.Message}");
                return Json(new
                {
                    success = false,
                    message = "Có lỗi xảy ra khi xác nhận giao dịch. Vui lòng thử lại."
                });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> BulkSendEmail([FromBody] string[] groupIds)
        {
            try
            {
                if (groupIds == null || groupIds.Length == 0)
                {
                    return Json(new { success = false, message = "Không có giao dịch nào được chọn" });
                }

                if (_emailService == null)
                {
                    return Json(new { success = false, message = "Dịch vụ email chưa được cấu hình" });
                }

                // Lấy tất cả reservations đã được xác nhận
                var allConfirmedReservations = await _context.Reservations
                    .Include(r => r.User)
                    .Include(r => r.ParkingSlot)
                    .Where(r => r.IsConfirmed)
                    .ToListAsync();

                // Nhóm reservations theo cùng logic như trong Index
                var allGroups = allConfirmedReservations
                    .GroupBy(r => new
                    {
                        r.UserId,
                        r.Name,
                        r.Email,
                        r.Phone,
                        ReservedDate = r.ReservedAt.Date,
                        ReservedTime = r.ReservedAt.TimeOfDay
                    })
                    .Select(g => new GroupedReservationViewModel
                    {
                        GroupId = $"{g.Key.UserId}_{g.Key.ReservedDate.Ticks}_{g.Key.ReservedTime.Ticks}",
                        UserId = g.Key.UserId,
                        Name = g.Key.Name,
                        Email = g.Key.Email,
                        Phone = g.Key.Phone,
                        ReservedAt = new DateTime(g.Key.ReservedDate.Ticks + g.Key.ReservedTime.Ticks),
                        Reservations = g.ToList(),
                        TotalSlots = g.Count(),
                        ConfirmedSlots = g.Count(r => r.IsConfirmed),
                        PendingSlots = g.Count(r => !r.IsConfirmed && r.ExpiresAt > DateTime.Now),
                        ExpiredSlots = g.Count(r => !r.IsConfirmed && r.ExpiresAt < DateTime.Now),
                        IsAllConfirmed = g.All(r => r.IsConfirmed),
                        HasExpired = g.Any(r => !r.IsConfirmed && r.ExpiresAt < DateTime.Now),
                        SlotCodes = g.Select(r => r.ParkingSlot.SlotCode).ToList()
                    })
                    .ToList();

                // Tìm groups có GroupId khớp với groupIds được gửi
                var selectedGroups = allGroups.Where(vm => groupIds.Contains(vm.GroupId)).ToList();

                if (selectedGroups.Count == 0)
                {
                    return Json(new
                    {
                        success = false,
                        message = "Không tìm thấy giao dịch đã xác nhận nào trong số các mục đã chọn",
                        debug = new
                        {
                            receivedGroupIds = groupIds,
                            availableGroupIds = allGroups.Select(g => g.GroupId).ToList(),
                            totalConfirmedReservations = allConfirmedReservations.Count,
                            totalGroups = allGroups.Count
                        }
                    });
                }

                var emailsSent = 0;
                var emailErrors = 0;
                var failedEmails = new List<string>();

                // Gửi email cho từng group
                foreach (var group in selectedGroups)
                {
                    try
                    {
                        // Kiểm tra email hợp lệ
                        if (string.IsNullOrWhiteSpace(group.Email) || !IsValidEmail(group.Email))
                        {
                            Console.WriteLine($"Email không hợp lệ cho group GroupId {group.GroupId}: {group.Email}");
                            emailErrors++;
                            failedEmails.Add($"GroupId {group.GroupId}: Email không hợp lệ ({group.Email})");
                            continue;
                        }

                        await _emailService.SendMultipleReservationConfirmationAsync(group.Reservations);
                        emailsSent++;
                    }
                    catch (Exception emailEx)
                    {
                        Console.WriteLine($"Lỗi gửi email cho group GroupId {group.GroupId}: {emailEx.Message}");
                        emailErrors++;
                        failedEmails.Add($"GroupId {group.GroupId}: {emailEx.Message}");
                    }
                }

                return Json(new
                {
                    success = true,
                    message = $"Đã xử lý gửi email cho {selectedGroups.Count} nhóm khách hàng",
                    emailsSent = emailsSent,
                    emailErrors = emailErrors,
                    failedEmails = failedEmails.Any() ? failedEmails : null
=======
                return Json(new
                {
                    success = true,
                    message = $"Đã xác nhận thành công {reservations.Count} giao dịch",
                    confirmedIds = reservations.Select(r => r.Id).ToArray()
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                });
            }
            catch (Exception ex)
            {
<<<<<<< HEAD
                Console.WriteLine($"Lỗi trong BulkSendEmail: {ex.Message}");
                return Json(new
                {
                    success = false,
                    message = "Có lỗi xảy ra khi gửi email. Vui lòng thử lại."
                });
            }
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> BulkDelete([FromBody] string[] groupIds)
        {
            try
            {
                if (groupIds == null || groupIds.Length == 0)
                {
                    return Json(new { success = false, message = "Không có giao dịch nào được chọn" });
                }

                // Lấy tất cả reservations
                var allReservations = await _context.Reservations
                    .Include(r => r.User)
                    .Include(r => r.ParkingSlot)
                    .ToListAsync();

                // Nhóm reservations theo cùng logic như trong Index
                var allGroups = allReservations
                    .GroupBy(r => new
                    {
                        r.UserId,
                        r.Name,
                        r.Email,
                        r.Phone,
                        ReservedDate = r.ReservedAt.Date,
                        ReservedTime = r.ReservedAt.TimeOfDay
                    })
                    .Select(g => new GroupedReservationViewModel
                    {
                        GroupId = $"{g.Key.UserId}_{g.Key.ReservedDate.Ticks}_{g.Key.ReservedTime.Ticks}",
                        UserId = g.Key.UserId,
                        Name = g.Key.Name,
                        Email = g.Key.Email,
                        Phone = g.Key.Phone,
                        ReservedAt = new DateTime(g.Key.ReservedDate.Ticks + g.Key.ReservedTime.Ticks),
                        Reservations = g.ToList(),
                        TotalSlots = g.Count(),
                        ConfirmedSlots = g.Count(r => r.IsConfirmed),
                        PendingSlots = g.Count(r => !r.IsConfirmed && r.ExpiresAt > DateTime.Now),
                        ExpiredSlots = g.Count(r => !r.IsConfirmed && r.ExpiresAt < DateTime.Now),
                        IsAllConfirmed = g.All(r => r.IsConfirmed),
                        HasExpired = g.Any(r => !r.IsConfirmed && r.ExpiresAt < DateTime.Now),
                        SlotCodes = g.Select(r => r.ParkingSlot.SlotCode).ToList()
                    })
                    .ToList();

                // Tìm groups có GroupId khớp với groupIds được gửi
                var selectedGroups = allGroups.Where(vm => groupIds.Contains(vm.GroupId)).ToList();

                if (selectedGroups.Count == 0)
                {
                    return Json(new
                    {
                        success = false,
                        message = "Không tìm thấy giao dịch nào trong số các mục đã chọn",
                        debug = new
                        {
                            receivedGroupIds = groupIds,
                            availableGroupIds = allGroups.Select(g => g.GroupId).ToList(),
                            totalReservations = allReservations.Count,
                            totalGroups = allGroups.Count
                        }
                    });
                }

                var deletedReservations = 0;
                var deletedGroups = 0;
                var releasedSlots = new List<string>();

                // Xóa các reservations trong mỗi group và trả lại chỗ đỗ
                foreach (var group in selectedGroups)
                {
                    foreach (var reservation in group.Reservations)
                    {
                        // Trả lại chỗ đỗ (đánh dấu là available)
                        if (reservation.ParkingSlot != null)
                        {
                            reservation.ParkingSlot.IsAvailable = true;
                            releasedSlots.Add(reservation.ParkingSlot.SlotCode);
                        }

                        // Xóa reservation
                        _context.Reservations.Remove(reservation);
                        deletedReservations++;
                    }
                    deletedGroups++;
                }

                // Lưu thay đổi vào database
                await _context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    message = $"Đã xóa thành công {deletedGroups} nhóm giao dịch ({deletedReservations} reservation) và trả lại {releasedSlots.Count} chỗ đỗ",
                    deletedGroupIds = selectedGroups.Select(g => g.GroupId).ToArray(),
                    releasedSlots = releasedSlots.Distinct().ToArray()
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi trong BulkDelete: {ex.Message}");
                return Json(new
                {
                    success = false,
                    message = "Có lỗi xảy ra khi xóa giao dịch. Vui lòng thử lại."
                });
=======
                Console.WriteLine($"Error in BulkConfirm: {ex.Message}");
                return Json(new { success = false, message = "Có lỗi xảy ra khi xác nhận giao dịch" });
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
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
<<<<<<< HEAD
        public async Task<IActionResult> Create()
=======
        public IActionResult Create()
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");

<<<<<<< HEAD
            await LoadDropdownDataForCreate();
            return View();
        }



        // POST: Transactions/Create - Hỗ trợ tạo nhiều chỗ đỗ
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(MultipleReservationModel model)
        {
            var errors = new List<string>();

            // Validate dữ liệu
            if (model.SlotCodes == null || model.SlotCodes.Length == 0)
            {
                errors.Add("Vui lòng chọn ít nhất một chỗ đỗ");
            }

            // Xử lý User ID cho khách vãng lai
            if (model.UserId == -1 || model.UserId <= 0)
            {
                // Khách vãng lai - không cần UserId hợp lệ
                model.UserId = null; // Hoặc null tùy theo thiết kế DB của bạn
            }
            else
            {
                // Kiểm tra UserId có tồn tại không
                var userExists = await _context.Users.AnyAsync(u => u.Id == model.UserId);
                if (!userExists)
                {
                    errors.Add("Người dùng được chọn không tồn tại");
                }
            }

            if (string.IsNullOrWhiteSpace(model.Name))
            {
                errors.Add("Vui lòng nhập họ tên");
            }

            if (string.IsNullOrWhiteSpace(model.Email))
            {
                errors.Add("Vui lòng nhập email");
            }

            if (string.IsNullOrWhiteSpace(model.Phone))
            {
                errors.Add("Vui lòng nhập số điện thoại");
            }

            if (model.ReservedAt == default(DateTime))
            {
                model.ReservedAt = DateTime.Now;
            }

            if (errors.Any())
            {
                TempData["ErrorMessage"] = string.Join("<br>", errors);
                await LoadDropdownDataForCreate();
                return View(model);
            }

            try
            {
                var createdReservations = new List<Reservation>();
                var expiresAt = model.ReservedAt.AddMinutes(10);

                // Kiểm tra xem các slot có còn available không
                var availableSlots = await _context.ParkingSlots
                    .Where(s => model.SlotCodes.Contains(s.SlotCode) && s.IsAvailable)
                    .ToListAsync();

                if (availableSlots.Count != model.SlotCodes.Length)
                {
                    var unavailableSlots = model.SlotCodes.Except(availableSlots.Select(s => s.SlotCode)).ToList();
                    TempData["ErrorMessage"] = $"Một số chỗ đỗ không còn trống: {string.Join(", ", unavailableSlots)}";
                    await LoadDropdownDataForCreate();
                    return View(model);
                }

                // Tạo reservation cho từng slot
                foreach (var slotCode in model.SlotCodes)
                {
                    var reservation = new Reservation
                    {
                        SlotCode = slotCode,
                        UserId = model.UserId,
                        Name = model.Name,
                        Email = model.Email,
                        Phone = model.Phone,
                        ReservedAt = model.ReservedAt,
                        ExpiresAt = expiresAt,
                        IsConfirmed = model.IsConfirmed
                    };

                    _context.Reservations.Add(reservation);
                    createdReservations.Add(reservation);

                    // Cập nhật trạng thái slot
                    var slot = availableSlots.FirstOrDefault(s => s.SlotCode == slotCode);
                    if (slot != null)
                    {
                        slot.IsAvailable = false;
                    }
                }

                await _context.SaveChangesAsync();

                // Gửi email cho từng reservation nếu đã xác nhận
                if (model.IsConfirmed && _emailService != null)
                {
                    var emailTasks = createdReservations.Select(async reservation =>
                    {
                        try
                        {
                            await _emailService.SendReservationConfirmationAsync(reservation);
                            return $"Gửi email cho slot {reservation.SlotCode}: Thành công";
                        }
                        catch (Exception emailEx)
                        {
                            Console.WriteLine($"Error sending email for reservation {reservation.Id}: {emailEx.Message}");
                            return $"Gửi email cho slot {reservation.SlotCode}: Thất bại";
                        }
                    });

                    var emailResults = await Task.WhenAll(emailTasks);
                    Console.WriteLine(string.Join(Environment.NewLine, emailResults));
                }

                TempData["SuccessMessage"] = $"Đã tạo thành công {createdReservations.Count} đặt chỗ cho các slot: {string.Join(", ", model.SlotCodes)}";
                
                if (model.IsConfirmed)
                {
                    TempData["SuccessMessage"] += "<br>Email xác nhận đã được gửi (nếu cấu hình email hoạt động).";
                }

                return RedirectToAction(nameof(Index));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating reservations: {ex.Message}");
                TempData["ErrorMessage"] = $"Có lỗi xảy ra khi tạo đặt chỗ: {ex.Message}";
                await LoadDropdownDataForCreate();
                return View(model);
            }
=======
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
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
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
<<<<<<< HEAD
                await LoadDropdownData(reservation);
=======
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

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
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

<<<<<<< HEAD
=======
            // Debug: In ra thông tin nhận được
            Console.WriteLine($"Received - Id: {reservation.Id}");
            Console.WriteLine($"Received - SlotCode: {reservation.SlotCode}");
            Console.WriteLine($"Received - UserId: {reservation.UserId}");
            Console.WriteLine($"Received - Name: {reservation.Name}");
            Console.WriteLine($"Received - IsConfirmed: {reservation.IsConfirmed}");

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
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

<<<<<<< HEAD
=======
                // Reload dropdown data
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                await LoadDropdownData(reservation);
                return View(reservation);
            }

            try
            {
<<<<<<< HEAD
                // Lấy reservation cũ để so sánh
=======
                // Lấy reservation cũ để so sánh trạng thái IsConfirmed
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                var oldReservation = await _context.Reservations.AsNoTracking()
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (oldReservation == null)
                {
                    return NotFound();
                }

<<<<<<< HEAD
=======
                // Biến để kiểm tra có cần gửi email xác nhận không
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                bool needSendConfirmationEmail = false;

                // Kiểm tra nếu IsConfirmed thay đổi từ false thành true
                if (!oldReservation.IsConfirmed && reservation.IsConfirmed)
                {
                    needSendConfirmationEmail = true;
<<<<<<< HEAD
                }

                // Nếu slot code thay đổi, cập nhật trạng thái slots
=======
                    Console.WriteLine("IsConfirmed changed from false to true - will send confirmation email");
                }

                // Nếu slot code thay đổi, cập nhật trạng thái slots (giữ nguyên logic cũ)
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
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

<<<<<<< HEAD
=======
                Console.WriteLine("Reservation updated successfully");

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                // Gửi email xác nhận nếu cần
                if (needSendConfirmationEmail && _emailService != null)
                {
                    try
                    {
<<<<<<< HEAD
                        await _emailService.SendReservationConfirmationAsync(reservation);
                        TempData["SuccessMessage"] = "Cập nhật đặt chỗ và gửi email xác nhận thành công!";
=======
                        Console.WriteLine("Sending confirmation email...");
                        await _emailService.SendReservationConfirmationAsync(reservation);
                        TempData["SuccessMessage"] = "Cập nhật đặt chỗ và gửi email xác nhận thành công!";

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
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

<<<<<<< HEAD
        // Helper method để load dropdown data cho Create
        private async Task LoadDropdownDataForCreate()
        {
            try
            {
                // Lấy danh sách parking slots có sẵn
                var parkingSlots = await _context.ParkingSlots
                    .Where(s => s.IsAvailable == true)
                    .OrderBy(s => s.SlotCode)
                    .ToListAsync();

                // Lấy danh sách users
                var users = await _context.Users
                    .OrderBy(u => u.Name)
                    .ToListAsync();

                // Tạo ViewBag cho multiselect parking slots
                ViewBag.AvailableSlots = parkingSlots.Select(s => new SelectListItem
                {
                    Value = s.SlotCode,
                    Text = $"{s.SlotCode} - Tầng {s.Floor}"
                }).ToList();

                // Tạo ViewBag cho users dropdown
                ViewBag.Users = new SelectList(
                    users.Select(u => new {
                        Value = u.Id,
                        Text = $"{u.Name} - {u.Email}"
                    }),
                    "Value", "Text");

                Console.WriteLine($"Loaded {parkingSlots.Count} parking slots and {users.Count} users for Create");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading dropdown data for Create: {ex.Message}");
                ViewBag.AvailableSlots = new List<SelectListItem>();
                ViewBag.Users = new SelectList(new List<object>(), "Value", "Text");
            }
        }

        // Helper method để load dropdown data cho Edit
=======
        // Helper method để load dropdown data
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        private async Task LoadDropdownData(Reservation reservation)
        {
            try
            {
<<<<<<< HEAD
                // Lấy parking slots (bao gồm slot hiện tại và những slot available)
                var parkingSlots = await _context.ParkingSlots
                    .Where(s => s.IsAvailable == true || s.SlotCode == reservation.SlotCode)
                    .OrderBy(s => s.SlotCode)
                    .ToListAsync();

                // Lấy danh sách users
                var users = await _context.Users
                    .OrderBy(u => u.Name)
                    .ToListAsync();

                // Tạo SelectList cho ParkingSlots
                ViewBag.SlotCode = new SelectList(
                    parkingSlots.Select(s => new {
                        Value = s.SlotCode,
                        Text = $"{s.SlotCode} - Tầng {s.Floor} {(s.IsAvailable ? "" : "(Đang sử dụng)")}"
                    }),
                    "Value", "Text", reservation.SlotCode);

                // Tạo SelectList cho Users
                ViewBag.UserId = new SelectList(
                    users.Select(u => new {
                        Value = u.Id,
                        Text = $"{u.Name} - {u.Email}"
                    }),
                    "Value", "Text", reservation.UserId);

                Console.WriteLine($"Loaded {parkingSlots.Count} parking slots and {users.Count} users for Edit");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading dropdown data for Edit: {ex.Message}");
                ViewBag.SlotCode = new SelectList(new List<object>(), "Value", "Text");
                ViewBag.UserId = new SelectList(new List<object>(), "Value", "Text");
            }
        }

=======
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


>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
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