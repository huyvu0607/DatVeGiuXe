using System;
using System.Collections.Generic;

namespace ParkingReservationSystem.Models;

public partial class ParkingSlot
{
    public int Id { get; set; }

    public string SlotCode { get; set; } = null!;

    public bool IsAvailable { get; set; }
}
