using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace ParkingReservationSystem.Models;

public partial class User
{
    public int Id { get; set; }

    public string? Name { get; set; }

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string Role { get; set; } = "User";

<<<<<<< HEAD
    public string? Phone { get; set; }
    public string? Address { get; set; }

=======
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
    public virtual ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();

    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiry { get; set; }

    [NotMapped]
    [DataType(DataType.Password)]
    [Compare("Password", ErrorMessage = "Mật khẩu xác nhận không khớp")]
    public string? ConfirmPassword { get; set; }

}
