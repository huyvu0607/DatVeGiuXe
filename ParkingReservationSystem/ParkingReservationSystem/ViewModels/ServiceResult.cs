namespace ParkingReservationSystem.ViewModels
{
	public class ServiceResult
	{
		public bool Success { get; set; }
		public string ErrorMessage { get; set; }
		public string SuccessMessage { get; set; }

		public static ServiceResult CreateSuccess(string message = null)
		{
			return new ServiceResult
			{
				Success = true,
				SuccessMessage = message
			};
		}

		public static ServiceResult CreateFailure(string errorMessage)
		{
			return new ServiceResult
			{
				Success = false,
				ErrorMessage = errorMessage
			};
		}

	}
}
