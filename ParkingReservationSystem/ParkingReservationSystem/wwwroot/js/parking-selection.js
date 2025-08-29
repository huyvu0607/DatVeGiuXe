/**
 * ===== PARKING SELECTION INTERFACE =====
 * Handles UI interactions for parking slot selection
 */

class ParkingSelection {
    constructor() {
        this.selectedSlots = new Set();
        this.currentFloor = null;
        this.form = null;
        this.isSubmitting = false;

        this.init();
    }

    /**
     * Initialize the parking selection interface
     */
    init() {
        this.form = document.getElementById('parkingForm');
        this.setupFloorNavigation();
        this.setupSlotSelection();
        this.setupFormSubmission();
        this.setupSelectedSlotsPreview();
        this.updateSelectedCount();

        // Auto-select first floor
        this.selectFirstFloor();

        console.log('Parking Selection initialized');
    }

    /**
     * Setup floor navigation
     */
    setupFloorNavigation() {
        const floorButtons = document.querySelectorAll('.floor-btn');

        floorButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const floor = btn.getAttribute('data-floor');
                this.selectFloor(floor, btn);
            });
        });
    }

    /**
     * Select a floor and filter slots
     */
    selectFloor(floor, buttonElement) {
        // Update button states
        document.querySelectorAll('.floor-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        buttonElement.classList.add('active');

        /**
         * Select a floor and filter slots
         */
        
            // Update button states
            document.querySelectorAll('.floor-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            buttonElement.classList.add('active');

            // Filter slots by floor
            const allSlots = document.querySelectorAll('.parking-slot');
            allSlots.forEach(slot => {
                const slotFloor = slot.getAttribute('data-floor');
                if (slotFloor === floor) {
                    slot.style.display = 'flex';
                    slot.classList.add('fade-in');
                } else {
                    slot.style.display = 'none';
                    slot.classList.remove('fade-in');
                }
            });

            this.currentFloor = floor;
            console.log(`Selected floor: ${floor}`);
        }

        /**
         * Auto-select first floor
         */
        selectFirstFloor() {
            const firstFloorBtn = document.querySelector('.floor-btn');
            if (firstFloorBtn) {
                firstFloorBtn.click();
            }
        }

        /**
         * Setup slot selection functionality
         */
        setupSlotSelection() {
            const slotCheckboxes = document.querySelectorAll('.slot-checkbox');

            slotCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.handleSlotSelection(e.target);
                });
            });

            // Handle clicks on disabled/occupied slots
            document.addEventListener('click', (e) => {
                const slotElement = e.target.closest('.parking-slot');
                if (slotElement && (slotElement.classList.contains('reserved') || slotElement.classList.contains('occupied'))) {
                    this.handleDisabledSlotClick(slotElement);
                }
            });
        }

        /**
         * Handle slot selection/deselection
         */
        handleSlotSelection(checkbox) {
            const slotElement = checkbox.closest('.parking-slot');
            const slotCode = slotElement.getAttribute('data-slot');

            if (checkbox.checked) {
                this.selectedSlots.add(slotCode);
                slotElement.classList.add('selected');
                console.log(`Selected slot: ${slotCode}`);
            } else {
                this.selectedSlots.delete(slotCode);
                slotElement.classList.remove('selected');
                console.log(`Deselected slot: ${slotCode}`);
            }

            this.updateSelectedCount();
            this.updateSelectedSlotsPreview();
            this.updateSubmitButton();
        }

        /**
         * Handle clicks on disabled slots
         */
        handleDisabledSlotClick(slotElement) {
            const slotCode = slotElement.getAttribute('data-slot');

            if (slotElement.classList.contains('reserved')) {
                this.showNotification(`Chỗ ${slotCode} đang được giữ bởi người khác!`, 'error');
            } else if (slotElement.classList.contains('occupied')) {
                this.showNotification(`Chỗ ${slotCode} đã được đặt, không thể chọn!`, 'error');
            }
        }

        /**
         * Update selected slots count display
         */
        updateSelectedCount() {
            const countElement = document.getElementById('selectedCount');
            if (countElement) {
                countElement.textContent = this.selectedSlots.size;
            }
        }

        /**
         * Setup selected slots preview
         */
        setupSelectedSlotsPreview() {
            // Initial setup is done in updateSelectedSlotsPreview
            this.updateSelectedSlotsPreview();
        }

        /**
         * Update the selected slots preview
         */
        updateSelectedSlotsPreview() {
            const previewList = document.getElementById('selectedSlotsList');
            if (!previewList) return;

            if (this.selectedSlots.size === 0) {
                previewList.innerHTML = '<p class="no-selection">Chưa chọn chỗ nào</p>';
            } else {
                const slotsArray = Array.from(this.selectedSlots);
                const slotsHtml = slotsArray.map(slot => {
                    const slotElement = document.querySelector(`[data-slot="${slot}"]`);
                    const floor = slotElement ? slotElement.getAttribute('data-floor') : '?';

                    return `
                    <div class="selected-slot-tag">
                        <i class="fas fa-car me-1"></i>
                        ${slot} - Tầng ${floor}
                    </div>
                `;
                }).join('');

                previewList.innerHTML = slotsHtml;
            }
        }

        /**
         * Update submit button state
         */
        updateSubmitButton() {
            const submitBtn = document.getElementById('submitBtn');
            if (!submitBtn) return;

            if (this.selectedSlots.size === 0) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-lock me-2"></i>Chọn chỗ để tiếp tục';
            } else {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fas fa-lock me-2"></i>Giữ ${this.selectedSlots.size} chỗ ngay`;
            }
        }

        /**
         * Setup form submission
         */
        setupFormSubmission() {
            if (!this.form) return;

            this.form.addEventListener('submit', (e) => {
                this.handleFormSubmission(e);
            });
        }

        /**
         * Handle form submission
         */
        handleFormSubmission(e) {
            // Check if any slots are selected
            if (this.selectedSlots.size === 0) {
                e.preventDefault();
                this.showWarningToast();
                return;
            }

            // Prevent double submission
            if (this.isSubmitting) {
                e.preventDefault();
                return;
            }

            this.isSubmitting = true;
            this.setSubmitButtonLoading(true);

            // Allow form to submit normally
            // The loading state will be reset if there's an error
            setTimeout(() => {
                if (this.isSubmitting) {
                    this.isSubmitting = false;
                    this.setSubmitButtonLoading(false);
                }
            }, 10000); // Reset after 10 seconds if still submitting
        }

        /**
         * Set submit button loading state
         */
        setSubmitButtonLoading(loading) {
            const submitBtn = document.getElementById('submitBtn');
            if (!submitBtn) return;

            if (loading) {
                submitBtn.disabled = true;
                submitBtn.classList.add('loading');
                submitBtn.innerHTML = '<div class="btn-loader"></div>Đang xử lý...';
            } else {
                submitBtn.disabled = this.selectedSlots.size === 0;
                submitBtn.classList.remove('loading');
                this.updateSubmitButton();
            }
        }

        /**
         * Show warning toast when no slots selected
         */
        showWarningToast() {
            const warningToast = document.getElementById('warningToast');
            if (warningToast && typeof bootstrap !== 'undefined') {
                const toast = new bootstrap.Toast(warningToast);
                toast.show();
            } else {
                this.showNotification('Vui lòng chọn ít nhất một chỗ trước khi đặt!', 'warning');
            }
        }

        /**
         * Remove slot from selection (used by SignalR when slot becomes unavailable)
         */
        removeSlotFromSelection(slotCode) {
            if (this.selectedSlots.has(slotCode)) {
                this.selectedSlots.delete(slotCode);

                const checkbox = document.querySelector(`input[value="${slotCode}"]`);
                if (checkbox) {
                    checkbox.checked = false;
                }

                const slotElement = document.querySelector(`[data-slot="${slotCode}"]`);
                if (slotElement) {
                    slotElement.classList.remove('selected');
                }

                this.updateSelectedCount();
                this.updateSelectedSlotsPreview();
                this.updateSubmitButton();

                console.log(`Removed slot ${slotCode} from selection`);
            }
        }

        /**
         * Get currently selected slots
         */
        getSelectedSlots() {
            return Array.from(this.selectedSlots);
        }

        /**
         * Clear all selections
         */
        clearAllSelections() {
            this.selectedSlots.clear();

            document.querySelectorAll('.slot-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });

            document.querySelectorAll('.parking-slot.selected').forEach(slot => {
                slot.classList.remove('selected');
            });

            this.updateSelectedCount();
            this.updateSelectedSlotsPreview();
            this.updateSubmitButton();

            console.log('Cleared all slot selections');
        }

        /**
         * Show notification (delegates to global function)
         */
        showNotification(message, type = 'info', duration = 5000) {
            if (typeof window.showNotification === 'function') {
                window.showNotification(message, type, duration);
            } else {
                console.log(`Notification [${type}]: ${message}`);
            }
        }
    }

/**
 * ===== NOTIFICATION SYSTEM =====
 */

class NotificationManager {
    constructor() {
        this.container = this.getOrCreateContainer();
        this.notifications = new Map();
        this.nextId = 1;
    }

    /**
     * Get or create notification container
     */
    getOrCreateContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-notifications';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Show notification
     */
    show(message, type = 'info', duration = 5000) {
        const id = this.nextId++;
        const notification = this.createNotificationElement(id, message, type);

        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        return id;
    }

    /**
     * Create notification element
     */
    createNotificationElement(id, message, type) {
        const notification = document.createElement('div');
        notification.className = `toast-notification ${type}`;
        notification.setAttribute('data-notification-id', id);

        const icon = this.getTypeIcon(type);

        notification.innerHTML = `
            <i class="${icon}"></i>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="window.notificationManager.remove(${id})">
                <i class="fas fa-times"></i>
            </button>
        `;

        return notification;
    }

    /**
     * Get icon for notification type
     */
    getTypeIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Remove notification
     */
    remove(id) {
        const notification = this.notifications.get(id);
        if (notification && notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
                this.notifications.delete(id);
            }, 300);
        }
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications.forEach((notification, id) => {
            this.remove(id);
        });
    }
}

/**
 * ===== SLOT TAKEN OVERLAY =====
 */
function showSlotTakenOverlay(slotCode, customerName, customMessage) {
    console.log(`Showing overlay for slot ${slotCode}, customer: ${customerName}`);

    const overlay = document.getElementById('slotTakenOverlay');
    const messageElement = document.getElementById('overlayMessage');

    if (!overlay || !messageElement) {
        console.error('Overlay elements not found');
        return;
    }

    const message = customMessage ||
        `Chỗ <span class="slot-code">${slotCode}</span> vừa được <span class="customer-name">${customerName}</span> giữ trước bạn.`;

    messageElement.innerHTML = `
        <div class="slot-info">
            <p>${message}</p>
        </div>
        <p>Vui lòng chọn chỗ khác để tiếp tục đặt xe.</p>
    `;

    // Show overlay
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Auto-close after 10 seconds
    setTimeout(() => {
        closeSlotTakenOverlay();
    }, 10000);

    // Close on escape key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeSlotTakenOverlay();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeSlotTakenOverlay();
        }
    });
}

/**
 * Close slot taken overlay
 */
function closeSlotTakenOverlay() {
    const overlay = document.getElementById('slotTakenOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
}

/**
 * ===== INITIALIZATION =====
 */
document.addEventListener('DOMContentLoaded', function () {
    // Initialize notification manager
    window.notificationManager = new NotificationManager();

    // Create global notification function
    window.showNotification = function (message, type = 'info', duration = 5000) {
        return window.notificationManager.show(message, type, duration);
    };

    // Initialize parking selection
    window.parkingSelection = new ParkingSelection();

    // Make overlay functions globally available
    window.showSlotTakenOverlay = showSlotTakenOverlay;
    window.closeSlotTakenOverlay = closeSlotTakenOverlay;

    console.log('Parking Selection Interface initialized');
});


// Handle page visibility changes
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
        // Clear old notifications when user returns to tab
        if (window.notificationManager) {
            setTimeout(() => {
                const notifications = document.querySelectorAll('.toast-notification');
                notifications.forEach(notification => {
                    const id = notification.getAttribute('data-notification-id');
                    if (id) {
                        window.notificationManager.remove(parseInt(id));
                    }
                });
            }, 1000);
        }
    }
});

// Utility functions for external access
window.ParkingUtils = {
    getSelectedSlots: () => window.parkingSelection?.getSelectedSlots() || [],
    clearSelections: () => window.parkingSelection?.clearAllSelections(),
    removeSlotFromSelection: (slotCode) => window.parkingSelection?.removeSlotFromSelection(slotCode),
    showNotification: (message, type, duration) => window.showNotification(message, type, duration),
    getConnectionStatus: () => window.parkingSignalR?.getConnectionStatus() || { isConnected: false }
};

