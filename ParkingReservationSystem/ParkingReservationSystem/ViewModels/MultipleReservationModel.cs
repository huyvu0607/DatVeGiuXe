using System.ComponentModel.DataAnnotations;

namespace ParkingReservationSystem.ViewModels
{
    public class MultipleReservationModel
    {
        [Required(ErrorMessage = "Vui lòng chọn ít nhất một chỗ đỗ")]
        public string[] SlotCodes { get; set; } = new string[0];

        [Required(ErrorMessage = "Vui lòng chọn người dùng")]
        public int? UserId { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập họ tên")]
        [StringLength(100, ErrorMessage = "Họ tên không được vượt quá 100 ký tự")]
        public string Name { get; set; } = "";

        [Required(ErrorMessage = "Vui lòng nhập email")]
        [EmailAddress(ErrorMessage = "Định dạng email không hợp lệ")]
        [StringLength(200, ErrorMessage = "Email không được vượt quá 200 ký tự")]
        public string Email { get; set; } = "";

        [Required(ErrorMessage = "Vui lòng nhập số điện thoại")]
        [Phone(ErrorMessage = "Định dạng số điện thoại không hợp lệ")]
        [StringLength(20, ErrorMessage = "Số điện thoại không được vượt quá 20 ký tự")]
        public string Phone { get; set; } = "";

        [Required(ErrorMessage = "Vui lòng chọn thời gian đặt chỗ")]
        public DateTime ReservedAt { get; set; } = DateTime.Now;

        public bool IsConfirmed { get; set; }

        // Computed property - thời gian hết hạn
        public DateTime ExpiresAt => ReservedAt.AddMinutes(10);

        // Computed property - số lượng chỗ đỗ được chọn
        public int SelectedSlotsCount => SlotCodes?.Length ?? 0;
    }
}
