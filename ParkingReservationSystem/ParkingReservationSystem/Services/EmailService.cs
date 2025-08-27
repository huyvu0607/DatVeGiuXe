using ParkingReservationSystem.Models;

namespace ParkingReservationSystem.Services
{
    public class EmailService : IEmailService
    {
        public Task SendEmailConfirmationAsync(string email, string confirmationUrl)
        {
            throw new NotImplementedException();
        }

        public Task SendMultipleReservationConfirmationAsync(List<Reservation> reservations)
        {
            throw new NotImplementedException();
        }

        public Task SendPasswordResetEmailAsync(string email, string resetUrl)
        {
            throw new NotImplementedException();
        }

        public Task SendReservationConfirmationAsync(Reservation reservation)
        {
            throw new NotImplementedException();
        }
    }
}
