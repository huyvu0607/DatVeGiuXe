using System;
using System.Collections.Generic;

namespace ParkingReservationSystem.Models;

public partial class User
{
    public int Id { get; set; }

    public string? Name { get; set; }

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public virtual ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
