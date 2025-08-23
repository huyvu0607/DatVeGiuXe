using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using ParkingReservationSystem.Models;

namespace ParkingReservationSystem.Views.Admin.History
{
    public class IndexModel : PageModel
    {
        private readonly ParkingReservationSystem.Models.ParkingDbContext _context;

        public IndexModel(ParkingReservationSystem.Models.ParkingDbContext context)
        {
            _context = context;
        }

        public IList<Reservation> Reservation { get;set; } = default!;

        public async Task OnGetAsync()
        {
            Reservation = await _context.Reservations
                .Include(r => r.ParkingSlot)
                .Include(r => r.User).ToListAsync();
        }
    }
}
