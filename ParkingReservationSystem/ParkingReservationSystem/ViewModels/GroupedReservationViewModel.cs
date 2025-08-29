using ParkingReservationSystem.Models;

namespace ParkingReservationSystem.ViewModels
{
    public class GroupedReservationViewModel
    {
        public string GroupId { get; set; }
        public int? UserId { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public DateTime ReservedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }

        // Danh sách các reservation trong group
        public List<Reservation> Reservations { get; set; } = new List<Reservation>();

        // Thống kê
        public int TotalSlots { get; set; }
        public int ConfirmedSlots { get; set; }
        public int PendingSlots { get; set; }
        public int ExpiredSlots { get; set; }

        // Trạng thái
        public bool IsAllConfirmed { get; set; }
        public bool HasExpired { get; set; }

        // Danh sách slot codes
        public List<string> SlotCodes { get; set; } = new List<string>();

        // Properties for display
        public string SlotsDisplay => string.Join(", ", SlotCodes);
        public string StatusDisplay
        {
            get
            {
                if (IsAllConfirmed) return "Tất cả đã xác nhận";
                if (HasExpired) return "Có slot đã hết hạn";
                return "Chờ xác nhận";
            }
        }

        public string StatusClass
        {
            get
            {
                if (IsAllConfirmed) return "status-confirmed";
                if (HasExpired) return "status-expired";
                return "status-pending";
            }
        }

        public string StatusIcon
        {
            get
            {
                if (IsAllConfirmed) return "fa-check-circle";
                if (HasExpired) return "fa-times-circle";
                return "fa-clock";
            }
        }
    }
}
