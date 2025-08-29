using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Text;
using ParkingReservationSystem.Config;
using ParkingReservationSystem.Models;
using QRCoder;
using System.Drawing.Imaging;


namespace ParkingReservationSystem.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly EmailSettings _emailSettings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, IOptions<EmailSettings> emailSettings, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _emailSettings = emailSettings.Value;
            _logger = logger;
        }

        // Gửi email xác nhận tài khoản
        public async Task SendEmailConfirmationAsync(string email, string confirmationUrl)
        {
            var subject = "Xác nhận tài khoản - Hệ thống đặt chỗ xe";
            var body = $@"
                <h2>Xác nhận tài khoản</h2>
                <p>Cảm ơn bạn đã đăng ký hệ thống đặt chỗ xe.</p>
                <p>Vui lòng click vào liên kết bên dưới để xác nhận email của bạn:</p>
                <p><a href='{confirmationUrl}' style='background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;'>Xác nhận tài khoản</a></p>
                <p>Nếu bạn không đăng ký, vui lòng bỏ qua email này.</p>
            ";

            await SendEmailAsync(email, subject, body);
        }

        // Gửi email reset mật khẩu
        public async Task SendPasswordResetEmailAsync(string email, string resetUrl)
        {
            var subject = "Đặt lại mật khẩu - Hệ thống đặt chỗ xe";
            var body = $@"
                <h2>Đặt lại mật khẩu</h2>
                <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
                <p>Vui lòng click vào liên kết bên dưới để đặt lại mật khẩu:</p>
                <p><a href='{resetUrl}' style='background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;'>Đặt lại mật khẩu</a></p>
                <p>Liên kết này sẽ hết hạn sau 24 giờ.</p>
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            ";

            await SendEmailAsync(email, subject, body);
        }

        // Hàm chung gửi email
        private async Task SendEmailAsync(string email, string subject, string htmlBody)
        {
            var smtpSettings = _configuration.GetSection("SmtpSettings");

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Hệ thống đặt chỗ xe", smtpSettings["From"]));
            message.To.Add(MailboxAddress.Parse(email));
            message.Subject = subject;
            message.Body = new TextPart(TextFormat.Html) { Text = htmlBody };

            using var client = new SmtpClient();

            // Cho phép debug (in log ra console)
            client.ServerCertificateValidationCallback = (s, c, h, e) => true;

            // ✅ Thử với STARTTLS
            await client.ConnectAsync(smtpSettings["Host"], int.Parse(smtpSettings["Port"]), SecureSocketOptions.StartTls);

            // ✅ Đảm bảo Username/Password là đúng từ MailTrap
            await client.AuthenticateAsync(smtpSettings["Username"], smtpSettings["Password"]);

            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }


        //gửi mail xác nhận đặt chỗ
        // GỬI EMAIL XÁC NHẬN ĐẶT CHỖ - THÊM MỚI
        public async Task SendReservationConfirmationAsync(Reservation reservation)
        {
            try
            {
                var qrCodeBytes = GenerateQRCode(reservation.SlotCode, reservation);
                var qrBase64 = Convert.ToBase64String(qrCodeBytes);
                var subject = $"Xác nhận đặt chỗ - Mã chỗ: {reservation.SlotCode}";
                var body = GenerateSingleReservationEmailBody(reservation.Name, reservation.SlotCode, qrBase64);

                await SendEmailWithEmbeddedQRAsync(reservation.Email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending reservation confirmation email for slot {SlotCode}", reservation.SlotCode);
                throw;
            }
        }

        // GỬI EMAIL XÁC NHẬN NHIỀU CHỖ - THÊM MỚI
        public async Task SendMultipleReservationConfirmationAsync(List<Reservation> reservations)
        {
            try
            {
                var firstReservation = reservations.First();
                var slotCodes = reservations.Select(r => r.SlotCode).ToList();
                var qrCodesBase64 = new Dictionary<string, string>();

                foreach (var reservation in reservations)
                {
                    var qrBytes = GenerateQRCode(reservation.SlotCode, reservation);
                    qrCodesBase64[reservation.SlotCode] = Convert.ToBase64String(qrBytes);
                }

                var subject = $"Xác nhận đặt {slotCodes.Count} chỗ đậu xe";
                var body = GenerateMultipleReservationEmailBody(firstReservation.Name, slotCodes, qrCodesBase64);

                await SendEmailWithEmbeddedQRAsync(firstReservation.Email, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending multiple reservation confirmation email");
                throw;
            }
        }

        // SINH QR CODE - ĐÃ SỬA LỖI
        private byte[] GenerateQRCode(string slotCode, Reservation reservation)
        {
            try
            {
                // Tạo nội dung QR với thông tin chi tiết hơn
                string qrContent = $"Mã chỗ: {slotCode}";
                if (reservation.ParkingSlot != null)
                {
                    qrContent += $"\nTầng: {reservation.ParkingSlot.Floor}";
                }
                qrContent += $"\nKhách hàng: {reservation.Name}";
                qrContent += $"\nThời gian: {DateTime.Now:dd/MM/yyyy HH:mm}";

                using (QRCodeGenerator qrGenerator = new QRCodeGenerator())
                using (QRCodeData qrCodeData = qrGenerator.CreateQrCode(qrContent, QRCodeGenerator.ECCLevel.Q))
                {
                    var qrCode = new PngByteQRCode(qrCodeData);  // SỬ DỤNG PngByteQRCode thay vì QRCode
                    byte[] qrBytes = qrCode.GetGraphic(20);
                    return qrBytes;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating QR code for slot: {SlotCode}", slotCode);
                throw;
            }
        }

        // TEMPLATE EMAIL CHO 1 CHỖ - VỚI QR NHÚNG
        private string GenerateSingleReservationEmailBody(string customerName, string slotCode, string qrBase64)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f7fa; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .content {{ padding: 30px; }}
        .info-box {{ background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px; }}
        .slot-code {{ background: #667eea; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 10px 0; }}
        .qr-section {{ text-align: center; margin: 30px 0; padding: 20px; background: #f8f9ff; border-radius: 12px; }}
        .qr-code {{ max-width: 200px; height: auto; border: 4px solid #667eea; border-radius: 8px; }}
        .footer {{ background: #f8f9ff; padding: 20px; text-align: center; color: #666; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🚗 Xác nhận đặt chỗ thành công</h1>
        </div>
        <div class='content'>
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Cảm ơn bạn đã sử dụng dịch vụ đặt chỗ đậu xe của chúng tôi!</p>
            
            <div class='info-box'>
                <h3>📍 Thông tin chỗ đậu xe</h3>
                <p><strong>Mã chỗ:</strong> <span class='slot-code'>{slotCode}</span></p>
                <p><strong>Thời gian xác nhận:</strong> {DateTime.Now:dd/MM/yyyy HH:mm:ss}</p>
            </div>

            <div class='qr-section'>
                <h3>📱 Mã QR của bạn</h3>
                <img src='data:image/png;base64,{qrBase64}' alt='QR Code' class='qr-code' />
                <p><strong>Vui lòng xuất trình mã QR này tại cổng vào!</strong></p>
            </div>

            <div class='info-box'>
                <h3>📱 Hướng dẫn sử dụng</h3>
                <p>• Mã QR ở trên là bằng chứng đặt chỗ của bạn</p>
                <p>• Vui lòng xuất trình mã QR tại cổng vào bãi đậu xe</p>
                <p>• Lưu email này để tra cứu khi cần thiết</p>
                <p>• Có thể chụp ảnh màn hình để sử dụng offline</p>
            </div>

            <p>Chúc bạn có trải nghiệm tuyệt vời!</p>
        </div>
        <div class='footer'>
            <p>© 2024 Hệ thống đặt chỗ đậu xe | Liên hệ: support@parking.com</p>
        </div>
    </div>
</body>
</html>";
        }

        // TEMPLATE EMAIL CHO NHIỀU CHỖ - VỚI QR NHÚNG
        private string GenerateMultipleReservationEmailBody(string customerName, List<string> slotCodes, Dictionary<string, string> qrCodesBase64)
        {
            var slotsHtml = string.Join("", slotCodes.Select(code => $"<span class='slot-code'>{code}</span>"));

            // Tạo HTML cho từng QR code
            var qrHtml = string.Join("", qrCodesBase64.Select(qr => $@"
                <div class='qr-item'>
                    <h4>Mã chỗ: {qr.Key}</h4>
                    <img src='data:image/png;base64,{qr.Value}' alt='QR Code {qr.Key}' class='qr-code-small' />
                </div>
            "));

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f7fa; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .content {{ padding: 30px; }}
        .info-box {{ background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px; }}
        .slot-code {{ background: #667eea; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 5px; }}
        .slots-container {{ margin: 15px 0; }}
        .qr-section {{ text-align: center; margin: 30px 0; padding: 20px; background: #f8f9ff; border-radius: 12px; }}
        .qr-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px; }}
        .qr-item {{ text-align: center; padding: 15px; background: white; border-radius: 8px; border: 2px solid #667eea; }}
        .qr-code-small {{ max-width: 150px; height: auto; border-radius: 4px; }}
        .footer {{ background: #f8f9ff; padding: 20px; text-align: center; color: #666; }}
        .count-badge {{ background: #00b894; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: bold; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🚗 Xác nhận đặt chỗ thành công</h1>
            <span class='count-badge'>{slotCodes.Count} chỗ</span>
        </div>
        <div class='content'>
            <p>Xin chào <strong>{customerName}</strong>,</p>
            <p>Cảm ơn bạn đã đặt {slotCodes.Count} chỗ đậu xe cùng lúc!</p>
            
            <div class='info-box'>
                <h3>📍 Danh sách chỗ đậu xe</h3>
                <div class='slots-container'>
                    {slotsHtml}
                </div>
                <p><strong>Thời gian xác nhận:</strong> {DateTime.Now:dd/MM/yyyy HH:mm:ss}</p>
            </div>

            <div class='qr-section'>
                <h3>📱 Mã QR cho từng chỗ đậu xe</h3>
                <div class='qr-grid'>
                    {qrHtml}
                </div>
                <p><strong>Vui lòng xuất trình mã QR tương ứng tại từng chỗ!</strong></p>
            </div>

            <div class='info-box'>
                <h3>📱 Hướng dẫn sử dụng</h3>
                <p>• Mỗi chỗ có một mã QR riêng hiển thị ở trên</p>
                <p>• Vui lòng xuất trình mã QR tương ứng tại từng chỗ</p>
                <p>• Lưu email này để tra cứu khi cần thiết</p>
                <p>• Có thể chụp ảnh màn hình từng mã QR để sử dụng offline</p>
                <p>• Tất cả các chỗ đã được xác nhận thành công</p>
            </div>

            <p>Chúc bạn có trải nghiệm tuyệt vời!</p>
        </div>
        <div class='footer'>
            <p>© 2024 Hệ thống đặt chỗ đậu xe | Liên hệ: support@parking.com</p>
        </div>
    </div>
</body>
</html>";
        }

        // GỬI EMAIL VỚI QR CODE NHÚNG TRỰC TIẾP
        private async Task SendEmailWithEmbeddedQRAsync(string email, string subject, string htmlBody)
        {
            var smtpSettings = _configuration.GetSection("SmtpSettings");
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Hệ thống đặt chỗ xe", smtpSettings["From"]));
            message.To.Add(MailboxAddress.Parse(email));
            message.Subject = subject;
            message.Body = new TextPart(TextFormat.Html) { Text = htmlBody };

            using var client = new SmtpClient();
            client.ServerCertificateValidationCallback = (s, c, h, e) => true;
            await client.ConnectAsync(smtpSettings["Host"], int.Parse(smtpSettings["Port"]), SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpSettings["Username"], smtpSettings["Password"]);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }

    }
}