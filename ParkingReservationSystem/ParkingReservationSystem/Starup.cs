using Microsoft.Owin;
using Owin;

[assembly: OwinStartup(typeof(ParkingReservationSystem.Startup))]
namespace ParkingReservationSystem
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            app.MapSignalR();
        }
    }
}
