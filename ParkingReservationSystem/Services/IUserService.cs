using Microsoft.AspNetCore.Identity;
using ParkingReservationSystem.Models;
using ParkingReservationSystem.ViewModels;

namespace ParkingReservationSystem.Services
{
    public interface IUserService
    {
        Task<User> GetUserByEmailAsync(string email);
        Task<string> GeneratePasswordResetTokenAsync(User user);
        Task<bool> ValidatePasswordResetTokenAsync(string email, string token);
        Task<IdentityResult> ResetPasswordAsync(string email, string token, string newPassword);
        Task<bool> CheckPasswordAsync(User user, string password);

        Task<ServiceResult> CreateUserAsync(User user);
        Task<User> AuthenticateAsync(string email, string password);
    }
}
