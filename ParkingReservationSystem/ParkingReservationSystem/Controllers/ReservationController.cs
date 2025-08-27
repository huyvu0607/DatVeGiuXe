using Microsoft.AspNetCore.Mvc;
using ParkingReservationSystem.Models;
using ParkingReservationSystem.ViewModels;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using SelectPdf;
using QRCoder;
using System.Drawing;
using System.Drawing.Imaging;
using System.Linq;
using ParkingReservationSystem.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace ParkingReservationSystem.Controllers
{
    public class ReservationController : Controller
    {
        private readonly ParkingDbContext _context;
        private readonly IHubContext<ParkingHub> _hubContext;

        public ReservationController(ParkingDbContext context, IHubContext<ParkingHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
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
        public async Task<IActionResult> CancelMultipleReservation()
        {
            if (TempData["ReservationIds"] is string idsStr && !string.IsNullOrEmpty(idsStr))
            {
                var ids = idsStr.Split(',').Select(int.Parse).ToList();

                var reservations = _context.Reservations
                    .Where(r => ids.Contains(r.Id))
                    .ToList();

                // Lưu thông tin để gửi SignalR
                var slotCodes = reservations.Select(r => r.SlotCode).ToList();
                var customerName = reservations.FirstOrDefault()?.Name ?? "Khách hàng";

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

                // Gửi thông báo qua SignalR sau khi lưu thành công
                if (affected > 0)
                {
                    if (slotCodes.Count == 1)
                    {
                        await _hubContext.Clients.Group("ParkingGroup")
                            .SendAsync("SlotCancelled", slotCodes.First(), customerName);
                    }
                    else
                    {
                        await _hubContext.Clients.Group("ParkingGroup")
                            .SendAsync("MultipleSlotsCancel", slotCodes, customerName);
                    }
                }
            }

            return RedirectToAction("Index", "Home");
        }

        // THÊM MỚI: Phương thức POST để xử lý hủy từ trang thanh toán
        [HttpPost]
        public async Task<IActionResult> CancelMultipleReservation(List<int> reservationIds)
        {
            try
            {
                if (reservationIds == null || !reservationIds.Any())
                {
                    TempData["ErrorMessage"] = "Không có đặt chỗ nào để hủy.";
                    return RedirectToAction("Index", "Home");
                }

                // Lấy thông tin reservations trước khi xóa để có slotCode
                var reservations = _context.Reservations
                    .Where(r => reservationIds.Contains(r.Id))
                    .ToList();

                if (!reservations.Any())
                {
                    TempData["ErrorMessage"] = "Không tìm thấy đặt chỗ cần hủy.";
                    return RedirectToAction("Index", "Home");
                }

                var slotCodes = reservations.Select(r => r.SlotCode).ToList();
                var customerName = reservations.First().Name;

                // Hủy đặt chỗ trong database
                foreach (var res in reservations)
                {
                    var slot = _context.ParkingSlots.FirstOrDefault(s => s.SlotCode == res.SlotCode);
                    if (slot != null)
                    {
                        slot.IsAvailable = true;
                        _context.ParkingSlots.Update(slot);
                    }

                    _context.Reservations.Remove(res);
                }

                var affected = _context.SaveChanges();

                if (affected > 0)
                {
                    // Gửi thông báo qua SignalR để cập nhật UI cho tất cả users
                    if (slotCodes.Count == 1)
                    {
                        await _hubContext.Clients.Group("ParkingGroup")
                            .SendAsync("SlotCancelled", slotCodes.First(), customerName);
                    }
                    else
                    {
                        await _hubContext.Clients.Group("ParkingGroup")
                            .SendAsync("MultipleSlotsCancel", slotCodes, customerName);
                    }

                    TempData["SuccessMessage"] = $"Đã hủy thành công {slotCodes.Count} đặt chỗ.";
                }
                else
                {
                    TempData["ErrorMessage"] = "Không thể hủy đặt chỗ. Vui lòng thử lại.";
                }
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi hủy đặt chỗ: " + ex.Message;
            }

            return RedirectToAction("Index", "Home");
        }

        // THÊM MỚI: Phương thức xác nhận thanh toán nhiều chỗ
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

                if (affected > 0)
                {
                    // Gửi thông báo qua SignalR
                    await _hubContext.Clients.Group("ParkingGroup")
                        .SendAsync("MultipleSlotsConfirmed", slotCodes, customerName);

                    TempData["SuccessMessage"] = $"Đã xác nhận thành công {slotCodes.Count} đặt chỗ.";
                }
                else
                {
                    TempData["ErrorMessage"] = "Không thể xác nhận. Vui lòng thử lại.";
                }
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
            string qrContent = $"Mã chỗ: {reservation.SlotCode}\nTầng: {reservation.ParkingSlot.Floor}";

            using (QRCodeGenerator qrGenerator = new QRCodeGenerator())
            using (QRCodeData qrCodeData = qrGenerator.CreateQrCode(qrContent, QRCodeGenerator.ECCLevel.Q))
            {
                var qrCode = new PngByteQRCode(qrCodeData);  // KHÔNG dùng QRCode (bitmap)
                byte[] qrBytes = qrCode.GetGraphic(20);
                ViewBag.QRCode = "data:image/png;base64," + Convert.ToBase64String(qrBytes);
            }

            return View(reservation);
        }

        public IActionResult ExportToPdf(int id)
        {
            var reservation = _context.Reservations
                .Include(r => r.ParkingSlot)
                .FirstOrDefault(r => r.Id == id);

            // Kiểm tra tồn tại và đã thanh toán
            if (reservation == null || !reservation.IsConfirmed)
            {
                return NotFound("Không thể xuất PDF. Chỗ không tồn tại hoặc chưa thanh toán.");
            }

            // Tạo nội dung QR
            string qrContent = $"Mã chỗ: {reservation.SlotCode}\nTầng: {reservation.ParkingSlot.Floor}\nTên: {reservation.Name}\nEmail: {reservation.Email}\nĐến: {reservation.ExpiresAt?.ToString("HH:mm dd/MM/yyyy")}";
            string qrBase64;

            using (QRCodeGenerator qrGenerator = new QRCodeGenerator())
            using (QRCodeData qrCodeData = qrGenerator.CreateQrCode(qrContent, QRCodeGenerator.ECCLevel.Q))
            {
                var qrCode = new PngByteQRCode(qrCodeData);
                byte[] qrBytes = qrCode.GetGraphic(20);
                qrBase64 = Convert.ToBase64String(qrBytes);
            }

            // Tạo HTML có chứa mã QR
            string htmlContent = $@"
            <div style='font-family: Arial, sans-serif; padding: 20px;'>
                <h2 style='color: #2c3e50;'>Chi tiết giữ chỗ</h2>
                <div style='display: flex; justify-content: space-between; align-items: flex-start;'>
                    <div>
                        <p><strong>Mã chỗ:</strong> {reservation.SlotCode}</p>
                        <p><strong>Tầng:</strong> {reservation.ParkingSlot.Floor}</p>
                        <p><strong>Tên:</strong> {reservation.Name}</p>
                        <p><strong>Email:</strong> {reservation.Email}</p>
                        <p><strong>Giữ chỗ đến:</strong> {(reservation.ExpiresAt?.ToString("HH:mm dd/MM/yyyy") ?? "Chưa có")}</p>
                    </div>
                    <div>
                        <img src='data:image/png;base64,{qrBase64}' style='width: 150px; height: 150px;' />
                    </div>
                </div>
            </div>";

            // Convert HTML to PDF
            HtmlToPdf converter = new HtmlToPdf();
            PdfDocument doc = converter.ConvertHtmlString(htmlContent);
            byte[] pdf = doc.Save();
            doc.Close();

            return File(pdf, "application/pdf", $"ThongTinGiuCho_{reservation.Id}.pdf");
        }

        public IActionResult MultipleDetail(string ids)
        {
            if (string.IsNullOrEmpty(ids)) return NotFound();

            var slotCodes = ids.Split(',').ToList();

            var Reservations = _context.Reservations
            .Include(r => r.ParkingSlot)
            .Where(r => slotCodes.Contains(r.SlotCode))
            .OrderByDescending(r => r.ReservedAt)
            .ToList();

            // ✅ Lấy thời gian đặt mới nhất trong danh sách
            var latestTime = Reservations.Max(r => r.ReservedAt);

            // ✅ Chỉ lấy những reservation có cùng thời gian đặt mới nhất
            var Slecreservations = Reservations
                .Where(r => r.ReservedAt == latestTime)
                .ToList();


            // Tạo QR cho từng mã
            var qrList = new List<string>();

            foreach (var reservation in Slecreservations)
            {
                // Tạo nội dung QR
                string qrContent = $"Mã chỗ: {reservation.SlotCode}\nTầng: {reservation.ParkingSlot.Floor}";

                using (QRCodeGenerator qrGenerator = new QRCodeGenerator())
                using (QRCodeData qrCodeData = qrGenerator.CreateQrCode(qrContent, QRCodeGenerator.ECCLevel.Q))
                {
                    var qrCode = new PngByteQRCode(qrCodeData);
                    byte[] qrBytes = qrCode.GetGraphic(20);
                    string qrBase64 = "data:image/png;base64," + Convert.ToBase64String(qrBytes);
                    qrList.Add(qrBase64);
                }
            }

            var viewModel = new MultipleDetailViewModel
            {
                Reservations = Slecreservations,
                QRBase64List = qrList
            };

            return View(viewModel);
        }

        [HttpPost]
        public async Task<IActionResult> ProcessPayment(int reservationId, decimal amount, string paymentMethod)
        {
            try
            {
                // Tìm reservation
                var reservation = await _context.Reservations
                    .Include(r => r.ParkingSlot)
                    .Include(r => r.User)
                    .FirstOrDefaultAsync(r => r.Id == reservationId);

                if (reservation == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy đặt chỗ" });
                }

                // Kiểm tra trạng thái
                if (reservation.IsConfirmed)
                {
                    return Json(new { success = false, message = "Đặt chỗ đã được xác nhận" });
                }

                // Xử lý thanh toán (thay thế bằng logic thực tế của bạn)
                bool paymentSuccess = await ProcessSinglePayment(reservationId, amount, paymentMethod);

                if (paymentSuccess)
                {
                    // Cập nhật database
                    reservation.IsConfirmed = true;
                    reservation.ReservedAt = DateTime.Now;

                    await _context.SaveChangesAsync();

                    // Gửi SignalR notification
                    var adminController = HttpContext.RequestServices.GetService<AdminController>();

                    var paymentData = new
                    {
                        floor = reservation.ParkingSlot?.Floor.ToString() ?? "N/A",

                        paymentAmount = amount,
                        paymentMethod = paymentMethod
                    };

                    await adminController.NotifyPaymentSuccess(
                        reservation.SlotCode,
                        reservation.Name ?? reservation.User?.Name ?? "Khách",
                        paymentData
                    );

                    return Json(new { success = true, message = "Thanh toán thành công" });
                }

                return Json(new { success = false, message = "Thanh toán thất bại" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Lỗi: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> ProcessMultiplePayment(List<int> reservationIds, decimal totalAmount, string paymentMethod)
        {
            try
            {
                // Tìm tất cả reservations
                var reservations = await _context.Reservations
                    .Include(r => r.ParkingSlot)
                    .Include(r => r.User)
                    .Where(r => reservationIds.Contains(r.Id))
                    .ToListAsync();

                if (!reservations.Any())
                {
                    return Json(new { success = false, message = "Không tìm thấy đặt chỗ nào" });
                }

                // Kiểm tra trạng thái
                var alreadyConfirmed = reservations.Where(r => r.IsConfirmed).ToList();
                if (alreadyConfirmed.Any())
                {
                    return Json(new { success = false, message = $"{alreadyConfirmed.Count} chỗ đã được xác nhận" });
                }

                // Xử lý thanh toán multiple (thay thế bằng logic thực tế)
                bool paymentSuccess = await ProcessBulkPayment(reservationIds, totalAmount, paymentMethod);

                if (paymentSuccess)
                {
                    // Cập nhật tất cả reservations
                    foreach (var reservation in reservations)
                    {
                        reservation.IsConfirmed = true;
                        reservation.ReservedAt = DateTime.Now;
                    }

                    await _context.SaveChangesAsync();

                    // Gửi SignalR notification
                    var adminController = HttpContext.RequestServices.GetService<AdminController>();
                    var slotCodes = reservations.Select(r => r.SlotCode).ToList();
                    var customerName = reservations.First().Name ?? reservations.First().User?.Name ?? "Khách";

                    var paymentData = new
                    {
                        totalAmount = totalAmount,
                        paymentMethod = paymentMethod,
                        slotCount = reservations.Count
                    };

                    await adminController.NotifyMultiplePaymentSuccess(slotCodes, customerName, paymentData);

                    return Json(new
                    {
                        success = true,
                        message = $"Thanh toán thành công {slotCodes.Count} chỗ đậu",
                        slotCodes = slotCodes
                    });
                }

                return Json(new { success = false, message = "Thanh toán thất bại" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Lỗi: {ex.Message}" });
            }
        }

        // Helper methods - Thay thế bằng logic thanh toán thực tế của bạn
        private async Task<bool> ProcessSinglePayment(int reservationId, decimal amount, string paymentMethod)
        {
            // TODO: Thay thế bằng logic thanh toán thực tế
            // Ví dụ: tích hợp với VNPay, MoMo, Stripe...

            try
            {
                switch (paymentMethod.ToLower())
                {
                    case "vnpay":
                        // return await ProcessVNPayPayment(reservationId, amount);
                        break;
                    case "momo":
                        // return await ProcessMoMoPayment(reservationId, amount);
                        break;
                    case "cash":
                        // Thanh toán tiền mặt - luôn thành công
                        return true;
                    default:
                        return false;
                }

                // Tạm thời return true để test
                await Task.Delay(1000); // Simulate API call
                return true;
            }
            catch
            {
                return false;
            }
        }

        private async Task<bool> ProcessBulkPayment(List<int> reservationIds, decimal totalAmount, string paymentMethod)
        {
            // TODO: Thay thế bằng logic thanh toán bulk thực tế

            try
            {
                // Simulate payment processing
                await Task.Delay(2000);

                // Giả lập thành công 90% trường hợp
                return new Random().Next(1, 11) <= 9;
            }
            catch
            {
                return false;
            }
        }

        // Nếu bạn muốn gọi từ controller khác
        public async Task<bool> NotifyPaymentFromAnotherController(string slotCode, string customerName)
        {
            try
            {
                var adminController = HttpContext.RequestServices.GetService<AdminController>();
                if (adminController != null)
                {
                    await adminController.NotifyPaymentSuccess(slotCode, customerName, null);
                    return true;
                }
                return false;
            }
            catch
            {
                return false;
            }
        }
        // Model classes hỗ trợ
        public class PaymentModel
        {
            public int ReservationId { get; set; }
            public decimal Amount { get; set; }
            public string PaymentMethod { get; set; }
            public string CustomerName { get; set; }
        }

        public class MultiplePaymentModel
        {
            public List<int> ReservationIds { get; set; }
            public decimal TotalAmount { get; set; }
            public string PaymentMethod { get; set; }
            public string CustomerName { get; set; }
        }

        public class PaymentResult
        {
            public bool IsSuccess { get; set; }
            public string Message { get; set; }
            public string TransactionId { get; set; }
        }
    }
}