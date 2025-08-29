/**
 * ===== PARKING SIGNALR MANAGEMENT =====
 * Handles real-time updates for parking slot status
 */

class ParkingSignalR {
    constructor() {
        this.connection = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000;
        this.hasShownConnectedToast = false;
        this.init();
    }

    /**
     * Initialize SignalR connection
     */
    async init() {
        try {
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl("/parkingHub")
                .withAutomaticReconnect([0, 2000, 10000, 30000])
                .build();

            this.setupEventHandlers();
            await this.connect();

        } catch (error) {
            console.error("SignalR initialization error:", error);
            this.showNotification("Không thể kết nối đến server realtime", 'error');
        }
    }

    /**
     * Connect to SignalR hub
     */
    async connect() {
        try {
            await this.connection.start();
            console.log("SignalR Connected successfully");
            this.isConnected = true;
            this.reconnectAttempts = 0;

            await this.connection.invoke("JoinParkingGroup");

            // Kiểm tra xem có phải lần đầu trong session hoặc đang reconnect
            const isFirstConnection = !sessionStorage.getItem("hasConnectedBefore");
            const wasReconnecting = sessionStorage.getItem("wasReconnecting") === "true";

            if (isFirstConnection || wasReconnecting) {
                this.showNotification("Đã kết nối thành công đến hệ thống", 'success');
                sessionStorage.setItem("hasConnectedBefore", "true");
                sessionStorage.removeItem("wasReconnecting");
            }
        } catch (error) {
            console.error("SignalR connection error:", error);
            this.isConnected = false;
            this.handleConnectionError();
        }
    }

    // Khi mất kết nối, đánh dấu để hiện thông báo khi reconnect
    handleConnectionError() {
        console.log("SignalR Disconnected");
        this.isConnected = false;
        sessionStorage.setItem("wasReconnecting", "true");
        // Logic reconnect của bạn ở đây...
    }

    /**
     * Setup SignalR event handlers
     */
    setupEventHandlers() {
        // Connection events
        this.connection.onreconnecting((error) => {
            console.log("SignalR reconnecting...", error);
            this.isConnected = false;
            this.showNotification("Đang kết nối lại...", 'warning');
        });

        this.connection.onreconnected((connectionId) => {
            console.log("SignalR reconnected:", connectionId);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.connection.invoke("JoinParkingGroup");
            this.showNotification("Đã kết nối lại thành công", 'success');
        });

        this.connection.onclose((error) => {
            console.log("SignalR connection closed:", error);
            this.isConnected = false;
            this.handleConnectionError();
        });

        // Slot events
        this.connection.on("SlotReserved", (slotCode, customerName) => {
            this.handleSlotReserved(slotCode, customerName);
        });

        this.connection.on("SlotTaken", (slotCode, message) => {
            this.handleSlotTaken(slotCode, message);
        });

        this.connection.on("SlotConfirmed", (slotCode, customerName) => {
            this.handleSlotConfirmed(slotCode, customerName);
        });

        this.connection.on("SlotReleased", (slotCode) => {
            this.handleSlotReleased(slotCode);
        });

        this.connection.on("SlotCancelled", (slotCode, customerName) => {
            this.handleSlotCancelled(slotCode, customerName);
        });

        // Multiple slots events
        this.connection.on("MultipleSlotsReserved", (slotCodes, customerName) => {
            this.handleMultipleSlotsReserved(slotCodes, customerName);
        });

        this.connection.on("MultipleSlotsConfirmed", (slotCodes) => {
            this.handleMultipleSlotsConfirmed(slotCodes);
        });

        this.connection.on("MultipleSlotsCancel", (slotCodes, customerName) => {
            this.handleMultipleSlotsCancel(slotCodes, customerName);
        });

        this.connection.on("MultipleSlotsReleased", (slotCodes) => {
            this.handleMultipleSlotsReleased(slotCodes);
        });
    }

    /**
     * Handle connection errors and retry logic
     */
    handleConnectionError() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;

            setTimeout(async () => {
                try {
                    await this.connect();
                } catch (error) {
                    console.error(`Reconnect attempt ${this.reconnectAttempts} failed:`, error);
                }
            }, this.reconnectInterval * this.reconnectAttempts);

            this.showNotification(`Thử kết nối lại lần ${this.reconnectAttempts}...`, 'warning');
        } else {
            this.showNotification("Không thể kết nối đến server. Vui lòng tải lại trang.", 'error');
        }
    }

    /**
     * Handle single slot reserved
     */
    handleSlotReserved(slotCode, customerName) {
        console.log(`SlotReserved: ${slotCode} by ${customerName}`);

        const slotElement = this.findSlotElement(slotCode);
        if (!slotElement) return;

        const checkbox = slotElement.querySelector('input[type="checkbox"]');
        const wasSelected = checkbox && checkbox.checked;

        // Update slot status
        this.updateSlotStatus(slotElement, 'reserved', checkbox);

        // **FIX: Tự động xóa slot khỏi selection của user khác**
        this.removeSlotFromUserSelection(slotCode);

        if (wasSelected) {
            // Show overlay for slots user was selecting
            window.showSlotTakenOverlay(slotCode, customerName);
        } else {
            // Show regular notification
            this.showNotification(`Chỗ ${slotCode} vừa được ${customerName} đặt`, 'warning');
        }
    }

    /**
     * Handle slot taken (conflict)
     */
    handleSlotTaken(slotCode, message) {
        console.log(`SlotTaken: ${slotCode}, message: ${message}`);

        const slotElement = this.findSlotElement(slotCode);
        if (!slotElement) return;

        const checkbox = slotElement.querySelector('input[type="checkbox"]');
        const wasSelected = checkbox && checkbox.checked;

        // Update slot status
        this.updateSlotStatus(slotElement, 'reserved', checkbox);

        // **FIX: Tự động xóa slot khỏi selection của user khác**
        this.removeSlotFromUserSelection(slotCode);

        if (wasSelected) {
            window.showSlotTakenOverlay(slotCode, "người khác");
        } else {
            this.showNotification(`${message} (Chỗ ${slotCode})`, 'error');
        }
    }

    /**
     * Handle slot confirmed
     */
    handleSlotConfirmed(slotCode, customerName) {
        console.log(`SlotConfirmed: ${slotCode} by ${customerName}`);

        const slotElement = this.findSlotElement(slotCode);
        if (!slotElement) return;

        const checkbox = slotElement.querySelector('input[type="checkbox"]');
        this.updateSlotStatus(slotElement, 'occupied', checkbox);

        // **FIX: Tự động xóa slot khỏi selection của user khác**
        this.removeSlotFromUserSelection(slotCode);

        //this.showNotification(`Chỗ ${slotCode} đã được ${customerName} xác nhận`, 'success');
    }

    /**
     * Handle slot released
     */
    handleSlotReleased(slotCode) {
        console.log(`SlotReleased: ${slotCode}`);

        const slotElement = this.findSlotElement(slotCode);
        if (!slotElement) return;

        const checkbox = slotElement.querySelector('input[type="checkbox"]');
        this.updateSlotStatus(slotElement, 'available', checkbox, true);

        // Đảm bảo tất cả slots có event listeners
        setTimeout(() => {
            this.ensureAllSlotsHaveEventListeners();
        }, 100);

        this.showNotification(`Chỗ ${slotCode} đã được giải phóng`, 'info');
    }


    /**
     * Handle slot cancelled
     */
    handleSlotCancelled(slotCode, customerName) {
        console.log(`SlotCancelled: ${slotCode} by ${customerName}`);

        const slotElement = this.findSlotElement(slotCode);
        if (!slotElement) return;

        const checkbox = slotElement.querySelector('input[type="checkbox"]');
        this.updateSlotStatus(slotElement, 'available', checkbox, true);

        // Đảm bảo tất cả slots có event listeners
        setTimeout(() => {
            this.ensureAllSlotsHaveEventListeners();
        }, 100);

        this.showNotification(`Chỗ ${slotCode} đã được ${customerName} hủy bỏ`, 'info');
    }

    /**
     * Handle multiple slots reserved
     */
    handleMultipleSlotsReserved(slotCodes, customerName) {
        console.log(`MultipleSlotsReserved: ${slotCodes.join(', ')} by ${customerName}`);

        let showOverlay = false;
        let selectedSlots = [];

        slotCodes.forEach(slotCode => {
            const slotElement = this.findSlotElement(slotCode);
            if (!slotElement) return;

            const checkbox = slotElement.querySelector('input[type="checkbox"]');
            const wasSelected = checkbox && checkbox.checked;

            if (wasSelected) {
                showOverlay = true;
                selectedSlots.push(slotCode);
            }

            this.updateSlotStatus(slotElement, 'reserved', checkbox);

            // **FIX: Tự động xóa từng slot khỏi selection của user khác**
            this.removeSlotFromUserSelection(slotCode);
        });

        // Show overlay if any slot was selected by user
        if (showOverlay) {
            const slotText = selectedSlots.length > 1
                ? `các chỗ ${selectedSlots.join(', ')}`
                : `chỗ ${selectedSlots[0]}`;
            window.showSlotTakenOverlay(selectedSlots[0], customerName, `${slotText} bạn đang chọn vừa được ${customerName} đặt trước`);
        }

        //this.showNotification(`${customerName} vừa đặt ${slotCodes.length} chỗ: ${slotCodes.join(', ')}`, 'warning');
    }

    /**
     * Handle multiple slots confirmed
     */
    handleMultipleSlotsConfirmed(slotCodes) {
        console.log(`MultipleSlotsConfirmed: ${slotCodes.join(', ')}`);

        slotCodes.forEach(slotCode => {
            const slotElement = this.findSlotElement(slotCode);
            if (!slotElement) return;

            const checkbox = slotElement.querySelector('input[type="checkbox"]');
            this.updateSlotStatus(slotElement, 'occupied', checkbox);

            // **FIX: Tự động xóa từng slot khỏi selection của user khác**
            this.removeSlotFromUserSelection(slotCode);
        });

        //this.showNotification(`${slotCodes.length} chỗ đã được xác nhận: ${slotCodes.join(', ')}`, 'success');
    }

    /**
     * Handle multiple slots cancelled
     */
    handleMultipleSlotsCancel(slotCodes, customerName) {
        console.log(`MultipleSlotsCancel: ${slotCodes.join(', ')} by ${customerName}`);

        slotCodes.forEach(slotCode => {
            const slotElement = this.findSlotElement(slotCode);
            if (!slotElement) return;

            const checkbox = slotElement.querySelector('input[type="checkbox"]');
            this.updateSlotStatus(slotElement, 'available', checkbox, true);
        });

        // Đảm bảo tất cả slots có event listeners
        setTimeout(() => {
            this.ensureAllSlotsHaveEventListeners();
        }, 100);

        //this.showNotification(` Người DÙng Đã đã hủy ${slotCodes.length} chỗ: ${slotCodes.join(', ')}`, 'info');
    }

    /**
     * Handle multiple slots released
     */
    handleMultipleSlotsReleased(slotCodes) {
        console.log(`MultipleSlotsReleased: ${slotCodes.join(', ')}`);

        slotCodes.forEach(slotCode => {
            const slotElement = this.findSlotElement(slotCode);
            if (!slotElement) return;

            const checkbox = slotElement.querySelector('input[type="checkbox"]');
            this.updateSlotStatus(slotElement, 'available', checkbox, true);
        });

        // Đảm bảo tất cả slots có event listeners
        setTimeout(() => {
            this.ensureAllSlotsHaveEventListeners();
        }, 100);

        this.showNotification(`${slotCodes.length} chỗ đã được giải phóng: ${slotCodes.join(', ')}`, 'info');
    }

    /**
     * **FIX: Tự động xóa slot khỏi selection của user hiện tại**
     * Đây là function mới để giải quyết vấn đề slot vẫn hiển thị trong "Chỗ đã chọn"
     */
    removeSlotFromUserSelection(slotCode) {
        // Gọi function từ ParkingSelection class để xóa slot khỏi selection
        if (window.parkingSelection && typeof window.parkingSelection.removeSlotFromSelection === 'function') {
            window.parkingSelection.removeSlotFromSelection(slotCode);
            console.log(`Removed slot ${slotCode} from user selection due to conflict`);
        }
    }

    /**
     * Find slot element by slot code
     */
    findSlotElement(slotCode) {
        return document.querySelector(`.parking-slot[data-slot="${slotCode}"]`);
    }

    /**
     * Update slot visual status
     */
    updateSlotStatus(slotElement, status, checkbox, enableCheckbox = false) {
        if (!slotElement) return;

        // Remove all status classes
        slotElement.classList.remove('available', 'selected', 'reserved', 'occupied');

        // Add new status class
        slotElement.classList.add(status);

        // Special handling for occupied status (confirmed payment)
        if (status === 'occupied') {
            // Get slot code from data attribute
            const slotCode = slotElement.getAttribute('data-slot');

            // Replace the entire content with occupied structure
            slotElement.innerHTML = `
        <div class="slot-occupied">
            <div class="slot-code">${slotCode}</div>
            <div class="slot-status-icon">
                <i class="fas fa-ban"></i>
            </div>
        </div>
    `;

            // Ensure occupied styling
            slotElement.style.background = 'linear-gradient(135deg, #6b7280, #4b5563)';
            slotElement.style.color = '#ffffff';
            slotElement.style.cursor = 'not-allowed';
            slotElement.style.opacity = '0.8';

        } else if (status === 'available' && enableCheckbox) {
            // Restore checkbox structure when slot becomes available
            const slotCode = slotElement.getAttribute('data-slot');
            const floor = slotElement.getAttribute('data-floor');

            slotElement.innerHTML = `
        <input type="checkbox" name="selectedSlots" value="${slotCode}" class="slot-checkbox" id="slot_${slotCode}" />
        <label for="slot_${slotCode}" class="slot-label">
            <div class="slot-code">${slotCode}</div>
            <div class="slot-status-icon">
                <i class="fas fa-car"></i>
            </div>
        </label>
    `;

            // Reset inline styles
            slotElement.style.background = '';
            slotElement.style.color = '';
            slotElement.style.cursor = '';
            slotElement.style.opacity = '';

            // **QUAN TRỌNG: Re-attach event listeners**
            this.attachSlotEventListeners(slotElement);

            // Đảm bảo slot hiển thị đúng theo floor hiện tại
            if (window.parkingSelection && window.parkingSelection.currentFloor) {
                if (floor === window.parkingSelection.currentFloor) {
                    slotElement.style.display = 'flex';
                    slotElement.classList.add('fade-in');
                } else {
                    slotElement.style.display = 'none';
                    slotElement.classList.remove('fade-in');
                }
            }

        } else if (status === 'reserved') {
            // Handle reserved status
            if (checkbox) {
                checkbox.disabled = true;
                checkbox.checked = false;
            }

            // Đảm bảo reserved styling
            slotElement.style.cursor = 'not-allowed';

        } else if (status === 'available') {
            // Handle normal available status (không phải từ restore)
            if (checkbox) {
                checkbox.disabled = false;
            }

            // Reset styling
            slotElement.style.cursor = 'pointer';
        }

        // Add visual feedback animation
        slotElement.classList.add('slot-updated');
        setTimeout(() => {
            slotElement.classList.remove('slot-updated');
        }, 1000);

        // Update stats counter
        this.updateStatsDisplay();
    }


<<<<<<< HEAD
    /**
     * Ensure all available slots have proper event listeners
        //Thêm function kiểm tra và khôi phục event listeners cho tất cả slots
     */
    ensureAllSlotsHaveEventListeners() {
        document.querySelectorAll('.parking-slot.available input[type="checkbox"]').forEach(checkbox => {
            const slotElement = checkbox.closest('.parking-slot');
            const slotCode = slotElement.getAttribute('data-slot');

            // Kiểm tra xem checkbox có event listener chưa
            const hasListener = checkbox.onchange || checkbox.onclick;

            if (!hasListener) {
                checkbox.addEventListener('change', (e) => {
                    if (window.parkingSelection && window.parkingSelection.handleSlotSelection) {
                        window.parkingSelection.handleSlotSelection(e.target);
                    }
                });

                console.log(`Added missing event listener for slot: ${slotCode}`);
            }
        });
    }
    /**
     * Helper function to reattach event listeners to restored slots
    */
=======
/**
 * Ensure all available slots have proper event listeners
    //Thêm function kiểm tra và khôi phục event listeners cho tất cả slots
 */
ensureAllSlotsHaveEventListeners() {
    document.querySelectorAll('.parking-slot.available input[type="checkbox"]').forEach(checkbox => {
        const slotElement = checkbox.closest('.parking-slot');
        const slotCode = slotElement.getAttribute('data-slot');

        // Kiểm tra xem checkbox có event listener chưa
        const hasListener = checkbox.onchange || checkbox.onclick;

        if (!hasListener) {
            checkbox.addEventListener('change', (e) => {
                if (window.parkingSelection && window.parkingSelection.handleSlotSelection) {
                    window.parkingSelection.handleSlotSelection(e.target);
                }
            });

            console.log(`Added missing event listener for slot: ${slotCode}`);
        }
    });
}
    /**
 * Helper function to reattach event listeners to restored slots
*/
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
    attachSlotEventListeners(slotElement) {
        const checkbox = slotElement.querySelector('input[type="checkbox"]');
        if (checkbox && window.parkingSelection) {
            // Xóa event listeners cũ (nếu có) để tránh duplicate
            checkbox.replaceWith(checkbox.cloneNode(true));

            // Lấy checkbox mới sau khi clone
            const newCheckbox = slotElement.querySelector('input[type="checkbox"]');

            // Gắn event listener mới
            newCheckbox.addEventListener('change', (e) => {
                window.parkingSelection.handleSlotSelection(e.target);
            });

            console.log(`Reattached event listeners for slot: ${slotElement.getAttribute('data-slot')}`);
        }
    }

    /**
<<<<<<< HEAD
    * Helper function to update stats display
    */
=======
* Helper function to update stats display
*/
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
    updateStatsDisplay() {
        // Update available/occupied counts in header
        const allSlots = document.querySelectorAll('.parking-slot');
        const availableSlots = document.querySelectorAll('.parking-slot.available').length;
        const occupiedSlots = document.querySelectorAll('.parking-slot.occupied').length;

        // Update stat cards if they exist
        const statCards = document.querySelectorAll('.stat-card .stat-number');
        if (statCards.length >= 2) {
            statCards[0].textContent = availableSlots; // Available count
            statCards[1].textContent = occupiedSlots;  // Occupied count
        }

        // Update floor counts
        document.querySelectorAll('.floor-btn').forEach(btn => {
            const floor = btn.getAttribute('data-floor');
            if (floor) {
                const floorSlots = document.querySelectorAll(`[data-floor="${floor}"]`);
                const floorAvailable = document.querySelectorAll(`[data-floor="${floor}"].available`).length;
<<<<<<< HEAD
                const floorTotal = floorSlots.length-1;
=======
                const floorTotal = floorSlots.length;
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd

                const countElement = btn.querySelector('.floor-count');
                if (countElement) {
                    countElement.textContent = `${floorAvailable}/${floorTotal}`;
                }
            }
        });
    }
    /**
     * Show notification to user
     */
    showNotification(message, type = 'info', duration = 5000) {
        // Use the global notification function
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type, duration);
        } else {
            console.log(`Notification [${type}]: ${message}`);
        }
    }

    /**
     * Leave parking group when page unloads
     */
    async disconnect() {
        if (this.connection && this.isConnected) {
            try {
                await this.connection.invoke("LeaveParkingGroup");
                await this.connection.stop();
                console.log("SignalR disconnected successfully");
            } catch (error) {
                console.error("Error during disconnect:", error);
            }
        }
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            state: this.connection?.state || 'Disconnected',
            reconnectAttempts: this.reconnectAttempts
        };
    }

    /**
     * Manually reconnect
     */
    async reconnect() {
        if (!this.isConnected) {
            this.reconnectAttempts = 0;
            await this.connect();
        }
    }
}

// Initialize SignalR when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Create global instance
    window.parkingSignalR = new ParkingSignalR();

    // Handle page unload
    window.addEventListener('beforeunload', function () {
        if (window.parkingSignalR) {
            window.parkingSignalR.disconnect();
        }
    });

    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && window.parkingSignalR) {
            const status = window.parkingSignalR.getConnectionStatus();
            if (!status.isConnected) {
                window.parkingSignalR.reconnect();
            }
        }
    });
});

<<<<<<< HEAD
// Add CSS for slot update animation - FIX: Sử dụng tên biến unique
(function () {
    // Kiểm tra xem style đã được thêm chưa để tránh duplicate
    if (!document.getElementById('parking-signalr-styles')) {
        const parkingSignalRStyles = document.createElement('style');
        parkingSignalRStyles.id = 'parking-signalr-styles'; // Thêm ID để check duplicate
        parkingSignalRStyles.textContent = `
            .parking-slot.slot-updated {
                animation: slotUpdatePulse 1s ease-in-out;
            }
            
            @keyframes slotUpdatePulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(79, 70, 229, 0.3); }
            }
        `;
        document.head.appendChild(parkingSignalRStyles);
    }
})();
=======
// Add CSS for slot update animation
const style = document.createElement('style');
style.textContent = `
    .parking-slot.slot-updated {
        animation: slotUpdatePulse 1s ease-in-out;
    }
    
    @keyframes slotUpdatePulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(79, 70, 229, 0.3); }
    }
`;
document.head.appendChild(style);
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
