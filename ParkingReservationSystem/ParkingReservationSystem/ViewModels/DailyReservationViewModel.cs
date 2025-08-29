using ParkingReservationSystem.Models;

namespace ParkingReservationSystem.ViewModels
{
    public class DailyReservationViewModel
    {
        public DateTime ReservationDate { get; set; }
        public List<Reservation> Reservations { get; set; }
        public int TotalReservations { get; set; }
        public int ConfirmedCount { get; set; }
        public int PendingCount { get; set; }
        public int ExpiredCount { get; set; }
        public int UniqueCustomers { get; set; }
        public DateTime FirstReservationTime { get; set; }
        public DateTime LastReservationTime { get; set; }
    }
}
