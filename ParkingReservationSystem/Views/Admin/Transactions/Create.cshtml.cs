using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using ParkingReservationSystem.Models;

namespace ParkingReservationSystem.Views.Admin.History
{
    public class CreateModel : PageModel
    {
        private readonly ParkingReservationSystem.Models.ParkingDbContext _context;

        public CreateModel(ParkingReservationSystem.Models.ParkingDbContext context)
        {
            _context = context;
        }

        public IActionResult OnGet()
        {
        ViewData["SlotCode"] = new SelectList(_context.ParkingSlots, "SlotCode", "SlotCode");
        ViewData["UserId"] = new SelectList(_context.Users, "Id", "Id");
            return Page();
        }

        [BindProperty]
        public Reservation Reservation { get; set; } = default!;

        // For more information, see https://aka.ms/RazorPagesCRUD.
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            _context.Reservations.Add(Reservation);
            await _context.SaveChangesAsync();

            return RedirectToPage("./Index");
        }
    }
}
