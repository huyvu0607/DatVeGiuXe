using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ParkingReservationSystem.Models;
using ParkingReservationSystem.ViewModels.User;
using System.Security.Cryptography;
using System.Text;

namespace ParkingReservationSystem.Controllers.Admin
{
    [Authorize(Roles = "Admin")]
    public class UsersController : Controller
    {
        private readonly ParkingDbContext _context;

        public UsersController(ParkingDbContext context)
        {
            _context = context;
        }

        private string ComputeSha256Hash(string rawData)
        {
            using (SHA256 sha256Hash = SHA256.Create())
            {
                byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(rawData));
                StringBuilder builder = new StringBuilder();
                for (int i = 0; i < bytes.Length; i++)
                {
                    builder.Append(bytes[i].ToString("x2"));
                }
                return builder.ToString();
            }
        }

        // Helper method để lấy email của current user
        private string GetCurrentUserEmail()
        {
            return HttpContext.Session.GetString("UserEmail") ?? "";
        }

        // Helper method để lấy current user từ database
        private async Task<User> GetCurrentUserAsync()
        {
            var currentEmail = GetCurrentUserEmail();
            if (string.IsNullOrEmpty(currentEmail))
                return null;

            return await _context.Users.FirstOrDefaultAsync(u => u.Email == currentEmail);
        }

        // Helper method để kiểm tra quyền edit/delete
        private bool CanModifyUser(User targetUser, User currentUser)
        {
            if (currentUser == null) return false;

            // Chỉ có thể sửa tài khoản của chính mình
            // Hoặc có thể sửa tài khoản User (không phải Admin khác)
            return targetUser.Id == currentUser.Id || targetUser.Role != "Admin";
        }

        // Helper method để kiểm tra quyền delete
        private bool CanDeleteUser(User targetUser, User currentUser)
        {
            if (currentUser == null) return false;

            // Không thể xóa tài khoản của chính mình
            // Không thể xóa tài khoản Admin khác
            return targetUser.Id != currentUser.Id && targetUser.Role != "Admin";
        }

        // GET: Users
        public async Task<IActionResult> Index(string roleFilter = "", string searchTerm = "", int page = 1, int pageSize = 10)
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");

            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                return RedirectToAction("Login", "Account");
            }

            var query = _context.Users.AsQueryable();

            // Filter by role
            if (!string.IsNullOrEmpty(roleFilter))
            {
                query = query.Where(u => u.Role == roleFilter);
            }

            // Search by name or email
            if (!string.IsNullOrEmpty(searchTerm))
            {
                query = query.Where(u => u.Name.Contains(searchTerm) || u.Email.Contains(searchTerm));
            }

            // Get total count for pagination
            var totalCount = await query.CountAsync();

            // Apply pagination
            var users = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Calculate pagination info
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            ViewBag.RoleFilter = roleFilter;
            ViewBag.SearchTerm = searchTerm;
            ViewBag.CurrentPage = page;
            ViewBag.TotalPages = totalPages;
            ViewBag.PageSize = pageSize;
            ViewBag.TotalCount = totalCount;
            ViewBag.HasPreviousPage = page > 1;
            ViewBag.HasNextPage = page < totalPages;

            // Role statistics
            ViewBag.AdminCount = await _context.Users.CountAsync(u => u.Role == "Admin");
            ViewBag.UserCount = await _context.Users.CountAsync(u => u.Role == "User");

            // Pass current user info for view logic
            ViewBag.CurrentUserId = currentUser.Id;
            ViewBag.CurrentUserEmail = currentUser.Email;

            return View(users);
        }

        // GET: Users/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");

            if (id == null)
            {
                return NotFound();
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(m => m.Id == id);
            if (user == null)
            {
                return NotFound();
            }

            return View(user);
        }

        // GET: Users/Create
        public IActionResult Create()
        {
            return View(new CreateUserViewModel());
        }

        // POST: Users/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(CreateUserViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            // Kiểm tra email đã tồn tại
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email.Trim().ToLower());
            if (existingUser != null)
            {
                ModelState.AddModelError("Email", "Email này đã tồn tại trong hệ thống.");
                return View(model);
            }

            // Validate mật khẩu chi tiết
            if (model.Password.Length < 8)
                ModelState.AddModelError("Password", "Mật khẩu phải có ít nhất 8 ký tự.");
            if (!model.Password.Any(char.IsUpper))
                ModelState.AddModelError("Password", "Mật khẩu phải chứa ít nhất một chữ hoa.");
            if (!model.Password.Any(char.IsLower))
                ModelState.AddModelError("Password", "Mật khẩu phải chứa ít nhất một chữ thường.");
            if (!model.Password.Any(char.IsDigit))
                ModelState.AddModelError("Password", "Mật khẩu phải chứa ít nhất một số.");

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            try
            {
                // Tạo User từ ViewModel
                var user = new User
                {
                    Name = model.Name.Trim(),
                    Email = model.Email.Trim().ToLower(),
                    PasswordHash = ComputeSha256Hash(model.Password),
                    Role = model.Role
                };

                _context.Add(user);
                await _context.SaveChangesAsync();
                TempData["SuccessMessage"] = $"Người dùng '{user.Name}' đã được tạo thành công!";
                TempData["AlertType"] = "success";
                return RedirectToAction("Index", "Users");
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", $"Có lỗi xảy ra: {ex.Message}");
                return View(model);
            }
        }

        // GET: Users/Edit/5
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                return RedirectToAction("Login", "Account");
            }

            // Kiểm tra quyền chỉnh sửa
            if (!CanModifyUser(user, currentUser))
            {
                TempData["ErrorMessage"] = "Bạn không có quyền chỉnh sửa tài khoản này.";
                TempData["AlertType"] = "error";
                return RedirectToAction("Index");
            }

            // Map User to EditUserViewModel
            var model = new EditUserViewModel
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
                CurrentPasswordHash = user.PasswordHash // Lưu mật khẩu cũ
            };

            return View(model);
        }

        // POST: Users/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, EditUserViewModel model)
        {
            if (id != model.Id)
            {
                return NotFound();
            }

            // Kiểm tra user tồn tại và quyền chỉnh sửa
            var existingUser = await _context.Users.FindAsync(id);
            if (existingUser == null)
            {
                return NotFound();
            }

            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                return RedirectToAction("Login", "Account");
            }

            if (!CanModifyUser(existingUser, currentUser))
            {
                TempData["ErrorMessage"] = "Bạn không có quyền chỉnh sửa tài khoản này.";
                TempData["AlertType"] = "error";
                return RedirectToAction("Index");
            }

            // Xóa validation cho Password nếu để trống (không đổi mật khẩu)
            if (string.IsNullOrWhiteSpace(model.Password))
            {
                ModelState.Remove("Password");
                ModelState.Remove("ConfirmPassword");
            }
            else
            {
                // Validate mật khẩu mới nếu có nhập
                if (model.Password.Length < 8)
                    ModelState.AddModelError("Password", "Mật khẩu phải có ít nhất 8 ký tự.");
                if (!model.Password.Any(char.IsUpper))
                    ModelState.AddModelError("Password", "Mật khẩu phải chứa ít nhất một chữ hoa.");
                if (!model.Password.Any(char.IsLower))
                    ModelState.AddModelError("Password", "Mật khẩu phải chứa ít nhất một chữ thường.");
                if (!model.Password.Any(char.IsDigit))
                    ModelState.AddModelError("Password", "Mật khẩu phải chứa ít nhất một số.");
            }

            // Check if email already exists for other users
            var emailExists = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == model.Email && u.Id != model.Id);
            if (emailExists != null)
            {
                ModelState.AddModelError("Email", "Email này đã được sử dụng bởi người dùng khác.");
            }

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            try
            {
                // Tạo user object để update
                var user = new User
                {
                    Id = model.Id,
                    Name = model.Name.Trim(),
                    Email = model.Email.Trim().ToLower(),
                    Role = model.Role,
                    // Nếu có mật khẩu mới thì hash, không thì dùng mật khẩu cũ
                    PasswordHash = !string.IsNullOrWhiteSpace(model.Password)
                        ? ComputeSha256Hash(model.Password)
                        : model.CurrentPasswordHash
                };

                _context.Update(user);
                await _context.SaveChangesAsync();

                TempData["SuccessMessage"] = $"Thông tin người dùng '{user.Name}' đã được cập nhật thành công!";
                TempData["AlertType"] = "success";
                return RedirectToAction(nameof(Index));
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UserExists(model.Id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", "Có lỗi xảy ra khi cập nhật người dùng. Vui lòng thử lại.");
                return View(model);
            }
        }

        // GET: Users/Delete/5
        public async Task<IActionResult> Delete(int? id)
        {
            var role = HttpContext.Session.GetString("UserRole");
            if (role != "Admin")
                return RedirectToAction("Index", "Home");

            if (id == null)
            {
                return NotFound();
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(m => m.Id == id);
            if (user == null)
            {
                return NotFound();
            }

            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                return RedirectToAction("Login", "Account");
            }

            // Kiểm tra quyền xóa
            if (!CanDeleteUser(user, currentUser))
            {
                TempData["ErrorMessage"] = "Bạn không thể xóa tài khoản này.";
                TempData["AlertType"] = "error";
                return RedirectToAction("Index");
            }

            return View(user);
        }

        // POST: Users/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user != null)
                {
                    var currentUser = await GetCurrentUserAsync();
                    if (currentUser == null)
                    {
                        return RedirectToAction("Login", "Account");
                    }

                    // Kiểm tra quyền xóa
                    if (!CanDeleteUser(user, currentUser))
                    {
                        TempData["ErrorMessage"] = "Bạn không thể xóa tài khoản này.";
                        TempData["AlertType"] = "error";
                        return RedirectToAction("Index");
                    }

                    var userName = user.Name;
                    _context.Users.Remove(user);
                    await _context.SaveChangesAsync();

                    // Set success message
                    TempData["SuccessMessage"] = $"Người dùng '{userName}' đã được xóa thành công!";
                    TempData["AlertType"] = "success";
                }
                else
                {
                    TempData["ErrorMessage"] = "Không tìm thấy người dùng cần xóa.";
                    TempData["AlertType"] = "error";
                }
            }
            catch (Exception ex)
            {
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi xóa người dùng. Vui lòng thử lại.";
                TempData["AlertType"] = "error";
            }

            return RedirectToAction(nameof(Index));
        }

        private bool UserExists(int id)
        {
            return _context.Users.Any(e => e.Id == id);
        }
    }
}