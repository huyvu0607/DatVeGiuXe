// selection.js - Chức năng chọn nhiều reservation
(function () {
    'use strict';

    class ReservationSelection {
        constructor() {
            this.selectedReservations = new Map();
            this.init();
        }

        init() {
            console.log('ReservationSelection initializing...');
            this.bindEvents();
            this.updateToolbar();
        }

        bindEvents() {
            // Checkbox events
            const checkboxes = document.querySelectorAll('.reservation-checkbox');
            console.log('Found checkboxes:', checkboxes.length);

            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.handleCheckboxChange(e.target);
                });
            });

            // Toolbar button events
            const paymentBtn = document.getElementById('paymentBtn');
            const cancelBtn = document.getElementById('cancelBtn');
            const clearBtn = document.getElementById('clearBtn');

            if (paymentBtn) {
                paymentBtn.addEventListener('click', () => {
                    this.handlePayment();
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.handleCancel();
                });
            }

            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.clearSelection();
                });
            }
        }

        handleCheckboxChange(checkbox) {
            console.log('Checkbox changed:', checkbox);

            const reservationId = parseInt(checkbox.dataset.reservationId);
            const slotCode = checkbox.dataset.slotCode;
            const isConfirmed = checkbox.dataset.isConfirmed === 'true';

            console.log('Reservation data:', { reservationId, slotCode, isConfirmed });

            if (checkbox.checked) {
                // Chỉ cho phép chọn những chỗ chưa thanh toán
                if (isConfirmed) {
                    checkbox.checked = false;
                    this.showNotification('Chỉ có thể chọn những chỗ chưa thanh toán!', 'warning');
                    return;
                }

                this.selectedReservations.set(reservationId, {
                    id: reservationId,
                    slotCode: slotCode,
                    isConfirmed: isConfirmed
                });
            } else {
                this.selectedReservations.delete(reservationId);
            }

            console.log('Selected reservations:', this.selectedReservations);
            this.updateToolbar();
        }

        updateToolbar() {
            console.log('Updating toolbar...');

            const toolbar = document.getElementById('selectionToolbar');
            const selectedCount = document.getElementById('selectedCount');
            const selectedSlots = document.getElementById('selectedSlots');

            console.log('Toolbar elements:', { toolbar, selectedCount, selectedSlots });

            const count = this.selectedReservations.size;
            console.log('Selected count:', count);

            if (count > 0) {
                if (toolbar) {
                    toolbar.classList.add('show');
                    console.log('Showing toolbar');
                }

                if (selectedCount) {
                    selectedCount.textContent = count;
                }

                const slotCodes = Array.from(this.selectedReservations.values())
                    .map(res => res.slotCode)
                    .join(', ');

                console.log('Slot codes:', slotCodes);

                if (selectedSlots) {
                    selectedSlots.textContent = slotCodes.length > 30 ?
                        slotCodes.substring(0, 30) + '...' : slotCodes;
                }
            } else {
                if (toolbar) {
                    toolbar.classList.remove('show');
                    console.log('Hiding toolbar');
                }
            }
        }

        handlePayment() {
            if (this.selectedReservations.size === 0) {
                this.showNotification('Vui lòng chọn ít nhất một chỗ để thanh toán!', 'warning');
                return;
            }

            const reservationIds = Array.from(this.selectedReservations.keys());
            this.confirmMultiplePayments(reservationIds);
        }

        handleCancel() {
            if (this.selectedReservations.size === 0) {
                this.showNotification('Vui lòng chọn ít nhất một chỗ để hủy!', 'warning');
                return;
            }

            if (confirm(`Bạn có chắc chắn muốn hủy ${this.selectedReservations.size} chỗ đã chọn?`)) {
                const reservationIds = Array.from(this.selectedReservations.keys());
                this.cancelReservations(reservationIds);
            }
        }

        clearSelection() {
            // Uncheck all checkboxes
            document.querySelectorAll('.reservation-checkbox:checked').forEach(checkbox => {
                checkbox.checked = false;
            });

            this.selectedReservations.clear();
            this.updateToolbar();
        }

        confirmMultiplePayments(reservationIds) {
            // Create form to submit reservation IDs
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/Booking/ConfirmMultiple'; // Điều chỉnh URL nếu cần

            reservationIds.forEach(id => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'reservationIds';
                input.value = id;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
        }

        cancelReservations(reservationIds) {
            // Create form to submit cancellation
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/Reservation/CancelMultipleReservation'; // Điều chỉnh URL nếu cần

            reservationIds.forEach(id => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'reservationIds';
                input.value = id;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
        }

        showNotification(message, type = 'info') {
            // Create toast notification
            const toast = document.createElement('div');
            toast.className = `alert alert-${type} position-fixed`;
            toast.style.cssText = `
                top: 20px;
                right: 20px;
                z-index: 9999;
                min-width: 300px;
                animation: slideInFromRight 0.3s ease;
            `;
            toast.innerHTML = `
                <i class="fas fa-info-circle me-2"></i>
                ${message}
                <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
            `;

            document.body.appendChild(toast);

            // Auto remove after 3 seconds
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 3000);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM loaded, initializing ReservationSelection');
            new ReservationSelection();
        });
    } else {
        console.log('DOM already loaded, initializing ReservationSelection immediately');
        new ReservationSelection();
    }

    // Add animation styles
    const animationStyles = document.createElement('style');
    animationStyles.textContent = `
        @keyframes slideInFromRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(animationStyles);

})();