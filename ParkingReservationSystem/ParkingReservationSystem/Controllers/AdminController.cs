using Microsoft.AspNetCore.Mvc;
using ParkingReservationSystem.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using ParkingReservationSystem.Hubs;

namespace ParkingReservationSystem.Controllers
{
    [Authorize(Roles = "Admin")]
    public class AdminController : Controller
    {
        private readonly ParkingDbContext _context;
        private readonly IHubContext<ParkingHub> _hubContext;

        public AdminController(ParkingDbContext context, IHubContext<ParkingHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetDashboardData()
        {
            // Thống kê cơ bản
            var totalUsers = await _context.Users.CountAsync();
            var totalReservations = await _context.Reservations.CountAsync();
            var confirmedReservations = await _context.Reservations.CountAsync(r => r.IsConfirmed);
            var availableSlots = await _context.ParkingSlots.CountAsync(s => s.IsAvailable);

            // Thống kê tuần trước để tính tỷ lệ tăng trưởng
            var oneWeekAgo = DateTime.Now.AddDays(-7);
            var twoWeeksAgo = DateTime.Now.AddDays(-14);

            var reservationsLastWeek = await _context.Reservations
                .CountAsync(r => r.ReservedAt <= oneWeekAgo && r.ReservedAt >= twoWeeksAgo);
            var confirmedLastWeek = await _context.Reservations
                .CountAsync(r => r.IsConfirmed && r.ReservedAt <= oneWeekAgo && r.ReservedAt >= twoWeeksAgo);

            var reservationsThisWeek = await _context.Reservations
                .CountAsync(r => r.ReservedAt >= oneWeekAgo);
            var confirmedThisWeek = await _context.Reservations
                .CountAsync(r => r.IsConfirmed && r.ReservedAt >= oneWeekAgo);

            // Tính tỷ lệ tăng trưởng
            var userGrowth = 12.0; // Có thể tính toán thực tế
            var reservationGrowth = reservationsLastWeek > 0 ?
                ((double)(reservationsThisWeek - reservationsLastWeek) / reservationsLastWeek * 100) : 0;
            var confirmedGrowth = confirmedLastWeek > 0 ?
                ((double)(confirmedThisWeek - confirmedLastWeek) / confirmedLastWeek * 100) : 0;

            // Thống kê theo ngày trong tuần (7 ngày gần nhất)
            var weeklyStats = new List<object>();
            var weeklyData = new List<int>();
            var weeklyLabels = new List<string>();

            for (int i = 6; i >= 0; i--)
            {
                var date = DateTime.Now.AddDays(-i).Date;
                var count = await _context.Reservations
                    .CountAsync(r => r.ReservedAt.Date == date);

                weeklyData.Add(count);
                weeklyLabels.Add(GetVietnameseDayName(date.DayOfWeek));
            }

            // Thống kê trạng thái
            var expiredCount = await _context.Reservations
                .CountAsync(r => r.ExpiresAt.HasValue && r.ExpiresAt < DateTime.Now && !r.IsConfirmed);

            var data = new
            {
                stats = new
                {
                    totalUsers = totalUsers,
                    totalReservations = totalReservations,
                    confirmedReservations = confirmedReservations,
                    availableSlots = availableSlots,
                    userGrowth = userGrowth,
                    reservationGrowth = reservationGrowth,
                    confirmedGrowth = confirmedGrowth
                },
                charts = new
                {
                    weeklyData = weeklyData,
                    weeklyLabels = weeklyLabels,
                    statusData = new
                    {
                        confirmed = confirmedReservations,
                        pending = totalReservations - confirmedReservations,
                        expired = expiredCount
                    }
                }
            };

            return Json(data);
        }

        public async Task<IActionResult> Dashboard()
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");

            // Thống kê cơ bản
            var totalUsers = await _context.Users.CountAsync();
            var totalReservations = await _context.Reservations.CountAsync();
            var confirmedReservations = await _context.Reservations.CountAsync(r => r.IsConfirmed);
            var availableSlots = await _context.ParkingSlots.CountAsync(s => s.IsAvailable);

            // Thống kê tuần trước để tính tỷ lệ tăng trưởng
            var oneWeekAgo = DateTime.Now.AddDays(-7);
            var twoWeeksAgo = DateTime.Now.AddDays(-14);

            var reservationsLastWeek = await _context.Reservations
                .CountAsync(r => r.ReservedAt <= oneWeekAgo && r.ReservedAt >= twoWeeksAgo);
            var confirmedLastWeek = await _context.Reservations
                .CountAsync(r => r.IsConfirmed && r.ReservedAt <= oneWeekAgo && r.ReservedAt >= twoWeeksAgo);

            var reservationsThisWeek = await _context.Reservations
                .CountAsync(r => r.ReservedAt >= oneWeekAgo);
            var confirmedThisWeek = await _context.Reservations
                .CountAsync(r => r.IsConfirmed && r.ReservedAt >= oneWeekAgo);

            // Tính tỷ lệ tăng trưởng
            var userGrowth = 12.0;
            var reservationGrowth = reservationsLastWeek > 0 ? ((double)(reservationsThisWeek - reservationsLastWeek) / reservationsLastWeek * 100) : 0;
            var confirmedGrowth = confirmedLastWeek > 0 ? ((double)(confirmedThisWeek - confirmedLastWeek) / confirmedLastWeek * 100) : 0;

            // Hoạt động gần đây - Nhóm theo User và thời gian gần nhau
            var recentActivities = await _context.Reservations
                .Include(r => r.User)
                .Include(r => r.ParkingSlot)
                .OrderByDescending(r => r.ReservedAt)
                .Take(20)
                .ToListAsync();

            // Nhóm các reservation có cùng user và thời gian gần nhau (trong vòng 5 phút)
            var groupedActivities = new List<RecentActivity>();
            var processedIds = new HashSet<int>();

            foreach (var reservation in recentActivities)
            {
                if (processedIds.Contains(reservation.Id))
                    continue;

                // Tìm các reservation khác của cùng user trong vòng 5 phút
                var relatedReservations = recentActivities
                    .Where(r => !processedIds.Contains(r.Id) &&
                               r.UserId == reservation.UserId &&
                               Math.Abs((r.ReservedAt - reservation.ReservedAt).TotalMinutes) <= 5)
                    .OrderBy(r => r.ReservedAt)
                    .ToList();

                // Đánh dấu đã xử lý
                foreach (var related in relatedReservations)
                {
                    processedIds.Add(related.Id);
                }

                // Tạo chi tiết các chỗ đậu với thông tin tầng
                var slotDetails = relatedReservations
                    .Where(r => !string.IsNullOrEmpty(r.SlotCode) && r.ParkingSlot != null)
                    .Select(r => new SlotDetail
                    {
                        SlotCode = r.SlotCode,
                        Floor = r.ParkingSlot != null ? r.ParkingSlot.Floor.ToString() : "N/A",
                        IsConfirmed = r.IsConfirmed
                    })
                    .ToList();

                // Tạo activity với nhiều slot codes
                var activity = new RecentActivity
                {
                    Time = reservation.ReservedAt,
                    UserName = reservation.Name ?? reservation.User?.Name ?? "Khách",
                    Action = relatedReservations.Count > 1
                        ? $"Đặt {relatedReservations.Count} chỗ"
                        : (reservation.IsConfirmed ? "Xác nhận đặt chỗ" : "Đặt chỗ mới"),
                    Status = relatedReservations.All(r => r.IsConfirmed) ? "Đã xác nhận" :
                            relatedReservations.Any(r => r.IsConfirmed) ? "Một phần xác nhận" : "Chờ xác nhận",
                    SlotCodes = relatedReservations.Select(r => r.SlotCode).Where(s => !string.IsNullOrEmpty(s)).ToList(),
                    SlotDetails = slotDetails
                };

                groupedActivities.Add(activity);

                if (groupedActivities.Count >= 5)
                    break;
            }

            // Thống kê theo ngày trong tuần (7 ngày gần nhất)
            var weeklyStats = new List<DailyStats>();
            for (int i = 6; i >= 0; i--)
            {
                var date = DateTime.Now.AddDays(-i).Date;
                var count = await _context.Reservations
                    .CountAsync(r => r.ReservedAt.Date == date);

                weeklyStats.Add(new DailyStats
                {
                    Day = date.ToString("dd/MM"),
                    DayName = GetVietnameseDayName(date.DayOfWeek),
                    Count = count
                });
            }

            // Thống kê trạng thái
            var statusStats = new StatusStats
            {
                Confirmed = confirmedReservations,
                Pending = totalReservations - confirmedReservations,
                Expired = await _context.Reservations
                    .CountAsync(r => r.ExpiresAt.HasValue && r.ExpiresAt < DateTime.Now && !r.IsConfirmed)
            };

            // Truyền dữ liệu qua ViewData
            ViewData["TotalUsers"] = totalUsers;
            ViewData["TotalReservations"] = totalReservations;
            ViewData["ConfirmedReservations"] = confirmedReservations;
            ViewData["AvailableSlots"] = availableSlots;

            ViewData["UserGrowth"] = userGrowth;
            ViewData["ReservationGrowth"] = reservationGrowth;
            ViewData["ConfirmedGrowth"] = confirmedGrowth;

            ViewData["RecentActivities"] = groupedActivities;
            ViewData["WeeklyStats"] = weeklyStats;
            ViewData["StatusStats"] = statusStats;

            return View();
        }

        // Helper method để gửi thông báo SignalR khi có thay đổi
        public async Task NotifyDashboardUpdate(string eventType, object data)
        {
            await _hubContext.Clients.Group("ParkingLot").SendAsync("DashboardUpdate", eventType, data);
        }

        // Các method để gửi thông báo cụ thể
        public async Task NotifySlotReserved(string slotCode, string customerName)
        {
            await _hubContext.Clients.Group("ParkingLot").SendAsync("SlotReserved", slotCode, customerName);
        }

        public async Task NotifySlotConfirmed(string slotCode, string customerName)
        {
            await _hubContext.Clients.Group("ParkingLot").SendAsync("SlotConfirmed", slotCode, customerName);
        }

        public async Task NotifySlotReleased(string slotCode)
        {
            await _hubContext.Clients.Group("ParkingLot").SendAsync("SlotReleased", slotCode);
        }

        public async Task NotifySlotCancelled(string slotCode, string customerName)
        {
            await _hubContext.Clients.Group("ParkingLot").SendAsync("SlotCancelled", slotCode, customerName);
        }

        public async Task NotifyMultipleSlotsReserved(List<string> slotCodes, string customerName)
        {
            await _hubContext.Clients.Group("ParkingLot").SendAsync("MultipleSlotsReserved", slotCodes, customerName);
        }

        public async Task NotifyMultipleSlotsConfirmed(List<string> slotCodes, string customerName)
        {
            await _hubContext.Clients.Group("ParkingLot").SendAsync("MultipleSlotsConfirmed", slotCodes, customerName);
        }

        public async Task NotifyMultipleSlotsReleased(List<string> slotCodes)
        {
            await _hubContext.Clients.Group("ParkingLot").SendAsync("MultipleSlotsReleased", slotCodes);
        }

        public async Task NotifyMultipleSlotsCancel(List<string> slotCodes, string customerName)
        {
            await _hubContext.Clients.Group("ParkingLot").SendAsync("MultipleSlotsCancel", slotCodes, customerName);
        }
        // Method để gửi thông báo thanh toán thành công cho single slot
        public async Task NotifyPaymentSuccess(string slotCode, string customerName, object paymentData = null)
        {
            await _hubContext.Clients.Group("ParkingLot").SendAsync("PaymentSuccess", slotCode, customerName, paymentData);
        }

        // Method để gửi thông báo thanh toán thành công cho multiple slots
        public async Task NotifyMultiplePaymentSuccess(List<string> slotCodes, string customerName, object paymentData = null)
        {
            await _hubContext.Clients.Group("ParkingLot").SendAsync("MultiplePaymentSuccess", slotCodes, customerName, paymentData);
        }

        private string GetVietnameseDayName(DayOfWeek dayOfWeek)
        {
            return dayOfWeek switch
            {
                DayOfWeek.Monday => "T2",
                DayOfWeek.Tuesday => "T3",
                DayOfWeek.Wednesday => "T4",
                DayOfWeek.Thursday => "T5",
                DayOfWeek.Friday => "T6",
                DayOfWeek.Saturday => "T7",
                DayOfWeek.Sunday => "CN",
                _ => ""
            };
        }

        public IActionResult Transactions()
        {
            return View("Transactions/Index");
        }

        public IActionResult ParkingSlots()
        {
            var slots = _context.ParkingSlots.ToList();
            return View("ParkingSlots/Index");
        }

        public IActionResult Account()
        {
            return View("Account/Index");
        }
    }

    // Models hỗ trợ cho Dashboard
    public class RecentActivity
    {
        public DateTime Time { get; set; }
        public string UserName { get; set; }
        public string Action { get; set; }
        public string Status { get; set; }
        public string SlotCode { get; set; } // Giữ lại để tương thích
        public List<string> SlotCodes { get; set; } = new List<string>(); // Mới - hỗ trợ nhiều slot
        public List<SlotDetail> SlotDetails { get; set; } = new List<SlotDetail>(); // Chi tiết các slot
    }

    public class SlotDetail
    {
        public string SlotCode { get; set; }
        public string Floor { get; set; }
        public string Area { get; set; }
        public bool IsConfirmed { get; set; }
    }

    public class DailyStats
    {
        public string Day { get; set; }
        public string DayName { get; set; }
        public int Count { get; set; }
    }

    public class StatusStats
    {
        public int Confirmed { get; set; }
        public int Pending { get; set; }
        public int Expired { get; set; }
    }
}