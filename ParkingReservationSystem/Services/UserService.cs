using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Crypto.Generators;
using ParkingReservationSystem.Models;
using ParkingReservationSystem.ViewModels;
using System.Security.Cryptography;
using System.Text;

namespace ParkingReservationSystem.Services
{
    public class UserService : IUserService
    {
        private readonly ParkingDbContext _context;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly IConfiguration _configuration;
        private readonly ILogger<UserService> _logger;

        public UserService(ParkingDbContext context, IPasswordHasher<User> passwordHasher, IConfiguration configuration)
        {
            _context = context;
            _passwordHasher = passwordHasher;
            _configuration = configuration;
        }

        public async Task<User> GetUserByEmailAsync(string email)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        }

        public async Task<string> GeneratePasswordResetTokenAsync(User user)
        {
            // Tạo token reset password
            var token = Guid.NewGuid().ToString();
            var expiry = DateTime.UtcNow.AddHours(24); // Token hết hạn sau 24h

            user.PasswordResetToken = token;
            user.PasswordResetTokenExpiry = expiry;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return token;
        }

        public async Task<bool> ValidatePasswordResetTokenAsync(string email, string token)
        {
            var user = await GetUserByEmailAsync(email);
            if (user == null) return false;

            return user.PasswordResetToken == token &&
                   user.PasswordResetTokenExpiry.HasValue &&
                   user.PasswordResetTokenExpiry > DateTime.UtcNow;
        }

        public async Task<IdentityResult> ResetPasswordAsync(string email, string token, string newPassword)
        {
            var user = await GetUserByEmailAsync(email);
            if (user == null)
            {
                return IdentityResult.Failed(new IdentityError { Description = "Người dùng không tồn tại" });
            }

            if (!await ValidatePasswordResetTokenAsync(email, token))
            {
                return IdentityResult.Failed(new IdentityError { Description = "Token không hợp lệ hoặc đã hết hạn" });
            }

            // Hash password mới
            user.PasswordHash = ComputeSha256Hash(newPassword);
            user.PasswordResetToken = null;
            user.PasswordResetTokenExpiry = null;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return IdentityResult.Success;
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

        public async Task<bool> CheckPasswordAsync(User user, string password)
        {
            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
            return result == PasswordVerificationResult.Success;
        }

        public async Task<ServiceResult> CreateUserAsync(User user)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Kiểm tra email trùng lặp một lần nữa trước khi tạo
                var existingUser = await GetUserByEmailAsync(user.Email);
                if (existingUser != null)
                {
                    return ServiceResult.CreateFailure("Email này đã được sử dụng. Vui lòng chọn email khác.");
                }

                // Validate user data
                if (string.IsNullOrWhiteSpace(user.Name) || user.Name.Length < 2)
                {
                    return ServiceResult.CreateFailure("Họ tên phải có ít nhất 2 ký tự.");
                }

                if (string.IsNullOrWhiteSpace(user.Email) || !IsValidEmail(user.Email))
                {
                    return ServiceResult.CreateFailure("Email không hợp lệ.");
                }

                if (string.IsNullOrWhiteSpace(user.PasswordHash) || user.PasswordHash.Length < 6)
                {
                    return ServiceResult.CreateFailure("Mật khẩu phải có ít nhất 6 ký tự.");
                }

                // Set additional properties
                //user.CreatedAt = DateTime.UtcNow;
                //user.IsActive = true;
                user.Role = "User"; // Default role

                // Add to database
                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                _logger.LogInformation("User created successfully: {Email}", user.Email);

                return ServiceResult.CreateSuccess("Tài khoản đã được tạo thành công!");
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync();

                // Xử lý các lỗi constraint violation
                if (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true ||
                    ex.InnerException?.Message.Contains("duplicate key") == true ||
                    ex.InnerException?.Message.Contains("Email") == true)
                {
                    _logger.LogWarning("Duplicate email attempt: {Email}", user.Email);
                    return ServiceResult.CreateFailure("Email này đã được sử dụng. Vui lòng chọn email khác.");
                }

                _logger.LogError(ex, "Database error during user creation: {Email}", user.Email);
                return ServiceResult.CreateFailure("Có lỗi xảy ra với cơ sở dữ liệu. Vui lòng thử lại sau.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                _logger.LogError(ex, "Unexpected error during user creation: {Email}", user.Email);
                return ServiceResult.CreateFailure("Có lỗi không mong muốn xảy ra. Vui lòng thử lại sau.");
            }
        }

        public async Task<User> AuthenticateAsync(string email, string password)
        {
            try
            {
                var user = await GetUserByEmailAsync(email);

                if (user == null)
                {
                    return null;
                }

                var hashedPassword = ComputeSha256Hash(password);

                if (user.PasswordHash == hashedPassword)
                {
                    await _context.SaveChangesAsync();
                    return user;
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during authentication for email: {Email}", email);
                return null;
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
    }
}
