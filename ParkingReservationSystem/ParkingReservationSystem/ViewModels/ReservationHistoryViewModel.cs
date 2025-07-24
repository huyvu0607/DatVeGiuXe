namespace ParkingReservationSystem.ViewModels
{
    public class ReservationHistoryViewModel
    {
        public int Id { get; set; }
        public string SlotCode { get; set; }
        public DateTime ReservedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public bool IsConfirmed { get; set; }
    }
}
