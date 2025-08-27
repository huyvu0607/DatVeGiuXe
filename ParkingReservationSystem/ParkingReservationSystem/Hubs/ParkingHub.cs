using Microsoft.AspNetCore.SignalR;

namespace ParkingReservationSystem.Hubs
{
    public class ParkingHub : Hub
    {

        // Gọi từ server -> client
        public void BroadcastUpdate(string message)
        {
            Clients.All.SendAsync("ReceiveSlotUpdate", "update", new { slotCode = message });
        }

        public async Task JoinParkingGroup()
        {
            // Tất cả client sẽ join vào group "ParkingLot" để nhận thông báo
            await Groups.AddToGroupAsync(Context.ConnectionId, "ParkingLot");
        }

        public async Task LeaveParkingGroup()
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, "ParkingLot");
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, "ParkingLot");
            await base.OnDisconnectedAsync(exception);
        }

        // Thông báo một chỗ được đặt
        public async Task NotifySlotReserved(string slotCode, string customerName)
        {
            await Clients.Group("ParkingLot").SendAsync("SlotReserved", slotCode, customerName);
        }

        // Thông báo một chỗ được xác nhận
        public async Task NotifySlotConfirmed(string slotCode, string customerName)
        {
            await Clients.Group("ParkingLot").SendAsync("SlotConfirmed", slotCode, customerName);
        }

        // Thông báo một chỗ được giải phóng
        public async Task NotifySlotReleased(string slotCode)
        {
            await Clients.Group("ParkingLot").SendAsync("SlotReleased", slotCode);
        }

        // THÊM MỚI: Thông báo một chỗ bị hủy
        public async Task NotifySlotCancel(string slotCode, string customerName)
        {
            await Clients.Group("ParkingLot").SendAsync("SlotCancelled", slotCode, customerName);
        }

        // Thông báo nhiều chỗ được đặt
        public async Task NotifyMultipleSlotsReserved(List<string> slotCodes, string customerName)
        {
            await Clients.Group("ParkingLot").SendAsync("MultipleSlotsReserved", slotCodes, customerName);
        }

        // Thông báo nhiều chỗ được xác nhận
        public async Task NotifyMultipleSlotsConfirmed(List<string> slotCodes, string customerName)
        {
            await Clients.Group("ParkingLot").SendAsync("MultipleSlotsConfirmed", slotCodes, customerName);
        }

        // Thông báo nhiều chỗ được giải phóng
        public async Task NotifyMultipleSlotsReleased(List<string> slotCodes)
        {
            await Clients.Group("ParkingLot").SendAsync("MultipleSlotsReleased", slotCodes);
        }

        // THÊM MỚI: Thông báo nhiều chỗ bị hủy
        public async Task NotifyMultipleSlotsCancel(List<string> slotCodes, string customerName)
        {
            await Clients.Group("ParkingLot").SendAsync("MultipleSlotsCancel", slotCodes, customerName);
        }


    }
}