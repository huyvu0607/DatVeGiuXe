using ParkingReservationSystem.Models;

namespace ParkingReservationSystem.Services
{
    public interface IEmailService
    {
        Task SendPasswordResetEmailAsync(string email, string resetUrl);
        Task SendEmailConfirmationAsync(string email, string confirmationUrl);
        Task SendReservationConfirmationAsync(Reservation reservation);
        Task SendMultipleReservationConfirmationAsync(List<Reservation> reservations);
        
    }
}
