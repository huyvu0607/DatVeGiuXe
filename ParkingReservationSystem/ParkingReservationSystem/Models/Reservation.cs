using System;
using System.Collections.Generic;

namespace ParkingReservationSystem.Models;

public partial class Reservation
{
    public int Id { get; set; }

    public string SlotCode { get; set; } = null!;

    public string? Name { get; set; }

    public string Email { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public DateTime ReservedAt { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public bool IsConfirmed { get; set; }

    public int? UserId { get; set; }

    public virtual User? User { get; set; }

    public virtual ParkingSlot ParkingSlot { get; set; }
}
