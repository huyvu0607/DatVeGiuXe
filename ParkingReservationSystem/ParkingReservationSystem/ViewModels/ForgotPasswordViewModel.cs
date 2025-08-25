using System.ComponentModel.DataAnnotations;

namespace ParkingReservationSystem.ViewModels
{
	public class ForgotPasswordViewModel
	{
		[Required(ErrorMessage = "Email là bắt buộc")]
		[EmailAddress(ErrorMessage = "Email không hợp lệ")]
		[Display(Name = "Email")]
		public string Email { get; set; }
	}
}
