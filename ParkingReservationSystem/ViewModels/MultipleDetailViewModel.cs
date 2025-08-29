using ParkingReservationSystem.Models;

namespace ParkingReservationSystem.ViewModels
{
    public class MultipleDetailViewModel
    {
        public List<Reservation> Reservations { get; set; } = new();
        public List<string> QRBase64List { get; set; } = new(); // nếu dùng QR
    }
}
