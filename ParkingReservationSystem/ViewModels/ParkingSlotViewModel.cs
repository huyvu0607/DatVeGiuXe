namespace ParkingReservationSystem.ViewModels
{
    public class ParkingSlotViewModel
    {
        public string SlotCode { get; set; } = null!;
        public bool IsConfirmed { get; set; } // đã thanh toán
        public bool IsSelected { get; set; } // đang chọn, nếu cần dùng
        public int Floor { get; set; }
    }

}
