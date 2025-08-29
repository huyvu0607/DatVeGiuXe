namespace ParkingReservationSystem.Config
{
    public class EmailSettings
    {
        public string Host { get; set; }
        public int Port { get; set; }
        public string SmtpUser { get; set; }
        public string SmtpPass { get; set; }
        public string SenderEmail { get; set; }
        public string SenderName { get; set; }
    }
}
