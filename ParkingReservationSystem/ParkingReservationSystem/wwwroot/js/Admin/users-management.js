// Users Management JavaScript
document.addEventListener('DOMContentLoaded', function () {
    initializeUsersManagement();
});

function initializeUsersManagement() {
    // Initialize all components
    initializeSearch();
    initializeTableSorting();
    initializeRoleFilter();
    initializeActionButtons();
    initializeAnimations();
}

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchTerm');
    const roleSelect = document.getElementById('roleFilter');
    const filterForm = document.querySelector('.filter-form');

    if (!searchInput || !roleSelect || !filterForm) return;

    let searchTimeout;

    // Auto-submit search after typing stops
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
            filterForm.submit();
        }, 500);
    });

    // Submit on role change
    roleSelect.addEventListener('change', function () {
        filterForm.submit();
    });

    // Clear search functionality
    const clearBtn = document.querySelector('.btn-clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', function (e) {
            e.preventDefault();
            searchInput.value = '';
            roleSelect.value = '';
            window.location.href = clearBtn.href;
        });
    }
}

// Table sorting functionality
function initializeTableSorting() {
    const sortableHeaders = document.querySelectorAll('.sortable');

    sortableHeaders.forEach(header => {
        header.addEventListener('click', function () {
            const sortBy = this.dataset.sort;
            sortTable(sortBy);
        });
    });
}

function sortTable(sortBy) {
    const table = document.querySelector('.users-table tbody');
    const rows = Array.from(table.querySelectorAll('tr'));

    // Don't sort if no data
    if (rows.length === 1 && rows[0].querySelector('.no-data')) {
        return;
    }

    const currentSort = table.dataset.sortBy;
    const currentOrder = table.dataset.sortOrder || 'asc';

    // Determine new sort order
    let newOrder = 'asc';
    if (currentSort === sortBy && currentOrder === 'asc') {
        newOrder = 'desc';
    }

    // Sort rows
    rows.sort((a, b) => {
        let aValue, bValue;

        if (sortBy === 'name') {
            aValue = a.querySelector('.user-name').textContent.trim().toLowerCase();
            bValue = b.querySelector('.user-name').textContent.trim().toLowerCase();
        } else if (sortBy === 'email') {
            aValue = a.querySelector('.user-email').textContent.trim().toLowerCase();
            bValue = b.querySelector('.user-email').textContent.trim().toLowerCase();
        }

        if (newOrder === 'asc') {
            return aValue.localeCompare(bValue);
        } else {
            return bValue.localeCompare(aValue);
        }
    });

    // Update table
    rows.forEach(row => table.appendChild(row));

    // Update sort indicators
    updateSortIndicators(sortBy, newOrder);

    // Store sort state
    table.dataset.sortBy = sortBy;
    table.dataset.sortOrder = newOrder;
}

function updateSortIndicators(sortBy, order) {
    // Reset all sort icons
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.className = 'fas fa-sort sort-icon';
    });

    // Update active sort icon
    const activeHeader = document.querySelector(`[data-sort="${sortBy}"] .sort-icon`);
    if (activeHeader) {
        if (order === 'asc') {
            activeHeader.className = 'fas fa-sort-up sort-icon active';
        } else {
            activeHeader.className = 'fas fa-sort-down sort-icon active';
        }
    }
}

// Role filter with visual feedback
function initializeRoleFilter() {
    const roleSelect = document.getElementById('roleFilter');
    if (!roleSelect) return;

    // Add visual feedback for filtered state
    function updateFilterState() {
        const filterContainer = document.querySelector('.filters-container');
        if (roleSelect.value || document.getElementById('searchTerm').value) {
            filterContainer.classList.add('filtered');
        } else {
            filterContainer.classList.remove('filtered');
        }
    }

    updateFilterState();
    roleSelect.addEventListener('change', updateFilterState);
    document.getElementById('searchTerm').addEventListener('input', updateFilterState);
}

// Action buttons with confirmation
function initializeActionButtons() {
    // Delete confirmation
    const deleteButtons = document.querySelectorAll('.btn-delete');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            const userName = this.closest('tr').querySelector('.user-name').textContent.trim();
            const confirmed = confirm(`Are you sure you want to delete user "${userName}"?`);

            if (!confirmed) {
                e.preventDefault();
            }
        });
    });

    // Add loading state to action buttons
    const actionButtons = document.querySelectorAll('.btn-action');
    actionButtons.forEach(button => {
        button.addEventListener('click', function () {
            if (!this.classList.contains('btn-delete')) {
                this.style.opacity = '0.6';
                this.style.pointerEvents = 'none';

                // Reset after 2 seconds (in case navigation fails)
                setTimeout(() => {
                    this.style.opacity = '';
                    this.style.pointerEvents = '';
                }, 2000);
            }
        });
    });
}

// Animations and visual enhancements
function initializeAnimations() {
    // Animate stats cards on load
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 150);
    });

    // Add hover effects to table rows
    const tableRows = document.querySelectorAll('.user-row');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function () {
            this.style.transform = 'translateX(5px)';
        });

        row.addEventListener('mouseleave', function () {
            this.style.transform = 'translateX(0)';
        });
    });

    // Animate pagination
    const paginationContainer = document.querySelector('.pagination-container');
    if (paginationContainer) {
        paginationContainer.style.opacity = '0';
        paginationContainer.style.transform = 'translateY(20px)';

        setTimeout(() => {
            paginationContainer.style.transition = 'all 0.6s ease';
            paginationContainer.style.opacity = '1';
            paginationContainer.style.transform = 'translateY(0)';
        }, 800);
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);

    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

// Export functions for external use
window.UsersManagement = {
    sortTable,
    showNotification,
    updateFilterState: function () {
        const roleSelect = document.getElementById('roleFilter');
        const filterContainer = document.querySelector('.filters-container');
        if (roleSelect.value || document.getElementById('searchTerm').value) {
            filterContainer.classList.add('filtered');
        } else {
            filterContainer.classList.remove('filtered');
        }
    }
};

// Additional CSS for notifications (injected via JS)
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        padding: 16px 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
        border-left: 4px solid #17a2b8;
    }
    
    .notification-success {
        border-left-color: #28a745;
        color: #155724;
    }
    
    .notification-error {
        border-left-color: #dc3545;
        color: #721c24;
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        margin-left: auto;
        opacity: 0.6;
        transition: opacity 0.3s ease;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .filters-container.filtered {
        border-left: 4px solid #667eea;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
    }
    
    .sort-icon.active {
        color: #667eea;
        opacity: 1;
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);