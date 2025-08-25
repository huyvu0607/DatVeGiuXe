🚗 ParkingSystem (ASP.NET Core MVC + SignalR, .NET 8)
📌 Giới thiệu

ParkingSystem là hệ thống quản lý và đặt chỗ gửi xe trực tuyến, được xây dựng bằng .NET 8 (ASP.NET Core MVC) và SignalR để hỗ trợ cập nhật realtime tình trạng chỗ đậu xe.

👤 Người dùng có thể:

Đăng ký / Đăng nhập tài khoản

Đặt chỗ giữ xe theo tầng / ô xe

Hủy đặt chỗ hoặc xem lịch sử đặt

Thanh toán và xem lịch sử giao dịch

🛠️ Admin có thể:

Quản lý người dùng

Quản lý danh sách ô xe

Theo dõi giao dịch và xuất báo cáo (PDF/Excel)

Giám sát tình trạng chỗ realtime qua SignalR

⚙️ Công nghệ sử dụng

.NET 8 (ASP.NET Core MVC)

SignalR (cập nhật realtime)

Entity Framework Core 8 (EF Core) (ORM, quản lý CSDL)

AdminLTE + Bootstrap 5 (giao diện quản trị, responsive)

SQL Server (CSDL chính)

📂 Cấu trúc thư mục
ParkingSystem/
├── Config/
│   └── EmailSettings.cs
├── Controllers/
│   ├── Admin/
│   │   ├── ParkingSlotsController.cs
│   │   ├── TransactionsController.cs
│   │   └── UsersController.cs
│   ├── AccountController.cs
│   ├── AdminController.cs
│   ├── BookingController.cs
│   ├── HomeController.cs
│   └── ReservationController.cs
├── Hubs/
│   └── ParkingHub.cs
├── Models/
├── Services/
├── ViewModels/
├── Views/
│   ├── Account/
│   ├── Admin/
│   ├── Booking/
│   ├── Home/
│   ├── ParkingSlots/
│   ├── Reservation/
│   ├── Shared/
│   ├── Transactions/
│   └── Users/
├── wwwroot/
├── appsettings.json
├── Program.cs
├── Startup.cs
└── README.md

🚀 Chức năng chính
👤 Người dùng

Đăng ký / Đăng nhập / Quản lý tài khoản

Đặt chỗ giữ xe theo tầng/ô

Hủy đặt chỗ, xem lịch sử

Nhận thông báo realtime khi có chỗ trống

🛠️ Quản trị viên

Quản lý tài khoản người dùng

Quản lý chỗ giữ xe (CRUD)

Xem báo cáo, lịch sử giao dịch

Theo dõi realtime tình trạng bãi xe

🔔 SignalR trong hệ thống

Khi một người dùng đặt / hủy chỗ → tất cả client khác được cập nhật realtime.

Khi admin chỉnh sửa số lượng chỗ → client tự động cập nhật mà không cần reload.

Hub chính: ParkingHub.cs để quản lý kết nối và broadcast sự kiện.

🛠️ Cài đặt và chạy (Development)
Yêu cầu

.NET SDK 8.0

SQL Server

Visual Studio 2022 hoặc JetBrains Rider

Cách chạy

Clone repo:

git clone https://github.com/huyvu0607/DatVeGiuXe.git
cd ParkingSystem


Cập nhật connection string trong appsettings.json:

"ConnectionStrings": {
  "DefaultConnection": "Server=.;Database=ParkingSystemDb;Trusted_Connection=True;TrustServerCertificate=True;"
}


Tạo database & apply migration:

dotnet ef database update


Chạy ứng dụng:

dotnet run


Mở trình duyệt tại:

https://localhost:7191/

👥 Exel phân công công việc:
https://docs.google.com/spreadsheets/d/1WkxTFvm6ftYvymrhCD7JmExcfHs2xrcag6Vlgp4IvP8/edit?gid=11052852#gid=11052852