// wwwroot/js/parking-slots.js

// Initialize SignalR connection when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    initializeParkingHub();
});

function initializeParkingHub() {
    // Create SignalR connection
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/parkingHub")
        .configureLogging(signalR.LogLevel.Information)
        .build();

    // Handle slot updates
    connection.on("ReceiveSlotUpdate", function (action, slot) {
        handleSlotUpdate(action, slot);
    });

    // Start connection with retry logic
    startConnection(connection);

    // Handle connection errors
    connection.onclose(function (error) {
        console.warn('SignalR connection closed. Attempting to reconnect...', error);
        setTimeout(() => startConnection(connection), 5000);
    });
}


function startConnection(connection) {
    connection.start()
        .then(function () {
            console.log('✅ SignalR connected successfully');
            showNotification('🔗 Real-time updates connected', 'success');
        })
        .catch(function (err) {
            console.error('❌ SignalR connection error:', err.toString());
            showNotification('⚠️ Real-time updates unavailable', 'warning');

            // Retry connection after 10 seconds
            setTimeout(() => startConnection(connection), 10000);
        });
}

function handleSlotUpdate(action, slot) {
    const config = getNotificationConfig(action);

    showNotification(
        `${config.icon} Slot ${slot.slotCode} was ${action}`,
        config.type,
        config.duration
    );

    // Update the UI if needed
    updateSlotInTable(action, slot);

    // Optional: Auto-refresh after updates
    if (shouldAutoRefresh(action)) {
        setTimeout(() => {
            location.reload();
        }, 1500);
    }
}

function getNotificationConfig(action) {
    const configs = {
        'created': {
            icon: '✨',
            type: 'success',
            duration: 4000
        },
        'updated': {
            icon: '🔄',
            type: 'warning',
            duration: 4000
        },
        'deleted': {
            icon: '❌',
            type: 'error',
            duration: 4000
        }
    };

    return configs[action.toLowerCase()] || {
        icon: '📝',
        type: 'info',
        duration: 3000
    };
}

function showNotification(message, type = 'info', duration = 3000) {
    const colors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
    };

    Toastify({
        text: message,
        duration: duration,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: colors[type] || colors.info,
        stopOnFocus: true,
        style: {
            borderRadius: "12px",
            fontWeight: "600",
            fontSize: "14px",
            padding: "16px 20px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
        },
        onClick: function () {
            // Optional: Handle notification click
            console.log('Notification clicked');
        }
    }).showToast();
}

function updateSlotInTable(action, slot) {
    if (!slot || !slot.id) return;

    const row = document.querySelector(`tr[data-slot-id="${slot.id}"]`);

    switch (action.toLowerCase()) {
        case 'created':
            // Reload page for new slots
            break;
        case 'updated':
            if (row) {
                updateRowData(row, slot);
            }
            break;
        case 'deleted':
            if (row) {
                animateRowRemoval(row);
            }
            break;
    }
}

function updateRowData(row, slot) {
    // Update slot code
    const slotCodeCell = row.querySelector('.slot-code');
    if (slotCodeCell) {
        slotCodeCell.textContent = slot.slotCode;
    }

    // Update availability status
    const statusCell = row.querySelector('.status-badge');
    if (statusCell) {
        statusCell.className = slot.isAvailable ?
            'status-badge status-available' :
            'status-badge status-unavailable';
        statusCell.textContent = slot.isAvailable ? 'Available' : 'Occupied';
    }

    // Update floor info
    const floorCell = row.querySelector('.floor-info');
    if (floorCell) {
        floorCell.textContent = `Floor ${slot.floor}`;
    }

    // Add update animation
    row.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
    setTimeout(() => {
        row.style.backgroundColor = '';
    }, 2000);
}

function animateRowRemoval(row) {
    row.style.transition = 'all 0.3s ease';
    row.style.opacity = '0';
    row.style.transform = 'translateX(-100%)';

    setTimeout(() => {
        row.remove();
        updateStatistics();
    }, 300);
}

function shouldAutoRefresh(action) {
    // Auto-refresh for create/delete actions
    return ['created', 'deleted'].includes(action.toLowerCase());
}

function updateStatistics() {
    // Update statistics cards if they exist
    const totalCard = document.querySelector('.stat-total .stat-value');
    const availableCard = document.querySelector('.stat-available .stat-value');
    const occupiedCard = document.querySelector('.stat-occupied .stat-value');

    if (totalCard && availableCard && occupiedCard) {
        const rows = document.querySelectorAll('tbody tr');
        const total = rows.length;
        let available = 0;

        rows.forEach(row => {
            const statusBadge = row.querySelector('.status-available');
            if (statusBadge) available++;
        });

        totalCard.textContent = total;
        availableCard.textContent = available;
        occupiedCard.textContent = total - available;
    }
}

// Utility functions
function addSmoothScrollBehavior() {
    document.documentElement.style.scrollBehavior = 'smooth';
}

// Initialize smooth scrolling
addSmoothScrollBehavior();

// Add loading states for buttons
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('action-btn')) {
        addLoadingState(e.target);
    }
});

function addLoadingState(button) {
    const originalText = button.textContent;
    button.textContent = 'Loading...';
    button.disabled = true;

    // Remove loading state after 2 seconds (or when page navigates)
    setTimeout(() => {
        if (button) {
            button.textContent = originalText;
            button.disabled = false;
        }
    }, 2000);
}

// Enhanced error handling
window.addEventListener('error', function (e) {
    console.error('Application error:', e.error);
    showNotification('❌ Something went wrong. Please try again.', 'error');
});

// Enhanced console logging for debugging
console.log('🚗 Parking Slots Management System loaded');
console.log('📡 SignalR integration initialized');
console.log('🎨 UI enhancements loaded');