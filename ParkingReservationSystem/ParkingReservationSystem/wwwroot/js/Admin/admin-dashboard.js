// Admin Dashboard JavaScript with SignalR - ENHANCED VERSION WITH FIXED ACTIVITY MANAGEMENT
class AdminDashboard {
    constructor() {
        this.charts = {};
        this.connection = null;
        this.init();
    }

    async init() {
        this.initCharts();
        this.initInteractions();
        await this.initSignalR();

        // Load data immediately
        await this.refreshDashboard();
    }

    // Khởi tạo SignalR connection
    async initSignalR() {
        try {
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl("/parkingHub")
                .build();

            // Xử lý sự kiện slot được đặt
            this.connection.on("SlotReserved", (slotCode, customerName) => {
                this.handleSlotReserved(slotCode, customerName);
            });

            // Xử lý sự kiện slot được xác nhận
            this.connection.on("SlotConfirmed", (slotCode, customerName) => {
                this.handleSlotConfirmed(slotCode, customerName);
            });

            // Xử lý sự kiện slot được giải phóng
            this.connection.on("SlotReleased", (slotCode) => {
                this.handleSlotReleased(slotCode);
            });

            // FIXED: Xử lý sự kiện slot bị hủy với logic cải thiện
            this.connection.on("SlotCancelled", (slotCode, customerName) => {
                this.handleSlotCancelled(slotCode, customerName);
            });

            // Xử lý sự kiện nhiều slot được đặt
            this.connection.on("MultipleSlotsReserved", (slotCodes, customerName) => {
                this.handleMultipleSlotsReserved(slotCodes, customerName);
            });

            // Xử lý sự kiện nhiều slot được xác nhận
            this.connection.on("MultipleSlotsConfirmed", (slotCodes, customerName) => {
                this.handleMultipleSlotsConfirmed(slotCodes, customerName);
            });

            // Xử lý sự kiện nhiều slot được giải phóng
            this.connection.on("MultipleSlotsReleased", (slotCodes) => {
                this.handleMultipleSlotsReleased(slotCodes);
            });

            // FIXED: Xử lý sự kiện nhiều slot bị hủy với logic cải thiện
            this.connection.on("MultipleSlotsCancel", (slotCodes, customerName) => {
                this.handleMultipleSlotsCancel(slotCodes, customerName);
            });

            //Event handlers cho thanh toán
            this.connection.on("PaymentSuccess", (slotCode, customerName, paymentData) => {
                this.handlePaymentSuccess(slotCode, customerName, paymentData);
            });

            this.connection.on("MultiplePaymentSuccess", (slotCodes, customerName, paymentData) => {
                this.handleMultiplePaymentSuccess(slotCodes, customerName, paymentData);
            });

            // Bắt đầu connection
            await this.connection.start();
            console.log("SignalR Connected");

            // Join parking group để nhận thông báo
            await this.connection.invoke("JoinParkingGroup");

        } catch (err) {
            console.error("SignalR Error:", err);
            this.showUpdateIndicator('SignalR connection failed', 'error');
        }
    }

    // Hàm helper để tạo animation thay đổi trạng thái
    animateStatusChange(row, type = 'success') {
        row.classList.add('status-changing');

        const glowColor = type === 'success' ? 'rgba(72, 187, 120, 0.3)' : 'rgba(245, 101, 101, 0.3)';

        row.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        row.style.backgroundColor = glowColor;
        row.style.transform = 'scale(1.02)';
        row.style.boxShadow = `0 0 20px ${glowColor}`;

        let pulseCount = 0;
        const pulseInterval = setInterval(() => {
            if (pulseCount >= 2) {
                clearInterval(pulseInterval);
                setTimeout(() => {
                    row.style.backgroundColor = '';
                    row.style.transform = '';
                    row.style.boxShadow = '';
                    row.classList.remove('status-changing');
                }, 300);
                return;
            }
            row.style.transform = pulseCount % 2 === 0 ? 'scale(1.05)' : 'scale(1.02)';
            pulseCount++;
        }, 200);
    }

    // ENHANCED: Xử lý sự kiện slot được đặt
    handleSlotReserved(slotCode, customerName) {
        this.addNewActivity({
            time: new Date().toISOString(),
            userName: customerName,
            action: "Đặt chỗ mới",
            slotCode: slotCode,
            slotCodes: [slotCode],
            status: "Chờ xác nhận",
            activityType: "reservation", // ADDED: Thêm loại hoạt động
            slotDetails: [{
                slotCode: slotCode,
                floor: "N/A",
                area: "N/A",
                isConfirmed: false
            }]
        });
        this.showUpdateIndicator(`${customerName} đã đặt chỗ ${slotCode}`, 'info');

        // ENHANCED: Cập nhật thống kê ngay khi có đặt chỗ mới
        this.updateStatsOnReservation(1);

        setTimeout(() => {
            this.refreshStatsFromServer();
        }, 1000);
    }

    // ENHANCED: Xử lý sự kiện slot được xác nhận
    handleSlotConfirmed(slotCode, customerName) {
        this.hidePendingActivity(slotCode, customerName);

        this.addNewActivity({
            time: new Date().toISOString(),
            userName: customerName,
            action: "Xác nhận đặt chỗ",
            slotCode: slotCode,
            slotCodes: [slotCode],
            status: "Đã xác nhận",
            activityType: "confirmation", // ADDED: Thêm loại hoạt động
            slotDetails: [{
                slotCode: slotCode,
                floor: "N/A",
                area: "N/A",
                isConfirmed: true
            }]
        });
        this.showUpdateIndicator(`Đã xác nhận chỗ ${slotCode} cho ${customerName}`, 'success');

        // ENHANCED: Cập nhật số lượng đã xác nhận
        this.updateConfirmedStats(1);

        setTimeout(() => {
            this.refreshStatsFromServer();
        }, 1000);
    }

    // ENHANCED: Xử lý sự kiện slot được giải phóng
    handleSlotReleased(slotCode) {
        this.addNewActivity({
            time: new Date().toISOString(),
            userName: "Hệ thống",
            action: "Giải phóng chỗ",
            slotCode: slotCode,
            slotCodes: [slotCode],
            status: "Hoàn thành",
            activityType: "release", // ADDED: Thêm loại hoạt động
            slotDetails: [{
                slotCode: slotCode,
                floor: "N/A",
                area: "N/A",
                isConfirmed: false
            }]
        });
        this.showUpdateIndicator(`Chỗ ${slotCode} đã được giải phóng`, 'info');

        // ENHANCED: Cập nhật thống kê khi giải phóng chỗ
        this.updateStatsOnRelease(1);

        setTimeout(() => {
            this.refreshStatsFromServer();
        }, 1000);
    }

    // FIXED: Xử lý sự kiện slot bị hủy - CHỈ XÓA CÁC HOẠT ĐỘNG CHƯA THANH TOÁN
    handleSlotCancelled(slotCode, customerName) {
        // FIXED: Chỉ xóa các hoạt động chờ xác nhận của người dùng này
        this.removeCancellableActivityRow(slotCode, customerName);

        // ENHANCED: Cập nhật thống kê ngay lập tức (không chờ API)
        this.updateStatsOnCancel(1); // 1 slot bị hủy

        // Hiển thị thông báo
        this.showUpdateIndicator(`${customerName} đã hủy chỗ ${slotCode}`, 'warning');

        // ENHANCED: Cập nhật từ server để đảm bảo tính chính xác
        setTimeout(() => {
            this.refreshStatsFromServer();
        }, 1000); // Delay 1 giây để server xử lý xong

        // Cập nhật biểu đồ
        this.updateChartsAfterCancel();
    }

    // ENHANCED: Xử lý sự kiện nhiều slot được đặt
    handleMultipleSlotsReserved(slotCodes, customerName) {
        this.addNewActivity({
            time: new Date().toISOString(),
            userName: customerName,
            action: `Đặt ${slotCodes.length} chỗ`,
            slotCodes: slotCodes,
            status: "Chờ xác nhận",
            activityType: "reservation", // ADDED: Thêm loại hoạt động
            slotDetails: slotCodes.map(code => ({
                slotCode: code,
                floor: "N/A",
                area: "N/A",
                isConfirmed: false
            }))
        });
        this.showUpdateIndicator(`${customerName} đã đặt ${slotCodes.length} chỗ`, 'info');

        // ENHANCED: Cập nhật thống kê cho nhiều slot
        this.updateStatsOnReservation(slotCodes.length);

        setTimeout(() => {
            this.refreshStatsFromServer();
        }, 1000);
    }

    // ENHANCED: Xử lý sự kiện nhiều slot được xác nhận
    handleMultipleSlotsConfirmed(slotCodes, customerName) {
        this.hideMultiplePendingActivities(slotCodes, customerName);

        this.addNewActivity({
            time: new Date().toISOString(),
            userName: customerName,
            action: `Xác nhận ${slotCodes.length} chỗ`,
            slotCodes: slotCodes,
            status: "Đã xác nhận",
            activityType: "confirmation", // ADDED: Thêm loại hoạt động
            slotDetails: slotCodes.map(code => ({
                slotCode: code,
                floor: "N/A",
                area: "N/A",
                isConfirmed: true
            }))
        });
        this.showUpdateIndicator(`Đã xác nhận ${slotCodes.length} chỗ cho ${customerName}`, 'success');

        // ENHANCED: Cập nhật thống kê xác nhận nhiều slot
        this.updateConfirmedStats(slotCodes.length);

        setTimeout(() => {
            this.refreshStatsFromServer();
        }, 1000);
    }

    // ENHANCED: Xử lý sự kiện nhiều slot được giải phóng
    handleMultipleSlotsReleased(slotCodes) {
        this.addNewActivity({
            time: new Date().toISOString(),
            userName: "Hệ thống",
            action: `Giải phóng ${slotCodes.length} chỗ`,
            slotCodes: slotCodes,
            status: "Hoàn thành",
            activityType: "release", // ADDED: Thêm loại hoạt động
            slotDetails: slotCodes.map(code => ({
                slotCode: code,
                floor: "N/A",
                area: "N/A",
                isConfirmed: false
            }))
        });
        this.showUpdateIndicator(`${slotCodes.length} chỗ đã được giải phóng`, 'info');

        // ENHANCED: Cập nhật thống kê giải phóng nhiều slot
        this.updateStatsOnRelease(slotCodes.length);

        setTimeout(() => {
            this.refreshStatsFromServer();
        }, 1000);
    }

    // FIXED: Xử lý sự kiện nhiều slot bị hủy - CHỈ XÓA CÁC HOẠT ĐỘNG CHƯA THANH TOÁN
    handleMultipleSlotsCancel(slotCodes, customerName) {
        // FIXED: Chỉ xóa các hoạt động có thể hủy của người dùng này
        this.removeMultipleCancellableActivityRows(slotCodes, customerName);

        // ENHANCED: Cập nhật thống kê ngay lập tức
        this.updateStatsOnCancel(slotCodes.length); // Số lượng slot bị hủy

        // Hiển thị thông báo
        this.showUpdateIndicator(`${customerName} đã hủy ${slotCodes.length} chỗ`, 'warning');

        // ENHANCED: Cập nhật từ server để đảm bảo tính chính xác
        setTimeout(() => {
            this.refreshStatsFromServer();
        }, 1000);

        // Cập nhật biểu đồ
        this.updateChartsAfterCancel();
    }

    // Xử lý thanh toán thành công
    handlePaymentSuccess(slotCode, customerName, paymentData) {
        this.hidePendingActivity(slotCode, customerName);

        const tbody = document.querySelector('.table tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        let foundRow = null;

        rows.forEach(row => {
            const slotChips = row.querySelectorAll('.parking-slot-chip');
            const hasSlot = Array.from(slotChips).some(chip =>
                chip.textContent.trim() === slotCode
            );

            if (hasSlot) {
                foundRow = row;
            }
        });

        if (foundRow) {
            this.animateStatusChange(foundRow, 'success');

            const statusCell = foundRow.querySelector('td:last-child');
            if (statusCell) {
                setTimeout(() => {
                    statusCell.innerHTML = this.getStatusBadge('Đã xác nhận');
                }, 400);
            }

            const actionCell = foundRow.querySelector('td:nth-child(4)');
            if (actionCell) {
                setTimeout(() => {
                    actionCell.innerHTML = '<span class="action-badge">Thanh toán thành công</span>';
                }, 400);
            }
        } else {
            this.addNewActivity({
                time: new Date().toISOString(),
                userName: customerName,
                action: "Thanh toán thành công",
                slotCode: slotCode,
                slotCodes: [slotCode],
                status: "Đã xác nhận",
                activityType: "payment", // ADDED: Thêm loại hoạt động
                slotDetails: [{
                    slotCode: slotCode,
                    floor: paymentData?.floor || "N/A",
                    area: paymentData?.area || "N/A",
                    isConfirmed: true
                }]
            });
        }

        this.showUpdateIndicator(`${customerName} đã thanh toán thành công cho chỗ ${slotCode}`, 'success');

        // ENHANCED: Cập nhật thống kê thanh toán
        this.updateConfirmedStats(1);

        setTimeout(() => {
            this.refreshStatsFromServer();
        }, 1000);
    }

    // Xử lý thanh toán thành công nhiều slot
    handleMultiplePaymentSuccess(slotCodes, customerName, paymentData) {
        this.hideMultiplePendingActivities(slotCodes, customerName);

        const tbody = document.querySelector('.table tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        let foundRows = [];

        rows.forEach(row => {
            const slotChips = row.querySelectorAll('.parking-slot-chip');
            const rowSlotCodes = Array.from(slotChips).map(chip => chip.textContent.trim());

            const hasAnySlot = slotCodes.some(slotCode => rowSlotCodes.includes(slotCode));
            if (hasAnySlot) {
                foundRows.push(row);
            }
        });

        foundRows.forEach((row, index) => {
            setTimeout(() => {
                this.animateStatusChange(row, 'success');

                const statusCell = row.querySelector('td:last-child');
                if (statusCell) {
                    setTimeout(() => {
                        statusCell.innerHTML = this.getStatusBadge('Đã xác nhận');
                    }, 400);
                }

                const actionCell = row.querySelector('td:nth-child(4)');
                if (actionCell) {
                    setTimeout(() => {
                        actionCell.innerHTML = '<span class="action-badge">Thanh toán thành công</span>';
                    }, 400);
                }
            }, index * 200);
        });

        if (foundRows.length === 0) {
            this.addNewActivity({
                time: new Date().toISOString(),
                userName: customerName,
                action: `Thanh toán ${slotCodes.length} chỗ`,
                slotCodes: slotCodes,
                status: "Đã xác nhận",
                activityType: "payment", // ADDED: Thêm loại hoạt động
                slotDetails: slotCodes.map(code => ({
                    slotCode: code,
                    floor: paymentData?.floor || "N/A",
                    area: paymentData?.area || "N/A",
                    isConfirmed: true
                }))
            });
        }

        this.showUpdateIndicator(`${customerName} đã thanh toán thành công ${slotCodes.length} chỗ`, 'success');

        // ENHANCED: Cập nhật thống kê thanh toán nhiều slot
        this.updateConfirmedStats(slotCodes.length);

        setTimeout(() => {
            this.refreshStatsFromServer();
        }, 1000);
    }

    // NEW: Cập nhật thống kê tức thì khi hủy slot (không cần gọi API)
    updateStatsOnCancel(cancelledCount) {
        try {
            // Cập nhật "Tổng lượt đặt chỗ" - giảm đi số lượng bị hủy
            const totalReservationsElement = document.querySelector('#totalReservations');
            if (totalReservationsElement) {
                const currentValue = parseInt(totalReservationsElement.textContent.replace(/[^\d]/g, '')) || 0;
                const newValue = Math.max(0, currentValue - cancelledCount);
                this.animateCounter(totalReservationsElement, currentValue, newValue, 800);

                // Highlight card với hiệu ứng cảnh báo
                const card = totalReservationsElement.closest('.stats-card');
                if (card) {
                    card.style.boxShadow = '0 0 20px rgba(245, 101, 101, 0.5)';
                    card.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        card.style.boxShadow = '';
                        card.style.transform = '';
                    }, 1500);
                }
            }

            // Cập nhật "Chỗ còn trống" - tăng lên số lượng chỗ được giải phóng
            const availableSlotsElement = document.querySelector('#availableSlots');
            if (availableSlotsElement) {
                const currentValue = parseInt(availableSlotsElement.textContent.replace(/[^\d]/g, '')) || 0;
                const newValue = currentValue + cancelledCount;
                this.animateCounter(availableSlotsElement, currentValue, newValue, 800);

                // Highlight card với hiệu ứng thành công
                const card = availableSlotsElement.closest('.stats-card');
                if (card) {
                    card.style.boxShadow = '0 0 20px rgba(72, 187, 120, 0.5)';
                    card.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        card.style.boxShadow = '';
                        card.style.transform = '';
                    }, 1500);
                }
            }

            // Cập nhật thời gian cập nhật
            document.getElementById('lastUpdate').textContent = new Date().toLocaleString('vi-VN');

            console.log(`Stats updated immediately: -${cancelledCount} reservations, +${cancelledCount} available slots`);

        } catch (error) {
            console.error('Error updating stats on cancel:', error);
        }
    }

    // NEW: Cập nhật thống kê khi có đặt chỗ mới
    updateStatsOnReservation(reservedCount) {
        try {
            // Tăng tổng lượt đặt chỗ
            const totalReservationsElement = document.querySelector('#totalReservations');
            if (totalReservationsElement) {
                const currentValue = parseInt(totalReservationsElement.textContent.replace(/[^\d]/g, '')) || 0;
                const newValue = currentValue + reservedCount;
                this.animateCounter(totalReservationsElement, currentValue, newValue, 800);

                // Highlight card
                const card = totalReservationsElement.closest('.stats-card');
                if (card) {
                    card.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.5)';
                    card.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        card.style.boxShadow = '';
                        card.style.transform = '';
                    }, 1500);
                }
            }

            // Giảm chỗ còn trống
            const availableSlotsElement = document.querySelector('#availableSlots');
            if (availableSlotsElement) {
                const currentValue = parseInt(availableSlotsElement.textContent.replace(/[^\d]/g, '')) || 0;
                const newValue = Math.max(0, currentValue - reservedCount);
                this.animateCounter(availableSlotsElement, currentValue, newValue, 800);

                // Highlight card
                const card = availableSlotsElement.closest('.stats-card');
                if (card) {
                    card.style.boxShadow = '0 0 20px rgba(255, 193, 7, 0.5)';
                    card.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        card.style.boxShadow = '';
                        card.style.transform = '';
                    }, 1500);
                }
            }

            // Cập nhật thời gian
            document.getElementById('lastUpdate').textContent = new Date().toLocaleString('vi-VN');

            console.log(`Stats updated on reservation: +${reservedCount} reservations, -${reservedCount} available slots`);
        } catch (error) {
            console.error('Error updating stats on reservation:', error);
        }
    }

    // NEW: Cập nhật thống kê xác nhận
    updateConfirmedStats(confirmedCount) {
        try {
            const confirmedElement = document.querySelector('#confirmedReservations');
            if (confirmedElement) {
                const currentValue = parseInt(confirmedElement.textContent.replace(/[^\d]/g, '')) || 0;
                const newValue = currentValue + confirmedCount;
                this.animateCounter(confirmedElement, currentValue, newValue, 800);

                // Highlight card
                const card = confirmedElement.closest('.stats-card');
                if (card) {
                    card.style.boxShadow = '0 0 20px rgba(40, 167, 69, 0.5)';
                    card.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        card.style.boxShadow = '';
                        card.style.transform = '';
                    }, 1500);
                }
            }

            console.log(`Confirmed stats updated: +${confirmedCount} confirmed reservations`);
        } catch (error) {
            console.error('Error updating confirmed stats:', error);
        }
    }

    // NEW: Cập nhật thống kê khi giải phóng chỗ
    updateStatsOnRelease(releasedCount) {
        try {
            // Tăng chỗ còn trống
            const availableSlotsElement = document.querySelector('#availableSlots');
            if (availableSlotsElement) {
                const currentValue = parseInt(availableSlotsElement.textContent.replace(/[^\d]/g, '')) || 0;
                const newValue = currentValue + releasedCount;
                this.animateCounter(availableSlotsElement, currentValue, newValue, 800);

                // Highlight card
                const card = availableSlotsElement.closest('.stats-card');
                if (card) {
                    card.style.boxShadow = '0 0 20px rgba(23, 162, 184, 0.5)';
                    card.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        card.style.boxShadow = '';
                        card.style.transform = '';
                    }, 1500);
                }
            }

            // Giảm số lượng đã xác nhận
            const confirmedElement = document.querySelector('#confirmedReservations');
            if (confirmedElement) {
                const currentValue = parseInt(confirmedElement.textContent.replace(/[^\d]/g, '')) || 0;
                const newValue = Math.max(0, currentValue - releasedCount);
                this.animateCounter(confirmedElement, currentValue, newValue, 800);
            }

            console.log(`Stats updated on release: +${releasedCount} available slots, -${releasedCount} confirmed`);
        } catch (error) {
            console.error('Error updating stats on release:', error);
        }
    }

    // NEW: Cập nhật thống kê từ server để đảm bảo tính chính xác
    async refreshStatsFromServer() {
        try {
            const response = await fetch('/Admin/GetDashboardData', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data.stats) {
                    // So sánh với giá trị hiện tại và chỉ cập nhật nếu có sự khác biệt
                    this.updateStatsIfChanged(data.stats);
                }

                if (data.charts) {
                    this.updateCharts(data.charts);
                }

                console.log('Stats refreshed from server for accuracy');
            }
        } catch (error) {
            console.error('Error refreshing stats from server:', error);
            // Nếu không thể lấy dữ liệu từ server, hiển thị cảnh báo
            this.showUpdateIndicator('Không thể đồng bộ dữ liệu từ server', 'error');
        }
    }

    // NEW: Chỉ cập nhật thống kê nếu có sự khác biệt
    updateStatsIfChanged(serverStats) {
        const updateIfDifferent = (selector, serverValue, label) => {
            const element = document.querySelector(selector);
            if (element) {
                const currentValue = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
                if (currentValue !== serverValue) {
                    console.log(`${label}: Client=${currentValue}, Server=${serverValue} - Updating...`);
                    this.animateCounter(element, currentValue, serverValue, 1000);

                    // Highlight sự thay đổi
                    const card = element.closest('.stats-card');
                    if (card) {
                        card.style.boxShadow = '0 0 15px rgba(102, 126, 234, 0.4)';
                        setTimeout(() => {
                            card.style.boxShadow = '';
                        }, 1000);
                    }
                }
            }
        };

        // Kiểm tra và cập nhật nếu cần thiết
        if (serverStats.totalUsers !== undefined) {
            updateIfDifferent('#totalUsers', serverStats.totalUsers, 'Total Users');
        }
        if (serverStats.totalReservations !== undefined) {
            updateIfDifferent('#totalReservations', serverStats.totalReservations, 'Total Reservations');
        }
        if (serverStats.confirmedReservations !== undefined) {
            updateIfDifferent('#confirmedReservations', serverStats.confirmedReservations, 'Confirmed Reservations');
        }
        if (serverStats.availableSlots !== undefined) {
            updateIfDifferent('#availableSlots', serverStats.availableSlots, 'Available Slots');
        }
    }

    // FIXED: CHỈ XÓA CÁC HOẠT ĐỘNG CÓ THỂ HỦY (CHƯA THANH TOÁN)
    removeCancellableActivityRow(slotCode, customerName) {
        const tbody = document.querySelector('.table tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            // Kiểm tra slot code
            const slotChips = row.querySelectorAll('.parking-slot-chip');
            const hasSlot = Array.from(slotChips).some(chip =>
                chip.textContent.trim() === slotCode
            );

            if (!hasSlot) return;

            // Kiểm tra tên người dùng
            const userInfo = row.querySelector('.user-info strong');
            const matchesUser = userInfo && userInfo.textContent.trim() === customerName;

            if (!matchesUser) return;

            // CRITICAL: Kiểm tra trạng thái - CHỈ XÓA NẾU CHƯA THANH TOÁN
            const statusBadge = row.querySelector('.badge');
            const actionBadge = row.querySelector('.action-badge');

            // Kiểm tra xem có phải là hoạt động đã thanh toán không
            const isPaymentActivity = actionBadge && (
                actionBadge.textContent.includes('Thanh toán thành công') ||
                actionBadge.textContent.includes('Thanh toán')
            );

            // Kiểm tra xem có phải trạng thái đã hoàn thành không
            const isCompleted = statusBadge && (
                statusBadge.textContent.includes('Đã xác nhận') ||
                statusBadge.textContent.includes('Hoàn thành')
            );

            // CHỈ XÓA NẾU:
            // - Không phải hoạt động thanh toán
            // - Và (đang chờ xác nhận HOẶC là hoạt động đặt chỗ mới)
            const canCancel = !isPaymentActivity && (
                (statusBadge && statusBadge.textContent.includes('Chờ xác nhận')) ||
                (actionBadge && (
                    actionBadge.textContent.includes('Đặt chỗ mới') ||
                    actionBadge.textContent.includes('Đặt') && !actionBadge.textContent.includes('Thanh toán')
                ))
            );

            if (canCancel) {
                console.log(`Removing cancellable activity: ${slotCode} by ${customerName}`);

                // Hiệu ứng fade out và slide out
                row.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                row.style.opacity = '0';
                row.style.transform = 'translateX(-100px) scale(0.95)';
                row.style.backgroundColor = 'rgba(245, 101, 101, 0.1)';

                // Xóa sau khi animation hoàn thành
                setTimeout(() => {
                    if (row.parentNode) {
                        row.remove();
                    }
                }, 800);
            } else {
                console.log(`Activity NOT removed (protected): ${slotCode} by ${customerName} - Payment: ${isPaymentActivity}, Completed: ${isCompleted}`);
            }
        });
    }

    // FIXED: XÓA NHIỀU HOẠT ĐỘNG CÓ THỂ HỦY (CHƯA THANH TOÁN)
    removeMultipleCancellableActivityRows(slotCodes, customerName) {
        const tbody = document.querySelector('.table tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        let removedCount = 0;

        rows.forEach(row => {
            // Kiểm tra slot codes
            const slotChips = row.querySelectorAll('.parking-slot-chip');
            const rowSlotCodes = Array.from(slotChips).map(chip => chip.textContent.trim());
            const hasAnySlot = slotCodes.some(slotCode => rowSlotCodes.includes(slotCode));

            if (!hasAnySlot) return;

            // Kiểm tra tên người dùng
            const userInfo = row.querySelector('.user-info strong');
            const matchesUser = userInfo && userInfo.textContent.trim() === customerName;

            if (!matchesUser) return;

            // CRITICAL: Kiểm tra trạng thái - CHỈ XÓA NẾU CHƯA THANH TOÁN
            const statusBadge = row.querySelector('.badge');
            const actionBadge = row.querySelector('.action-badge');

            // Kiểm tra xem có phải là hoạt động đã thanh toán không
            const isPaymentActivity = actionBadge && (
                actionBadge.textContent.includes('Thanh toán thành công') ||
                actionBadge.textContent.includes('Thanh toán')
            );

            // Kiểm tra xem có phải trạng thái đã hoàn thành không
            const isCompleted = statusBadge && (
                statusBadge.textContent.includes('Đã xác nhận') ||
                statusBadge.textContent.includes('Hoàn thành')
            );

            // CHỈ XÓA NẾU:
            // - Không phải hoạt động thanh toán
            // - Và (đang chờ xác nhận HOẶC là hoạt động đặt chỗ)
            const canCancel = !isPaymentActivity && (
                (statusBadge && statusBadge.textContent.includes('Chờ xác nhận')) ||
                (actionBadge && (
                    actionBadge.textContent.includes('Đặt') && !actionBadge.textContent.includes('Thanh toán')
                ))
            );

            if (canCancel) {
                console.log(`Removing cancellable activities: ${rowSlotCodes.join(',')} by ${customerName}`);

                // Tạo delay khác nhau cho từng dòng để tạo hiệu ứng domino
                setTimeout(() => {
                    row.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    row.style.opacity = '0';
                    row.style.transform = 'translateX(-100px) scale(0.95)';
                    row.style.backgroundColor = 'rgba(245, 101, 101, 0.1)';

                    setTimeout(() => {
                        if (row.parentNode) {
                            row.remove();
                        }
                    }, 800);
                }, removedCount * 150);

                removedCount++;
            } else {
                console.log(`Activities NOT removed (protected): ${rowSlotCodes.join(',')} by ${customerName} - Payment: ${isPaymentActivity}, Completed: ${isCompleted}`);
            }
        });
    }

    // DEPRECATED: Các method cũ (giữ lại để tương thích ngược)
    removeActivityRow(slotCode) {
        console.warn('removeActivityRow is deprecated. Use removeCancellableActivityRow instead.');
        // Không làm gì để tránh xóa nhầm
    }

    removeMultipleActivityRows(slotCodes) {
        console.warn('removeMultipleActivityRows is deprecated. Use removeMultipleCancellableActivityRows instead.');
        // Không làm gì để tránh xóa nhầm
    }

    // Method để ẩn hoạt động "Chờ xác nhận" sau khi đã xác nhận
    hidePendingActivity(slotCode, customerName) {
        const tbody = document.querySelector('.table tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            // Kiểm tra xem dòng này có chứa slot code và user name tương ứng không
            const slotChips = row.querySelectorAll('.parking-slot-chip');
            const hasSlot = Array.from(slotChips).some(chip =>
                chip.textContent.trim() === slotCode
            );

            const userInfo = row.querySelector('.user-info strong');
            const hasUser = userInfo && userInfo.textContent.trim() === customerName;

            const statusBadge = row.querySelector('.badge');
            const isPending = statusBadge && statusBadge.textContent.includes('Chờ xác nhận');

            if (hasSlot && hasUser && isPending) {
                // Animation fade out
                row.style.transition = 'all 0.6s ease-out';
                row.style.opacity = '0';
                row.style.transform = 'scale(0.95)';
                row.style.maxHeight = '0';
                row.style.padding = '0';
                row.style.margin = '0';

                setTimeout(() => {
                    if (row.parentNode) {
                        row.remove();
                    }
                }, 600);
            }
        });
    }

    // Method để ẩn nhiều hoạt động "Chờ xác nhận" sau khi đã xác nhận
    hideMultiplePendingActivities(slotCodes, customerName) {
        const tbody = document.querySelector('.table tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        let hideCount = 0;

        rows.forEach(row => {
            const slotChips = row.querySelectorAll('.parking-slot-chip');
            const rowSlotCodes = Array.from(slotChips).map(chip => chip.textContent.trim());

            const hasAnySlot = slotCodes.some(slotCode => rowSlotCodes.includes(slotCode));

            const userInfo = row.querySelector('.user-info strong');
            const hasUser = userInfo && userInfo.textContent.trim() === customerName;

            const statusBadge = row.querySelector('.badge');
            const isPending = statusBadge && statusBadge.textContent.includes('Chờ xác nhận');

            if (hasAnySlot && hasUser && isPending) {
                // Tạo delay khác nhau cho từng dòng
                setTimeout(() => {
                    row.style.transition = 'all 0.6s ease-out';
                    row.style.opacity = '0';
                    row.style.transform = 'scale(0.95)';
                    row.style.maxHeight = '0';
                    row.style.padding = '0';
                    row.style.margin = '0';

                    setTimeout(() => {
                        if (row.parentNode) {
                            row.remove();
                        }
                    }, 600);
                }, hideCount * 100);

                hideCount++;
            }
        });
    }

    // Cập nhật biểu đồ sau khi hủy slot
    async updateChartsAfterCancel() {
        try {
            // Delay ngắn để đảm bảo database đã được cập nhật
            setTimeout(async () => {
                const response = await fetch('/Admin/GetDashboardData', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.charts) {
                        this.updateCharts(data.charts);
                        this.highlightChartUpdate();
                    }
                }
            }, 500);
        } catch (error) {
            console.error('Error updating charts after cancel:', error);
        }
    }

    // Highlight biểu đồ khi có cập nhật
    highlightChartUpdate() {
        const chartContainers = document.querySelectorAll('.chart-card, .chart-container');
        chartContainers.forEach(container => {
            container.style.transition = 'all 0.8s ease';
            container.style.boxShadow = '0 0 30px rgba(102, 126, 234, 0.3)';
            container.style.transform = 'scale(1.02)';

            setTimeout(() => {
                container.style.boxShadow = '';
                container.style.transform = '';
            }, 2000);
        });
    }

    // Show update indicator
    showUpdateIndicator(message, type = 'info') {
        // Remove existing indicator
        const existing = document.querySelector('.update-indicator');
        if (existing) {
            existing.remove();
        }

        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = `update-indicator ${type}`;
        indicator.textContent = message;

        // Add styles
        const styles = {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            fontSize: '14px',
            zIndex: '9999',
            transform: 'translateX(400px)',
            opacity: '0',
            transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '300px'
        };

        Object.assign(indicator.style, styles);

        // Set background color based on type
        const colors = {
            'info': '#17a2b8',
            'success': '#28a745',
            'warning': '#ffc107',
            'error': '#dc3545'
        };

        indicator.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(indicator);

        // Show with animation
        setTimeout(() => {
            indicator.style.transform = 'translateX(0)';
            indicator.style.opacity = '1';
        }, 100);

        // Auto hide after 4 seconds
        setTimeout(() => {
            indicator.style.transform = 'translateX(400px)';
            indicator.style.opacity = '0';
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.remove();
                }
            }, 400);
        }, 4000);
    }

    // Animation counter
    animateCounter(element, start, end, duration) {
        if (start === end) return;

        const startTime = performance.now();
        const difference = end - start;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Sử dụng easing function
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (difference * easeOutCubic));

            // Format số với separator
            element.textContent = current.toLocaleString('vi-VN');

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = end.toLocaleString('vi-VN');
                // Add completion effect
                element.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 200);
            }
        };
        requestAnimationFrame(animate);
    }

    // Thêm hoạt động mới với animation - ENHANCED
    addNewActivity(activity) {
        const tbody = document.querySelector('.table tbody');
        if (!tbody) return;

        // Tạo row mới với hiệu ứng slide in
        const newRow = document.createElement('tr');
        newRow.style.opacity = '0';
        newRow.style.transform = 'translateX(-100px)';
        newRow.classList.add('new-activity');

        // ADDED: Thêm data attributes để dễ dàng tracking
        newRow.dataset.activityType = activity.activityType || 'unknown';
        newRow.dataset.userName = activity.userName;
        newRow.dataset.timestamp = new Date(activity.time).getTime();

        // Xử lý multiple parking slots
        let slotsHtml = this.generateSlotsHtml(activity);

        // Format thời gian
        const timeFormat = this.formatTime(activity.time);

        // Tạo unique ID cho activity để sử dụng trong modal
        const activityId = Date.now() + Math.random();

        // Thêm activity vào window.activityData để modal có thể sử dụng
        if (!window.activityData) {
            window.activityData = [];
        }

        window.activityData.unshift({
            Time: new Date(activity.time).getTime() * 10000 + 621355968000000000,
            UserName: activity.userName,
            SlotDetails: activity.slotDetails || [],
            ActivityType: activity.activityType || 'unknown'
        });

        newRow.innerHTML = `
            <td>
                <div class="time-display">
                    <div class="time-main">${timeFormat.time}</div>
                    <div class="time-date">${timeFormat.date}</div>
                </div>
            </td>
            <td>
                <div class="user-info">
                    <div class="user-avatar">${activity.userName.charAt(0).toUpperCase()}</div>
                    <strong>${this.escapeHtml(activity.userName)}</strong>
                </div>
            </td>
            <td>
                <button class="view-detail-btn" onclick="showSlotDetails(${new Date(activity.time).getTime() * 10000 + 621355968000000000}, '${this.escapeHtml(activity.userName)}')">
                    👁️ Xem chi tiết
                </button>
            </td>
            <td>
                <span class="action-badge">${this.escapeHtml(activity.action)}</span>
            </td>
            <td>
                <div class="parking-slots-container">
                    ${slotsHtml}
                </div>
            </td>
            <td>${this.getStatusBadge(activity.status)}</td>
        `;

        // Thêm vào đầu bảng
        tbody.insertBefore(newRow, tbody.firstChild);

        // Animation slide in
        setTimeout(() => {
            newRow.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            newRow.style.opacity = '1';
            newRow.style.transform = 'translateX(0)';
        }, 50);

        // Giữ chỉ 15 hoạt động gần đây
        const rows = tbody.querySelectorAll('tr');
        if (rows.length > 15) {
            const oldRow = rows[rows.length - 1];
            oldRow.style.transition = 'all 0.4s ease-in';
            oldRow.style.opacity = '0';
            oldRow.style.transform = 'translateX(100px)';
            setTimeout(() => {
                if (oldRow.parentNode) {
                    tbody.removeChild(oldRow);
                }
            }, 400);
        }

        // Xóa class new-activity sau 5 giây
        setTimeout(() => {
            newRow.classList.remove('new-activity');
        }, 5000);

        // Giới hạn window.activityData để không quá lớn
        if (window.activityData.length > 20) {
            window.activityData = window.activityData.slice(0, 20);
        }
    }

    // Generate slots HTML
    generateSlotsHtml(activity) {
        if (Array.isArray(activity.slotCodes) && activity.slotCodes.length > 0) {
            return activity.slotCodes.slice(0, 5).map((slot, index) => {
                const colors = ['primary', 'success', 'warning', 'info'];
                const colorClass = colors[index % colors.length];
                return `<span class="parking-slot-chip ${colorClass}">${slot}</span>`;
            }).join('') + (activity.slotCodes.length > 5 ?
                `<span class="slots-count-badge">+${activity.slotCodes.length - 5}</span>` : '');
        } else if (activity.slotCode) {
            return `<span class="parking-slot-chip primary">${activity.slotCode}</span>`;
        } else {
            return `<span class="parking-slot-chip secondary">N/A</span>`;
        }
    }

    // Format time
    formatTime(timeString) {
        const date = new Date(timeString);
        return {
            time: date.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            date: date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit'
            })
        };
    }

    // Escape HTML
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, (m) => map[m]) : '';
    }

    // Tạo status badge
    getStatusBadge(status) {
        const statusMap = {
            'Đã xác nhận': { class: 'bg-success', icon: '✅', indicator: 'status-success' },
            'Chờ xác nhận': { class: 'bg-warning', icon: '⏳', indicator: 'status-warning' },
            'Hết hạn': { class: 'bg-danger', icon: '❌', indicator: 'status-danger' },
            'Đã hủy': { class: 'bg-secondary', icon: '⛔', indicator: 'status-secondary' },
            'Hoàn thành': { class: 'bg-info', icon: '🎉', indicator: 'status-info' }
        };

        const config = statusMap[status] || {
            class: 'bg-secondary',
            icon: '❓',
            indicator: 'status-secondary'
        };

        return `
            <span class="badge ${config.class} animated-badge">
                <span class="status-indicator ${config.indicator}"></span>
                ${config.icon} ${this.escapeHtml(status)}
            </span>
        `;
    }

    // Cập nhật biểu đồ
    updateCharts(chartData) {
        try {
            // Cập nhật biểu đồ đường với animation mượt mà
            if (this.charts.reservationChart && chartData.weeklyData) {
                // Cập nhật dữ liệu với animation
                this.charts.reservationChart.data.datasets[0].data = chartData.weeklyData;
                if (chartData.weeklyLabels) {
                    this.charts.reservationChart.data.labels = chartData.weeklyLabels;
                }

                // Cập nhật với animation mode 'active' cho hiệu ứng mượt mà
                this.charts.reservationChart.update('active');

                // ENHANCED: Cập nhật max value của trục Y dựa trên dữ liệu mới
                const maxValue = Math.max(...chartData.weeklyData, 10);
                this.charts.reservationChart.options.scales.y.max = maxValue + 5;
            }

            // Cập nhật biểu đồ tròn với animation
            if (this.charts.statusChart && chartData.statusData) {
                const newData = [
                    chartData.statusData.confirmed || 0,
                    chartData.statusData.pending || 0,
                    chartData.statusData.expired || 0
                ];

                // Cập nhật dữ liệu với animation
                this.charts.statusChart.data.datasets[0].data = newData;
                this.charts.statusChart.update('active');

                // ENHANCED: Highlight biểu đồ nếu có thay đổi đáng kể
                const oldTotal = this.charts.statusChart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                const newTotal = newData.reduce((a, b) => a + b, 0);

                if (Math.abs(oldTotal - newTotal) > 0) {
                    this.highlightChartUpdate();
                }
            }
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }

    // Khởi tạo biểu đồ
    initCharts() {
        // Biểu đồ thống kê đặt chỗ theo ngày
        const ctx1 = document.getElementById('reservationChart');
        if (ctx1) {
            ctx1.style.height = '300px';
            ctx1.style.maxHeight = '300px';

            this.charts.reservationChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: window.weeklyLabels || [],
                    datasets: [{
                        label: 'Đặt chỗ mới',
                        data: window.weeklyData || [],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#667eea',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointHoverBorderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2.5,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: '#667eea',
                            borderWidth: 1,
                            cornerRadius: 10,
                            displayColors: false,
                            padding: 12
                        }
                    },
                    layout: {
                        padding: {
                            top: 20,
                            right: 20,
                            bottom: 20,
                            left: 20
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: Math.max(...(window.weeklyData || [10])) + 5,
                            grid: {
                                color: 'rgba(0,0,0,0.05)',
                                drawBorder: false
                            },
                            ticks: {
                                stepSize: 1,
                                color: '#6c757d',
                                font: {
                                    size: 11
                                },
                                padding: 10
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#6c757d',
                                font: {
                                    size: 11
                                },
                                maxRotation: 0,
                                padding: 10
                            }
                        }
                    },
                    animation: {
                        duration: 1200,
                        easing: 'easeInOutQuart'
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }

        // Biểu đồ phân bố trạng thái
        const ctx2 = document.getElementById('statusChart');
        if (ctx2) {
            ctx2.style.height = '300px';
            ctx2.style.maxHeight = '300px';

            this.charts.statusChart = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['Đã xác nhận', 'Chờ xác nhận', 'Hết hạn'],
                    datasets: [{
                        data: window.statusData || [0, 0, 0],
                        backgroundColor: [
                            '#48bb78',
                            '#ed8936',
                            '#f56565'
                        ],
                        borderWidth: 0,
                        hoverOffset: 10,
                        hoverBorderWidth: 3,
                        hoverBorderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 1,
                    cutout: '55%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: {
                                    size: 12,
                                    weight: '600'
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            cornerRadius: 10,
                            padding: 12,
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    animation: {
                        animateRotate: true,
                        duration: 1200
                    }
                }
            });
        }
    }

    // Khởi tạo tương tác
    initInteractions() {
        // Hiệu ứng hover cho cards
        const cards = document.querySelectorAll('.stats-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in-up');

            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px) scale(1.02)';
                card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.1)';
                card.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
                card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
            });
        });
    }

    // Refresh dashboard thủ công
    async refreshDashboard() {
        try {
            const response = await fetch('/Admin/GetDashboardData', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data.stats) {
                    this.updateStats(data.stats);
                }

                if (data.charts) {
                    this.updateCharts(data.charts);
                }
            }
        } catch (error) {
            console.error('Refresh error:', error);
        }
    }

    // NEW: Method để cập nhật stats (cần implement nếu chưa có)
    updateStats(stats) {
        try {
            // Cập nhật tổng người dùng
            const totalUsersElement = document.querySelector('#totalUsers');
            if (totalUsersElement && stats.totalUsers !== undefined) {
                const currentValue = parseInt(totalUsersElement.textContent.replace(/[^\d]/g, '')) || 0;
                if (currentValue !== stats.totalUsers) {
                    this.animateCounter(totalUsersElement, currentValue, stats.totalUsers, 1000);
                }
            }

            // Cập nhật tổng đặt chỗ
            const totalReservationsElement = document.querySelector('#totalReservations');
            if (totalReservationsElement && stats.totalReservations !== undefined) {
                const currentValue = parseInt(totalReservationsElement.textContent.replace(/[^\d]/g, '')) || 0;
                if (currentValue !== stats.totalReservations) {
                    this.animateCounter(totalReservationsElement, currentValue, stats.totalReservations, 1000);
                }
            }

            // Cập nhật đặt chỗ đã xác nhận
            const confirmedReservationsElement = document.querySelector('#confirmedReservations');
            if (confirmedReservationsElement && stats.confirmedReservations !== undefined) {
                const currentValue = parseInt(confirmedReservationsElement.textContent.replace(/[^\d]/g, '')) || 0;
                if (currentValue !== stats.confirmedReservations) {
                    this.animateCounter(confirmedReservationsElement, currentValue, stats.confirmedReservations, 1000);
                }
            }

            // Cập nhật chỗ còn trống
            const availableSlotsElement = document.querySelector('#availableSlots');
            if (availableSlotsElement && stats.availableSlots !== undefined) {
                const currentValue = parseInt(availableSlotsElement.textContent.replace(/[^\d]/g, '')) || 0;
                if (currentValue !== stats.availableSlots) {
                    this.animateCounter(availableSlotsElement, currentValue, stats.availableSlots, 1000);
                }
            }

            // Cập nhật thời gian
            const lastUpdateElement = document.getElementById('lastUpdate');
            if (lastUpdateElement) {
                lastUpdateElement.textContent = new Date().toLocaleString('vi-VN');
            }

            console.log('Dashboard stats updated successfully');
        } catch (error) {
            console.error('Error updating dashboard stats:', error);
        }
    }

    // NEW: Debug method để kiểm tra trạng thái bảng
    debugActivityTable() {
        const tbody = document.querySelector('.table tbody');
        if (!tbody) {
            console.log('No activity table found');
            return;
        }

        const rows = tbody.querySelectorAll('tr');
        console.log(`Total activity rows: ${rows.length}`);

        rows.forEach((row, index) => {
            const userInfo = row.querySelector('.user-info strong');
            const userName = userInfo ? userInfo.textContent.trim() : 'Unknown';

            const actionBadge = row.querySelector('.action-badge');
            const action = actionBadge ? actionBadge.textContent.trim() : 'Unknown';

            const statusBadge = row.querySelector('.badge');
            const status = statusBadge ? statusBadge.textContent.trim() : 'Unknown';

            const slotChips = row.querySelectorAll('.parking-slot-chip');
            const slots = Array.from(slotChips).map(chip => chip.textContent.trim());

            const activityType = row.dataset.activityType || 'unknown';
            const timestamp = row.dataset.timestamp || 'unknown';

            console.log(`Row ${index + 1}:`, {
                userName,
                action,
                status,
                slots,
                activityType,
                timestamp,
                isPaymentActivity: action.includes('Thanh toán'),
                isPending: status.includes('Chờ xác nhận'),
                isCompleted: status.includes('Đã xác nhận') || status.includes('Hoàn thành')
            });
        });
    }

    // NEW: Method để làm sạch dữ liệu cũ
    cleanupOldActivities() {
        try {
            const tbody = document.querySelector('.table tbody');
            if (!tbody) return;

            const rows = tbody.querySelectorAll('tr');
            const maxRows = 15;

            if (rows.length > maxRows) {
                const excessRows = Array.from(rows).slice(maxRows);
                console.log(`Cleaning up ${excessRows.length} old activity rows`);

                excessRows.forEach((row, index) => {
                    setTimeout(() => {
                        row.style.transition = 'all 0.4s ease-in';
                        row.style.opacity = '0';
                        row.style.transform = 'translateX(100px)';

                        setTimeout(() => {
                            if (row.parentNode) {
                                row.remove();
                            }
                        }, 400);
                    }, index * 100);
                });
            }

            // Làm sạch window.activityData
            if (window.activityData && window.activityData.length > 20) {
                window.activityData = window.activityData.slice(0, 20);
                console.log('Cleaned up old activity data');
            }
        } catch (error) {
            console.error('Error cleaning up old activities:', error);
        }
    }

    // Cleanup method
    destroy() {
        // Dọn dẹp SignalR connection
        if (this.connection) {
            this.connection.invoke("LeaveParkingGroup")
                .then(() => this.connection.stop())
                .catch(err => console.error('Error leaving group:', err));
        }

        // Dọn dẹp charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};

        // Xóa update indicators
        const indicator = document.querySelector('.update-indicator');
        if (indicator) indicator.remove();

        // Làm sạch activity data
        if (window.activityData) {
            window.activityData = [];
        }

        console.log("Dashboard cleanup completed");
    }
}

// Khởi tạo dashboard khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
    console.log("Admin Dashboard with Enhanced SignalR initialized successfully");

    // ADDED: Debug commands cho console
    window.debugDashboard = () => {
        if (window.adminDashboard) {
            window.adminDashboard.debugActivityTable();
        }
    };

    window.cleanupDashboard = () => {
        if (window.adminDashboard) {
            window.adminDashboard.cleanupOldActivities();
        }
    };

    console.log("Debug commands available: debugDashboard(), cleanupDashboard()");
});

// Cleanup khi rời khỏi trang
window.addEventListener('beforeunload', () => {
    if (window.adminDashboard) {
        window.adminDashboard.destroy();
    }
});

// Xử lý khi tab không active (optional - có thể giữ để tối ưu performance)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Dashboard tab hidden');
    } else {
        console.log('Dashboard tab visible');
        if (window.adminDashboard) {
            window.adminDashboard.refreshDashboard();
        }
    }
});

// ADDED: Automatic cleanup mỗi 5 phút
setInterval(() => {
    if (window.adminDashboard) {
        window.adminDashboard.cleanupOldActivities();
        console.log('Auto cleanup performed');
    }
}, 5 * 60 * 1000); // 5 phút

console.log("Fixed Admin Dashboard loaded - Activities with payment protection");