// wwwroot/js/parking-slots.js

// Global variables
let allSlots = [];
let filteredSlots = [];
let currentSort = { column: null, direction: 'asc' };

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    initializeParkingHub();
    initializeSearchAndFilter();
    initializeSorting();
    initializeExport();
    loadSlotData();
});

// Load slot data from DOM
function loadSlotData() {
    const rows = document.querySelectorAll('#slots-tbody tr');
    allSlots = Array.from(rows).map(row => ({
        element: row,
        id: row.dataset.slotId,
        slotCode: row.dataset.slotCode,
        floor: parseInt(row.dataset.floor),
        status: row.dataset.status
    }));
    filteredSlots = [...allSlots];
    updateResultsInfo();
}

// Initialize Search and Filter functionality
function initializeSearchAndFilter() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const floorFilter = document.getElementById('floor-filter');
    const statusFilter = document.getElementById('status-filter');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const clearAllFiltersBtn = document.getElementById('clear-all-filters');

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }

    // Filter functionality
    if (floorFilter) {
        floorFilter.addEventListener('change', applyFilters);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }

    if (clearAllFiltersBtn) {
        clearAllFiltersBtn.addEventListener('click', resetFilters);
    }

    // Show/hide clear button based on search input
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            if (clearSearchBtn) {
                clearSearchBtn.style.display = this.value ? 'flex' : 'none';
            }
        });
    }
}

// Handle search functionality
function handleSearch() {
    applyFilters();
}

function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');

    if (searchInput) {
        searchInput.value = '';
    }
    if (clearSearchBtn) {
        clearSearchBtn.style.display = 'none';
    }

    applyFilters();
}

// Apply all filters
function applyFilters() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const selectedFloor = document.getElementById('floor-filter')?.value || '';
    const selectedStatus = document.getElementById('status-filter')?.value || '';

    filteredSlots = allSlots.filter(slot => {
        const matchesSearch = !searchTerm || slot.slotCode.includes(searchTerm);
        const matchesFloor = !selectedFloor || slot.floor.toString() === selectedFloor;
        const matchesStatus = !selectedStatus || slot.status === selectedStatus;

        return matchesSearch && matchesFloor && matchesStatus;
    });

    renderFilteredResults();
    updateStatistics();
    updateResultsInfo();
}

// Render filtered results
function renderFilteredResults() {
    const tbody = document.getElementById('slots-tbody');
    const noResults = document.getElementById('no-results');
    const tableWrapper = document.querySelector('.table-wrapper');

    if (!tbody || !noResults) return;

    // Hide all rows first
    allSlots.forEach(slot => {
        slot.element.style.display = 'none';
    });

    // Show filtered rows
    if (filteredSlots.length > 0) {
        filteredSlots.forEach((slot, index) => {
            slot.element.style.display = '';
            // Add animation delay for smooth appearance
            slot.element.style.animationDelay = `${index * 50}ms`;
            slot.element.classList.add('fade-in');
        });

        if (tableWrapper) tableWrapper.style.display = 'block';
        noResults.style.display = 'none';
    } else {
        if (tableWrapper) tableWrapper.style.display = 'none';
        noResults.style.display = 'block';
    }

    // Remove animation class after animation completes
    setTimeout(() => {
        filteredSlots.forEach(slot => {
            slot.element.classList.remove('fade-in');
        });
    }, 1000);
}

// Reset all filters
function resetFilters() {
    const searchInput = document.getElementById('search-input');
    const floorFilter = document.getElementById('floor-filter');
    const statusFilter = document.getElementById('status-filter');
    const clearSearchBtn = document.getElementById('clear-search');

    if (searchInput) searchInput.value = '';
    if (floorFilter) floorFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';

    filteredSlots = [...allSlots];
    renderFilteredResults();
    updateStatistics();
    updateResultsInfo();

    showNotification('🔄 Filters cleared', 'info');
}

// Update statistics
function updateStatistics() {
    const totalEl = document.getElementById('total-slots');
    const availableEl = document.getElementById('available-slots');
    const occupiedEl = document.getElementById('occupied-slots');
    const filteredEl = document.getElementById('filtered-slots');

    if (totalEl) totalEl.textContent = allSlots.length;

    const availableCount = filteredSlots.filter(slot => slot.status === 'available').length;
    const occupiedCount = filteredSlots.filter(slot => slot.status === 'occupied').length;

    if (availableEl) availableEl.textContent = availableCount;
    if (occupiedEl) occupiedEl.textContent = occupiedCount;
    if (filteredEl) filteredEl.textContent = filteredSlots.length;
}

// Update results info
function updateResultsInfo() {
    const resultsInfo = document.getElementById('results-info');
    if (resultsInfo) {
        const total = allSlots.length;
        const showing = filteredSlots.length;
        resultsInfo.textContent = `Showing ${showing} of ${total} slots`;
    }
}

// Initialize sorting functionality
function initializeSorting() {
    const sortableHeaders = document.querySelectorAll('.sortable');

    sortableHeaders.forEach(header => {
        header.addEventListener('click', function () {
            const column = this.dataset.column;
            handleSort(column, this);
        });
    });
}

// Handle sorting
function handleSort(column, headerElement) {
    // Update sort direction
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }

    // Update UI indicators
    document.querySelectorAll('.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        const icon = header.querySelector('.sort-icon');
        if (icon) icon.textContent = '↕';
    });

    headerElement.classList.add(`sort-${currentSort.direction}`);
    const icon = headerElement.querySelector('.sort-icon');
    if (icon) {
        icon.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
    }

    // Sort the filtered slots
    filteredSlots.sort((a, b) => {
        let aValue, bValue;

        switch (column) {
            case 'slotCode':
                aValue = a.slotCode;
                bValue = b.slotCode;
                break;
            case 'floor':
                aValue = a.floor;
                bValue = b.floor;
                break;
            case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return currentSort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    renderFilteredResults();
    showNotification(`🔢 Sorted by ${column} (${currentSort.direction})`, 'info', 2000);
}

// Initialize export functionality
function initializeExport() {
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }
}

// Export filtered data to CSV
function exportToCSV() {
    const headers = ['Slot Code', 'Floor', 'Status'];
    const csvContent = [
        headers.join(','),
        ...filteredSlots.map(slot => {
            const slotCode = slot.slotCode.toUpperCase();
            const floor = slot.floor;
            const status = slot.status === 'available' ? 'Available' : 'Occupied';
            return `"${slotCode}","${floor}","${status}"`;
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `parking-slots-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showNotification(`📄 Exported ${filteredSlots.length} slots to CSV`, 'success');
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// SignalR Hub initialization
function initializeParkingHub() {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/parkingHub")
        .configureLogging(signalR.LogLevel.Information)
        .build();

    connection.on("ReceiveSlotUpdate", function (action, slot) {
        handleSlotUpdate(action, slot);
    });

    startConnection(connection);

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

    updateSlotInTable(action, slot);

    if (shouldAutoRefresh(action)) {
        setTimeout(() => {
            location.reload();
        }, 1500);
    }
}

function getNotificationConfig(action) {
    const configs = {
        'created': { icon: '✨', type: 'success', duration: 4000 },
        'updated': { icon: '🔄', type: 'warning', duration: 4000 },
        'deleted': { icon: '❌', type: 'error', duration: 4000 }
    };

    return configs[action.toLowerCase()] || { icon: '📝', type: 'info', duration: 3000 };
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
            console.log('Notification clicked');
        }
    }).showToast();
}

function updateSlotInTable(action, slot) {
    if (!slot || !slot.id) return;

    const row = document.querySelector(`tr[data-slot-id="${slot.id}"]`);

    switch (action.toLowerCase()) {
        case 'created':
            setTimeout(() => location.reload(), 1000);
            break;
        case 'updated':
            if (row) {
                updateRowData(row, slot);
                // Refresh the filtered data
                loadSlotData();
                applyFilters();
            }
            break;
        case 'deleted':
            if (row) {
                animateRowRemoval(row);
                // Update data arrays
                allSlots = allSlots.filter(s => s.id !== slot.id);
                filteredSlots = filteredSlots.filter(s => s.id !== slot.id);
                updateStatistics();
                updateResultsInfo();
            }
            break;
    }
}

function updateRowData(row, slot) {
    const slotCodeCell = row.querySelector('.slot-code');
    if (slotCodeCell) {
        slotCodeCell.textContent = slot.slotCode;
    }

    const statusCell = row.querySelector('.status-badge');
    if (statusCell) {
        statusCell.className = slot.isAvailable ?
            'status-badge status-available' :
            'status-badge status-unavailable';
        statusCell.textContent = slot.isAvailable ? 'Available' : 'Occupied';
    }

    const floorCell = row.querySelector('.floor-info');
    if (floorCell) {
        floorCell.textContent = `Floor ${slot.floor}`;
    }

    // Update data attributes
    row.dataset.slotCode = slot.slotCode.toLowerCase();
    row.dataset.floor = slot.floor;
    row.dataset.status = slot.isAvailable ? 'available' : 'occupied';

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
    }, 300);
}

function shouldAutoRefresh(action) {
    return ['created'].includes(action.toLowerCase());
}

// Additional utility functions
function addSmoothScrollBehavior() {
    document.documentElement.style.scrollBehavior = 'smooth';
}

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

// Enhanced console logging
console.log('🚗 Parking Slots Management System loaded');
console.log('📡 SignalR integration initialized');
console.log('🎨 UI enhancements loaded');
console.log('🔍 Search and Filter functionality loaded');
console.log('🔢 Sorting functionality loaded');
console.log('📄 Export functionality loaded');