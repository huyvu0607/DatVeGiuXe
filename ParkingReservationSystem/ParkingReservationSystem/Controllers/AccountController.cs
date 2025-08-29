using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Crypto.Generators;
using ParkingReservationSystem.Models;
using ParkingReservationSystem.Services;
using ParkingReservationSystem.ViewModels;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace ParkingReservationSystem.Controllers
{

    public class AccountController : Controller
    {
        private readonly ParkingDbContext _context;
        private readonly IUserService _userService;
        private readonly IEmailService _emailService;


        public AccountController(ParkingDbContext context, IUserService userService, IEmailService emailService)
        {
            _context = context;
            _userService = userService;
            _emailService = emailService;
        }

        public IActionResult Register()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            try
            {
                // Validate model first
                if (!ModelState.IsValid)
                {
                    ViewBag.Error = "Vui lòng kiểm tra lại thông tin nhập vào.";
                    return View(model);
                }

                // Kiểm tra email đã tồn tại chưa (QUAN TRỌNG: phải trim và lowercase)
                var normalizedEmail = model.Email?.Trim().ToLower();
                if (string.IsNullOrWhiteSpace(normalizedEmail))
                {
                    ModelState.AddModelError("Email", "Email là bắt buộc.");
                    ViewBag.Error = "Email là bắt buộc.";
                    return View(model);
                }

                // Kiểm tra email trùng lặp - sử dụng async để tránh blocking
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

                if (existingUser != null)
                {
                    // Thêm lỗi vào field Email cụ thể
                    ModelState.AddModelError("Email", "Email này đã được sử dụng. Vui lòng chọn email khác.");
                    ViewBag.Error = "Email này đã được sử dụng. Vui lòng chọn email khác.";

                    // Log để debug (nếu cần)
                    // Console.WriteLine($"Email duplicate attempt: {normalizedEmail}");

                    return View(model);
                }

                // Validate dữ liệu bổ sung với thông báo cụ thể
                if (string.IsNullOrWhiteSpace(model.Name) || model.Name.Trim().Length < 2)
                {
                    ModelState.AddModelError("Name", "Họ tên phải có ít nhất 2 ký tự.");
                    ViewBag.Error = "Thông tin họ tên không hợp lệ.";
                    return View(model);
                }

                if (string.IsNullOrWhiteSpace(model.Password) || model.Password.Length < 6)
                {
                    ModelState.AddModelError("Password", "Mật khẩu phải có ít nhất 6 ký tự.");
                    ViewBag.Error = "Mật khẩu không đủ mạnh.";
                    return View(model);
                }

                // Validate email format (thêm validation phía server)
                if (!IsValidEmail(normalizedEmail))
                {
                    ModelState.AddModelError("Email", "Định dạng email không hợp lệ.");
                    ViewBag.Error = "Định dạng email không hợp lệ.";
                    return View(model);
                }

                // Tạo user mới với dữ liệu đã được chuẩn hóa
                var user = new User
                {
                    Name = model.Name.Trim(),
                    Email = normalizedEmail, // Sử dụng email đã chuẩn hóa
                    PasswordHash = ComputeSha256Hash(model.Password),
                    Role = "User",
                    // CreatedAt = DateTime.UtcNow, // Uncomment nếu có field này
                    // IsActive = true // Uncomment nếu có field này
                };

                _context.Users.Add(user);

                // Sử dụng SaveChangesAsync để xử lý async
                await _context.SaveChangesAsync();

                // Lưu thông tin vào session
                HttpContext.Session.SetInt32("UserId", user.Id);
                HttpContext.Session.SetString("UserName", user.Name);
                HttpContext.Session.SetString("UserEmail", user.Email);
                HttpContext.Session.SetString("UserRole", user.Role);

                ViewBag.Success = "Đăng ký tài khoản thành công!";
                ViewBag.RedirectToLogin = true; // Để JavaScript biết cần redirect
                return View(model);
            }
            catch (DbUpdateException ex)
            {
                // Xử lý lỗi database constraint một cách chi tiết hơn
                var innerMessage = ex.InnerException?.Message?.ToLower() ?? ex.Message.ToLower();

                Console.WriteLine($"DbUpdateException: {ex.Message}");
                Console.WriteLine($"InnerException: {ex.InnerException?.Message}");

                if (innerMessage.Contains("unique") ||
                    innerMessage.Contains("duplicate") ||
                    innerMessage.Contains("email") ||
                    innerMessage.Contains("ix_") || // Index constraint
                    innerMessage.Contains("pk_"))   // Primary key constraint
                {
                    ModelState.AddModelError("Email", "Email này đã được sử dụng. Vui lòng chọn email khác.");
                    ViewBag.Error = "Email này đã được sử dụng. Vui lòng chọn email khác.";
                }
                else
                {
                    ModelState.AddModelError(string.Empty, "Có lỗi xảy ra với cơ sở dữ liệu. Vui lòng thử lại sau.");
                    ViewBag.Error = "Có lỗi xảy ra với cơ sở dữ liệu. Vui lòng thử lại sau.";
                }

                // Log chi tiết để debug
                Console.WriteLine($"Database error during registration for email: {model.Email}");

                return View(model);
            }
            catch (Exception ex)
            {
                // Log lỗi chi tiết
                Console.WriteLine($"Unexpected error during registration: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");

                ModelState.AddModelError(string.Empty, "Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại sau.");
                ViewBag.Error = "Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại sau.";

                return View(model);
            }
        }

        // Thêm method validate email
        private bool IsValidEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            try
            {
                var emailRegex = new System.Text.RegularExpressions.Regex(
                    @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                return emailRegex.IsMatch(email);
            }
            catch
            {
                return false;
            }
        }

        // Thêm API endpoint để check email availability (tùy chọn)
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CheckEmailAvailability([FromBody] CheckEmailRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Email))
            {
                return Json(new { isAvailable = false, message = "Email không hợp lệ" });
            }

            var normalizedEmail = request.Email.Trim().ToLower();
            var exists = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);

            return Json(new
            {
                isAvailable = !exists,
                message = exists ? "Email đã được sử dụng" : "Email có thể sử dụng"
            });
        }
        public IActionResult Login()
        {
            return View();
        }

        /*[HttpPost]
        public IActionResult Login(LoginViewModel model)
        {    
            if (!ModelState.IsValid)
                return View(model);

            var user = _context.Users.FirstOrDefault(u => u.Email == model.Email);

            if (user == null || user.PasswordHash != ComputeSha256Hash(model.Password))
            {
                ModelState.AddModelError("", "Email hoặc mật khẩu không đúng.");
                return View(model);
            }

            HttpContext.Session.SetInt32("UserId", user.Id);
            HttpContext.Session.SetString("UserName", user.Name);
            HttpContext.Session.SetString("UserEmail", user.Email);
            HttpContext.Session.SetString("UserRole", user.Role);

            if (user.Role == "Admin")
            {
                return RedirectToAction("Dashboard", "Admin");
            }
            else
            {
                return RedirectToAction("Index", "Home");
            }
        }*/

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            if (!ModelState.IsValid)
            {
                // Thêm thông báo lỗi cụ thể cho client-side
                ViewBag.Error = "Vui lòng kiểm tra lại thông tin nhập vào.";
                return View(model);
            }

            try
            {
                var user = _context.Users.FirstOrDefault(u => u.Email == model.Email);

                if (user == null)
                {
                    // Lỗi cụ thể khi không tìm thấy email
                    ModelState.AddModelError(string.Empty, "Email không tồn tại trong hệ thống.");
                    ViewBag.Error = "Email không tồn tại trong hệ thống.";
                    return View(model);
                }

                if (user.PasswordHash != ComputeSha256Hash(model.Password))
                {
                    // Lỗi cụ thể khi mật khẩu sai
                    ModelState.AddModelError(string.Empty, "Mật khẩu không đúng.");
                    ViewBag.Error = "Mật khẩu không đúng.";
                    return View(model);
                }

                // Tạo danh sách claims
                var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        };

                // Lưu thông tin vào session
                HttpContext.Session.SetInt32("UserId", user.Id);
                HttpContext.Session.SetString("UserName", user.Name);
                HttpContext.Session.SetString("UserEmail", user.Email);
                HttpContext.Session.SetString("UserRole", user.Role);
                HttpContext.Session.SetString("UserPhone", user.Phone ?? "");

                var claimsIdentity = new ClaimsIdentity(claims, "MyCookieAuth");

                var authProperties = new AuthenticationProperties
                { 
                    ExpiresUtc = DateTimeOffset.UtcNow.AddDays(30)
                };

                // Đăng nhập bằng Cookie
                await HttpContext.SignInAsync("MyCookieAuth", new ClaimsPrincipal(claimsIdentity), authProperties);

                // Thông báo đăng nhập thành công
                TempData["SuccessMessage"] = $"Chào mừng {user.Name}! Đăng nhập thành công.";

                // Chuyển hướng theo Role
                if (user.Role == "Admin")
                {
                    return RedirectToAction("Dashboard", "Admin");
                }

                return RedirectToAction("Index", "Home");
            }
            catch (Exception ex)
            {
                // Log lỗi nếu có logging service
                // _logger?.LogError(ex, "Error during login attempt for email: {Email}", model.Email);

                ModelState.AddModelError(string.Empty, "Có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại.");
                ViewBag.Error = "Có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại.";
                return View(model);
            }
        }
        /* public IActionResult Logout()
         {
             HttpContext.Session.Clear();
             return RedirectToAction("Index", "Home");
         }*/
        public async Task<IActionResult> Logout()
        {
            HttpContext.Session.Clear();
            await HttpContext.SignOutAsync("MyCookieAuth");
            return RedirectToAction("Index", "Home");
        }

        private string ComputeSha256Hash(string rawData)
        {
            using (SHA256 sha256Hash = SHA256.Create())
            {
                byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(rawData));
                StringBuilder builder = new StringBuilder();
                for (int i = 0; i < bytes.Length; i++)
                {
                    builder.Append(bytes[i].ToString("x2"));
                }
                return builder.ToString();
            }
        }

        // Quên mật khẩu    

        [HttpGet]
        public IActionResult ForgotPassword()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var user = await _userService.GetUserByEmailAsync(model.Email);
            if (user == null)
            {
                // Không tiết lộ thông tin email có tồn tại hay không
                ViewBag.Success = "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.";
                return View();
            }

            // Tạo token reset password
            var token = await _userService.GeneratePasswordResetTokenAsync(user);
            var callbackUrl = Url.Action("ResetPassword", "Account", new { token = token, email = user.Email }, Request.Scheme);

            // Gửi email (cần implement email service)
            await _emailService.SendPasswordResetEmailAsync(user.Email, callbackUrl);

            ViewBag.Success = "Liên kết đặt lại mật khẩu đã được gửi đến email của bạn.";
            return View();
        }

        [HttpGet]
        public IActionResult ResetPassword(string token, string email)
        {
            if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(email))
            {
                ViewBag.Error = "Liên kết đặt lại mật khẩu không hợp lệ.";
                return View();
            }

            var model = new ResetPasswordViewModel
            {
                Token = token,
                Email = email
            };

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResetPassword(ResetPasswordViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = await _userService.ResetPasswordAsync(model.Email, model.Token, model.NewPassword);
            if (result.Succeeded)
            {
                ViewBag.Success = "Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập với mật khẩu mới.";
                return RedirectToAction("Login");
            }

            ViewBag.Error = "Có lỗi xảy ra khi đặt lại mật khẩu. Vui lòng thử lại.";
            return View(model);
        }
    }
}
