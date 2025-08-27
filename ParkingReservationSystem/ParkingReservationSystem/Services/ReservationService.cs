using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ParkingReservationSystem.Hubs;
using ParkingReservationSystem.Models;

namespace ParkingReservationSystem.Services
{
    public class ReservationService
    {
        private readonly ParkingDbContext _context;
        private readonly IHubContext<ParkingHub> _hubContext;

        public ReservationService(ParkingDbContext context, IHubContext<ParkingHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // Example method for creating a reservation
        public async Task<bool> CreateReservation(string slotCode, int userId, string customerName)
        {
            try
            {
                var slot = await _context.ParkingSlots
                    .FirstOrDefaultAsync(s => s.SlotCode == slotCode && s.IsAvailable);

                if (slot == null)
                    return false;

                var reservation = new Reservation
                {
                    SlotCode = slotCode,
                    UserId = userId,
                    Name = customerName,
                    ReservedAt = DateTime.Now,
                    IsConfirmed = false,
                    ExpiresAt = DateTime.Now.AddMinutes(15) // 15 minutes to confirm
                };

                _context.Reservations.Add(reservation);
                slot.IsAvailable = false;

                await _context.SaveChangesAsync();

                // Send SignalR notification
                await _hubContext.Clients.Group("ParkingLot")
                    .SendAsync("SlotReserved", slotCode, customerName);

                return true;
            }
            catch (Exception ex)
            {
                // Log error
                return false;
            }
        }

        // Example method for confirming a reservation
        public async Task<bool> ConfirmReservation(int reservationId)
        {
            try
            {
                var reservation = await _context.Reservations
                    .Include(r => r.User)
                    .FirstOrDefaultAsync(r => r.Id == reservationId);

                if (reservation == null)
                    return false;

                reservation.IsConfirmed = true;
                reservation.ExpiresAt = DateTime.Now.AddHours(2); // Extended time after confirmation

                await _context.SaveChangesAsync();

                // Send SignalR notification
                await _hubContext.Clients.Group("ParkingLot")
                    .SendAsync("SlotConfirmed", reservation.SlotCode,
                        reservation.Name ?? reservation.User?.Name ?? "Unknown");

                return true;
            }
            catch (Exception ex)
            {
                // Log error
                return false;
            }
        }

        // Example method for cancelling a reservation
        public async Task<bool> CancelReservation(int reservationId)
        {
            try
            {
                var reservation = await _context.Reservations
                    .Include(r => r.User)
                    .Include(r => r.ParkingSlot)
                    .FirstOrDefaultAsync(r => r.Id == reservationId);

                if (reservation == null)
                    return false;

                // Free up the slot
                if (reservation.ParkingSlot != null)
                {
                    reservation.ParkingSlot.IsAvailable = true;
                }

                // Remove or mark as cancelled
                _context.Reservations.Remove(reservation);
                await _context.SaveChangesAsync();

                // Send SignalR notification
                await _hubContext.Clients.Group("ParkingLot")
                    .SendAsync("SlotCancelled", reservation.SlotCode,
                        reservation.Name ?? reservation.User?.Name ?? "Unknown");

                return true;
            }
            catch (Exception ex)
            {
                // Log error
                return false;
            }
        }

        // Example method for handling multiple reservations
        public async Task<bool> CreateMultipleReservations(List<string> slotCodes, int userId, string customerName)
        {
            try
            {
                var availableSlots = await _context.ParkingSlots
                    .Where(s => slotCodes.Contains(s.SlotCode) && s.IsAvailable)
                    .ToListAsync();

                if (availableSlots.Count != slotCodes.Count)
                    return false;

                var reservations = new List<Reservation>();
                foreach (var slot in availableSlots)
                {
                    var reservation = new Reservation
                    {
                        SlotCode = slot.SlotCode,
                        UserId = userId,
                        Name = customerName,
                        ReservedAt = DateTime.Now,
                        IsConfirmed = false,
                        ExpiresAt = DateTime.Now.AddMinutes(15)
                    };

                    reservations.Add(reservation);
                    slot.IsAvailable = false;
                }

                _context.Reservations.AddRange(reservations);
                await _context.SaveChangesAsync();

                // Send SignalR notification for multiple slots
                await _hubContext.Clients.Group("ParkingLot")
                    .SendAsync("MultipleSlotsReserved", slotCodes, customerName);

                return true;
            }
            catch (Exception ex)
            {
                // Log error
                return false;
            }
        }

        // Example method for releasing expired reservations (could be called by a background service)
        public async Task ReleaseExpiredReservations()
        {
            try
            {
                var expiredReservations = await _context.Reservations
                    .Include(r => r.ParkingSlot)
                    .Include(r => r.User)
                    .Where(r => r.ExpiresAt.HasValue &&
                               r.ExpiresAt < DateTime.Now &&
                               !r.IsConfirmed)
                    .ToListAsync();

                if (expiredReservations.Any())
                {
                    var releasedSlots = new List<string>();

                    foreach (var reservation in expiredReservations)
                    {
                        if (reservation.ParkingSlot != null)
                        {
                            reservation.ParkingSlot.IsAvailable = true;
                            releasedSlots.Add(reservation.SlotCode);
                        }
                    }

                    _context.Reservations.RemoveRange(expiredReservations);
                    await _context.SaveChangesAsync();

                    // Send SignalR notification
                    if (releasedSlots.Count == 1)
                    {
                        await _hubContext.Clients.Group("ParkingLot")
                            .SendAsync("SlotReleased", releasedSlots.First());
                    }
                    else if (releasedSlots.Count > 1)
                    {
                        await _hubContext.Clients.Group("ParkingLot")
                            .SendAsync("MultipleSlotsReleased", releasedSlots);
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error
            }
        }
    }
}
