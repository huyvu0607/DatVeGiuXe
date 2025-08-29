/**
<<<<<<< HEAD
 * TRANSACTIONS MANAGEMENT JAVASCRIPT - VERSION WITH CALENDAR FILTER
 * Enhanced functionality with calendar date picker, transaction filtering, expand/collapse, and performance monitoring
=======
 * TRANSACTIONS MANAGEMENT JAVASCRIPT - UPDATED VERSION
 * Enhanced functionality with corrected filters and grid view
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
 */

class TransactionsManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.totalItems = 0;
        this.currentSort = { column: null, direction: 'asc' };
        this.filters = {
            search: '',
            status: '',
            fromDate: '',
<<<<<<< HEAD
            toDate: '',
            selectedDate: null
        };
        this.selectedItems = new Set(); // Lưu GroupId dạng chuỗi
        this.tableData = [];
        this.originalTableData = [];
        this.currentView = 'table';

        this.calendar = {
            currentDate: new Date(),
            selectedDate: null,
            transactionDates: new Map()
        };
=======
            toDate: ''
        };
        this.selectedItems = new Set();
        this.tableData = [];
        this.originalTableData = [];
        this.currentView = 'table'; // 'table' or 'grid'
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeDatePickers();
        this.initializeTooltips();
        this.animateStatsNumbers();
        this.loadTableDataFromDOM();
        this.setupTableSorting();
        this.setupBulkActions();
        this.setupColumnToggle();
<<<<<<< HEAD
        this.initializeCalendar();
        this.setupExpandCollapse();
        this.setupActionButtons();
        console.log('TransactionsManager with Calendar initialized successfully');
    }

    setupExpandCollapse() {
        this.tableBody = document.getElementById('tableBody');
        if (!this.tableBody) return;

        // Remove existing event listeners to prevent duplicates
        this.tableBody.removeEventListener('click', this.expandCollapseHandler);

        // Create and store the handler function
        this.expandCollapseHandler = (e) => {
            const row = e.target.closest('.group-row');
            if (!row) return;

            // Don't trigger expand/collapse for checkboxes, buttons, or links
            if (e.target.type === 'checkbox' ||
                e.target.closest('.btn') ||
                e.target.closest('a') ||
                e.target.closest('.form-check')) {
                return;
            }

            e.preventDefault();

            const groupId = row.dataset.groupId;
            if (!groupId) return;

            const detailRows = this.tableBody.querySelectorAll(`.detail-row[data-parent="${groupId}"]`);
            const expandIcon = row.querySelector('.expand-icon');

            if (!expandIcon || detailRows.length === 0) return;

            const isExpanded = row.classList.contains('expanded');

            if (isExpanded) {
                // Collapse
                row.classList.remove('expanded');
                expandIcon.classList.remove('expanded');
                detailRows.forEach(detailRow => {
                    detailRow.style.display = 'none';
                });
            } else {
                // Expand
                row.classList.add('expanded');
                expandIcon.classList.add('expanded');
                detailRows.forEach(detailRow => {
                    detailRow.style.display = 'table-row';
                });
            }
        };

        // Add the event listener
        this.tableBody.addEventListener('click', this.expandCollapseHandler);
    }

    initializeCalendar() {
        this.setupCalendarEventListeners();
        this.calculateTransactionDates();
        this.renderCalendar();
    }

    setupCalendarEventListeners() {
        document.getElementById('prevMonth')?.addEventListener('click', this.previousMonth.bind(this));
        document.getElementById('nextMonth')?.addEventListener('click', this.nextMonth.bind(this));
        document.getElementById('clearDateFilter')?.addEventListener('click', this.clearDateFilter.bind(this));
    }

    calculateTransactionDates() {
        this.calendar.transactionDates.clear();
        console.log('Calculating transaction dates for:', this.originalTableData.length, 'items');

        // Chỉ đếm group-row
        this.originalTableData.forEach(item => {
            if (item.isGroup) { // Chỉ xử lý group-row
                const dateKey = this.formatDateKey(item.reservedAt);
                this.calendar.transactionDates.set(dateKey, (this.calendar.transactionDates.get(dateKey) || 0) + 1);
            }
        });

        console.log('Final transactionDates (groups only):', Object.fromEntries(this.calendar.transactionDates));
    }

    formatDateKey(date) {
        if (!date || !(date instanceof Date)) return null;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    previousMonth() {
        this.calendar.currentDate.setMonth(this.calendar.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.calendar.currentDate.setMonth(this.calendar.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    addDetailRowStyles() {
        const style = document.createElement('style');
        style.textContent = `
        .detail-row {
            background-color: #f9f9f9 !important;
            border-left: 4px solid #e0e0e0 !important;
        }
        
        .detail-row td {
            padding: 8px 12px !important;
            font-size: 0.9em;
            border-top: none !important;
        }
        
        .detail-row .slot-badge {
            background: #e3f2fd;
            color: #1976d2;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        
        .detail-row .action-buttons .btn {
            margin: 0 2px;
            padding: 4px 8px;
            font-size: 0.8rem;
        }
    `;

        if (!document.getElementById('detail-row-styles')) {
            style.id = 'detail-row-styles';
            document.head.appendChild(style);
        }
    }
    debugPaginationInfo() {
        console.log('=== Pagination Debug Info ===');
        console.log('Total tableData:', this.tableData.length);
        console.log('Group items:', this.tableData.filter(item => item.isGroup).length);
        console.log('Detail items:', this.tableData.filter(item => !item.isGroup).length);
        console.log('Current page:', this.currentPage);
        console.log('Page size:', this.pageSize);
        console.log('Total pages:', this.totalPages);
        console.log('Total items (should be group count):', this.totalItems);
        console.log('Current page data:', this.currentPageData.length);
        console.log('Current page groups:', this.currentPageData.filter(item => item.isGroup).length);
        console.log('==============================');
    }

    renderCalendar() {
        const currentDate = new Date(this.calendar.currentDate);
        const today = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthNames = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];
        document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const prevMonth = new Date(year, month - 1, 0);
        const daysInPrevMonth = prevMonth.getDate();

        const calendarGrid = document.getElementById('calendarGrid');
        if (!calendarGrid) return;

        let html = '';
        const dayHeaders = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        dayHeaders.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const date = new Date(year, month - 1, day);
            const dateKey = this.formatDateKey(date);
            const transactionCount = this.calendar.transactionDates.get(dateKey) || 0;
            html += `
                <div class="calendar-day other-month" data-date="${dateKey}">
                    ${day}
                    ${transactionCount > 0 ? `<div class="transaction-count">${transactionCount}</div>` : ''}
                </div>
            `;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = this.formatDateKey(date);
            const transactionCount = this.calendar.transactionDates.get(dateKey) || 0;

            let dayClasses = ['calendar-day'];
            if (date.toDateString() === today.toDateString()) dayClasses.push('today');
            if (this.calendar.selectedDate && dateKey === this.formatDateKey(this.calendar.selectedDate)) dayClasses.push('selected');
            if (transactionCount > 0) dayClasses.push('has-transactions');

            html += `
                <div class="${dayClasses.join(' ')}" data-date="${dateKey}" onclick="transactionsManager.selectDate('${dateKey}')">
                    ${day}
                    ${transactionCount > 0 ? `<div class="transaction-count">${transactionCount}</div>` : ''}
                </div>
            `;
        }

        const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
        const remainingCells = totalCells - (startingDayOfWeek + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            const date = new Date(year, month + 1, day);
            const dateKey = this.formatDateKey(date);
            const transactionCount = this.calendar.transactionDates.get(dateKey) || 0;
            html += `
                <div class="calendar-day other-month" data-date="${dateKey}">
                    ${day}
                    ${transactionCount > 0 ? `<div class="transaction-count">${transactionCount}</div>` : ''}
                </div>
            `;
        }

        calendarGrid.innerHTML = html;
    }

    selectDate(dateKey) {
        if (!dateKey) return;

        const [year, month, day] = dateKey.split('-').map(num => parseInt(num));
        const selectedDate = new Date(year, month - 1, day);

        this.calendar.selectedDate = selectedDate;
        this.filters.selectedDate = selectedDate;

        const selectedDateInfo = document.getElementById('selectedDateInfo');
        if (selectedDateInfo) {
            // Đảm bảo transactionCount được lấy và có giá trị mặc định
            const transactionCount = this.calendar.transactionDates.get(dateKey) || 0;
            selectedDateInfo.textContent = `Đã chọn: ${selectedDate.toLocaleDateString('vi-VN')} (${transactionCount} giao dịch)`;
        }

        this.renderCalendar();
        this.filterAndPaginate();

        // Đảm bảo transactionCount được sử dụng nhất quán
        const transactionCount = this.calendar.transactionDates.get(dateKey) || 0; // Khai báo lại để tránh lỗi scope
        this.showNotification(`Đã lọc theo ngày ${selectedDate.toLocaleDateString('vi-VN')}: ${transactionCount} giao dịch`, 'info');
    }

    clearDateFilter() {
        this.calendar.selectedDate = null;
        this.filters.selectedDate = null;

        const selectedDateInfo = document.getElementById('selectedDateInfo');
        if (selectedDateInfo) {
            selectedDateInfo.textContent = 'Chọn một ngày để xem giao dịch';
        }

        this.renderCalendar();
        this.filterAndPaginate();
        this.showNotification('Đã bỏ lọc theo ngày', 'info');
    }

    setupColumnToggle() {
=======
        console.log('TransactionsManager initialized successfully');
    }

    setupColumnToggle() {
        // Lắng nghe sự kiện change cho các checkbox trong dropdown
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.column) {
                this.toggleColumn(e.target.dataset.column, e.target.checked);
            }
        });

<<<<<<< HEAD
        const style = document.createElement('style');
        style.textContent = `
            .column-toggle-menu { min-width: 160px; }
            .column-toggle-menu li { padding: 0; }
            .column-toggle-menu label { display: flex; align-items: center; padding: 8px 16px; margin: 0; cursor: pointer; transition: background-color 0.2s; }
            .column-toggle-menu label:hover { background-color: #f8f9fa; }
            .column-toggle-menu input[type="checkbox"] { margin-right: 8px; margin-top: 0; }
        `;
=======
        // Thêm style cho dropdown menu
        const style = document.createElement('style');
        style.textContent = `
        .column-toggle-menu {
            min-width: 160px;
        }
        .column-toggle-menu li {
            padding: 0;
        }
        .column-toggle-menu label {
            display: flex;
            align-items: center;
            padding: 8px 16px;
            margin: 0;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .column-toggle-menu label:hover {
            background-color: #f8f9fa;
        }
        .column-toggle-menu input[type="checkbox"] {
            margin-right: 8px;
            margin-top: 0;
        }
    `;
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        document.head.appendChild(style);
    }

    toggleColumn(columnName, show) {
<<<<<<< HEAD
        const columnMap = {
            'customer': 1,
            'email': 2,
            'phone': 3,
            'reserved': 4,
            'expires': 5,
            'status': 6
=======
        // Map column names to actual column indices (0-based, bỏ qua cột checkbox đầu tiên)
        const columnMap = {
            'customer': 1,    // Khách hàng
            'email': 2,       // Email  
            'phone': 3,       // Điện thoại
            'reserved': 4,    // Ngày đặt
            'expires': 5,     // Hết hạn
            'status': 6       // Trạng thái
            // Cột vị trí (7) và thao tác (8) không có trong dropdown nên không cần ẩn
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        };

        const columnIndex = columnMap[columnName];
        if (columnIndex === undefined) return;

<<<<<<< HEAD
=======
        // Ẩn/hiện header
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        const headerCells = document.querySelectorAll(`#transactionsTable thead th:nth-child(${columnIndex + 1})`);
        headerCells.forEach(cell => {
            cell.style.display = show ? '' : 'none';
        });

<<<<<<< HEAD
=======
        // Ẩn/hiện body cells
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        const bodyCells = document.querySelectorAll(`#transactionsTable tbody td:nth-child(${columnIndex + 1})`);
        bodyCells.forEach(cell => {
            cell.style.display = show ? '' : 'none';
        });
    }

    setupEventListeners() {
<<<<<<< HEAD
        document.getElementById('toggleFilters')?.addEventListener('click', this.toggleFilters.bind(this));
=======
        // Filter toggle
        document.getElementById('toggleFilters')?.addEventListener('click', this.toggleFilters.bind(this));

        // Search input with debounce
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        }
<<<<<<< HEAD
        document.getElementById('statusFilter')?.addEventListener('change', this.handleStatusFilter.bind(this));
        document.getElementById('applyFiltersBtn')?.addEventListener('click', this.applyFilters.bind(this));
        document.getElementById('clearFiltersBtn')?.addEventListener('click', this.clearFilters.bind(this));
        document.getElementById('exportExcelBtn')?.addEventListener('click', this.exportToExcel.bind(this));
        document.getElementById('exportPdfBtn')?.addEventListener('click', this.exportToPDF.bind(this));
        document.getElementById('pageSizeSelect')?.addEventListener('change', this.handlePageSizeChange.bind(this));
        document.getElementById('selectAll')?.addEventListener('change', this.handleSelectAll.bind(this));
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', this.toggleView.bind(this));
        });
        document.getElementById('bulkConfirmBtn')?.addEventListener('click', this.handleBulkConfirm.bind(this));
        document.getElementById('bulkExportBtn')?.addEventListener('click', this.handleBulkExport.bind(this));
        document.getElementById('bulkDeleteBtn')?.addEventListener('click', this.handleBulkDelete.bind(this));
        document.getElementById('bulkSendEmailBtn')?.addEventListener('click', this.handleBulkSendEmail.bind(this));
        this.tableBody = document.getElementById('tableBody');
        if (this.tableBody) {
            this.tableBody.addEventListener('change', (e) => {
                if (e.target.classList.contains('row-checkbox')) {
                    this.handleRowSelection(e.target);
                }
            });
            this.tableBody.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete')) {
                    e.preventDefault();
                    this.confirmDelete(e.target.closest('.btn-delete'));
                }
            });
        }

=======

        // Filter controls
        document.getElementById('statusFilter')?.addEventListener('change', this.handleStatusFilter.bind(this));
        document.getElementById('applyFiltersBtn')?.addEventListener('click', this.applyFilters.bind(this));
        document.getElementById('clearFiltersBtn')?.addEventListener('click', this.clearFilters.bind(this));

        // Export buttons
        document.getElementById('exportExcelBtn')?.addEventListener('click', this.exportToExcel.bind(this));
        document.getElementById('exportPdfBtn')?.addEventListener('click', this.exportToPDF.bind(this));

        // Page size selector
        document.getElementById('pageSizeSelect')?.addEventListener('change', this.handlePageSizeChange.bind(this));

        // Select all checkbox
        document.getElementById('selectAll')?.addEventListener('change', this.handleSelectAll.bind(this));

        // View toggle
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', this.toggleView.bind(this));
        });

        // Bulk action buttons
        document.getElementById('bulkConfirmBtn')?.addEventListener('click', this.handleBulkConfirm.bind(this));
        document.getElementById('bulkExportBtn')?.addEventListener('click', this.handleBulkExport.bind(this));
        document.getElementById('bulkDeleteBtn')?.addEventListener('click', this.handleBulkDelete.bind(this));

        // Row checkboxes delegation
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-checkbox')) {
                this.handleRowSelection(e.target);
            }
        });

        // Action button delegations
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete')) {
                e.preventDefault();
                this.confirmDelete(e.target.closest('.btn-delete'));
            }
        });

        // Window resize handler
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 150));
    }

    initializeDatePickers() {
        if (typeof $.fn.datepicker !== 'undefined') {
            $('.datepicker').datepicker({
                format: 'dd/mm/yyyy',
                language: 'vi',
                autoclose: true,
                todayHighlight: true,
                orientation: 'bottom auto'
            }).on('changeDate', (e) => {
                this.handleDateFilter(e.target);
            });
        }
    }

    initializeTooltips() {
        if (typeof bootstrap !== 'undefined') {
<<<<<<< HEAD
            const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltipTriggerList.forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
=======
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(tooltipTriggerEl => {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        }
    }

    animateStatsNumbers() {
        const statsNumbers = document.querySelectorAll('.stats-number[data-count]');
<<<<<<< HEAD
=======

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateNumber(entry.target);
                    observer.unobserve(entry.target);
                }
            });
<<<<<<< HEAD
        }, { threshold: 0.5 });
=======
        });
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd

        statsNumbers.forEach(number => observer.observe(number));
    }

    animateNumber(element) {
        const target = parseInt(element.dataset.count) || 0;
        const duration = 1500;
        const start = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
<<<<<<< HEAD
            const current = Math.floor(progress * target);
            element.textContent = current.toLocaleString();
            if (progress < 1) requestAnimationFrame(animate);
        };
=======

            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * target);

            element.textContent = this.formatNumber(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        requestAnimationFrame(animate);
    }

    formatNumber(num) {
<<<<<<< HEAD
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
=======
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        return num.toLocaleString();
    }

    toggleFilters() {
        const filterBody = document.getElementById('filterBody');
        const toggleBtn = document.getElementById('toggleFilters');
<<<<<<< HEAD
        if (filterBody && toggleBtn) {
            const isCollapsed = filterBody.classList.contains('collapsed');
            filterBody.classList.toggle('collapsed');
            const icon = toggleBtn.querySelector('i');
            icon.className = isCollapsed ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
=======

        if (filterBody && toggleBtn) {
            const isCollapsed = filterBody.classList.contains('collapsed');

            filterBody.classList.toggle('collapsed');
            const icon = toggleBtn.querySelector('i');

            if (isCollapsed) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        }
    }

    handleSearch(event) {
        this.filters.search = event.target.value.toLowerCase();
        this.filterAndPaginate();
    }

    handleStatusFilter(event) {
        this.filters.status = event.target.value;
        this.filterAndPaginate();
    }

    handleDateFilter(input) {
        const id = input.id;
        const value = input.value;
<<<<<<< HEAD
        if (id === 'fromDate') this.filters.fromDate = value;
        else if (id === 'toDate') this.filters.toDate = value;
=======

        if (id === 'fromDate') {
            this.filters.fromDate = value;
        } else if (id === 'toDate') {
            this.filters.toDate = value;
        }

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        this.filterAndPaginate();
    }

    applyFilters() {
        this.showLoading('Đang áp dụng bộ lọc...');
<<<<<<< HEAD
=======

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        setTimeout(() => {
            this.filterAndPaginate();
            this.hideLoading();
            this.showNotification('Đã áp dụng bộ lọc thành công', 'success');
        }, 800);
    }

    clearFilters() {
<<<<<<< HEAD
=======
        // Reset all filter inputs
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('fromDate').value = '';
        document.getElementById('toDate').value = '';
<<<<<<< HEAD
        this.filters = { search: '', status: '', fromDate: '', toDate: '', selectedDate: null };
        this.calendar.selectedDate = null;
        this.renderCalendar();
        const selectedDateInfo = document.getElementById('selectedDateInfo');
        if (selectedDateInfo) selectedDateInfo.textContent = 'Chọn một ngày để xem giao dịch';
=======

        // Reset filter object
        this.filters = {
            search: '',
            status: '',
            fromDate: '',
            toDate: ''
        };

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        this.currentPage = 1;
        this.filterAndPaginate();
        this.showNotification('Đã xóa tất cả bộ lọc', 'info');
    }

    loadTableDataFromDOM() {
<<<<<<< HEAD
        this.tableBody = document.getElementById('tableBody');
        if (!this.tableBody) return;

        this.tableData = [];
        this.originalTableData = [];
        const groupRows = this.tableBody.querySelectorAll('.group-row');

        groupRows.forEach(row => {
            const groupId = row.dataset.groupId.split('group-')[1]; // Lấy GroupId
            const data = this.extractDataFromRow(row);
            data.id = groupId; // Sử dụng GroupId làm id
            data.isGroup = true;
            this.tableData.push(data);
            this.originalTableData.push({ ...data });

            // Lấy detail-row tương ứng
            const detailRows = this.tableBody.querySelectorAll(`.detail-row[data-parent="${row.dataset.groupId}"]`);
            detailRows.forEach(detailRow => {
                const detailData = this.extractDataFromDetailRow(detailRow, data);
                detailData.isGroup = false;
                detailData.customerId = groupId; // Liên kết với GroupId
                this.tableData.push(detailData);
                this.originalTableData.push({ ...detailData });
            });
        });

        console.log('Total items loaded:', this.tableData.length);
        console.log('Group items:', this.tableData.filter(item => item.isGroup).length);
        console.log('Detail items:', this.tableData.filter(item => !item.isGroup).length);

        // Tính toán chỉ dựa trên group-row
        const groupItems = this.tableData.filter(item => item.isGroup);
        this.totalItems = groupItems.length;
        this.updatePagination();
        this.calculateTransactionDates();
        this.filterAndPaginate();
    }
    extractDataFromRow(row) {
        const groupId = row.dataset.groupId.split('group-')[1];
        const dateAttr = row.dataset.date;
        const customerName = row.querySelector('.customer-name')?.textContent || '';
        const customerId = row.querySelector('.customer-id')?.textContent?.replace('ID: ', '') || '';
        const email = row.querySelector('.email-info span')?.textContent || '';
        const phone = row.querySelector('.phone-info span')?.textContent || '';
        const slotCodes = Array.from(row.querySelectorAll('.slot-badge-group')).map(b => b.textContent);
        const reservedDateText = row.querySelector('.date-info .date')?.textContent || '';
        const reservedTimeText = row.querySelector('.date-info .time')?.textContent || '';
=======
        const tableRows = document.querySelectorAll('#tableBody .table-row');
        const gridItems = document.querySelectorAll('#gridContainer .grid-item');
        this.tableData = [];
        this.originalTableData = [];

        // Load from table rows if available
        if (tableRows.length > 0) {
            tableRows.forEach(row => {
                const data = this.extractDataFromRow(row);
                this.tableData.push(data);
                this.originalTableData.push({ ...data });
            });
        } else if (gridItems.length > 0) {
            // Load from grid items if table is not visible
            gridItems.forEach(item => {
                const data = this.extractDataFromGridItem(item);
                this.tableData.push(data);
                this.originalTableData.push({ ...data });
            });
        }

        // Sort by ReservedAt descending (newest first)
        this.tableData.sort((a, b) => b.reservedAt - a.reservedAt);
        this.originalTableData.sort((a, b) => b.reservedAt - a.reservedAt);

        this.totalItems = this.tableData.length;
        this.updatePagination();
        this.filterAndPaginate();
    }

    extractDataFromRow(row) {
        const id = parseInt(row.dataset.id);
        const customerName = row.querySelector('.customer-name')?.textContent || '';
        const customerId = row.querySelector('.customer-id')?.textContent || '';
        const email = row.querySelector('.email-info span')?.textContent || '';
        const phone = row.querySelector('.phone-info span')?.textContent || '';

        // Parse dates
        const dateElements = row.querySelectorAll('.date-info');
        const reservedDateText = dateElements[0]?.querySelector('.date')?.textContent || '';
        const reservedTimeText = dateElements[0]?.querySelector('.time')?.textContent || '';
        const expiresDateText = dateElements[1]?.querySelector('.date')?.textContent || '';
        const expiresTimeText = dateElements[1]?.querySelector('.time')?.textContent || '';

        // Parse status
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        const statusElement = row.querySelector('.status-badge');
        const isConfirmed = statusElement?.classList.contains('status-confirmed') || false;
        const isExpired = statusElement?.classList.contains('status-expired') || false;

<<<<<<< HEAD
        const reservedAt = this.parseDateTime(reservedDateText, reservedTimeText);

        return {
            id: groupId, // Sử dụng GroupId
            name: customerName,
            customerId: customerId, // Vẫn giữ UserId để hiển thị
            email: email,
            phone: phone,
            reservedAt: reservedAt,
            isConfirmed: isConfirmed,
            isExpired: isExpired,
            slotCode: slotCodes.join(', '),
            isGroup: true
        };
    }

    extractDataFromDetailRow(row, groupData) {
        const reservationId = parseInt(row.querySelector('.customer-id')?.textContent?.replace('ID: ', '') || 0);
        const slotCode = row.querySelector('.slot-badge')?.textContent || '';
        const expiresDateText = row.querySelector('.date-info .date')?.textContent || '';
        const expiresTimeText = row.querySelector('.date-info .time')?.textContent || '';
        const statusElement = row.querySelector('.status-badge');
        const isConfirmed = statusElement?.classList.contains('status-confirmed') || false;
        const isExpired = statusElement?.classList.contains('status-expired') || false;

        const expiresAt = this.parseDateTime(expiresDateText, expiresTimeText);

        return {
            id: reservationId,
            name: groupData.name,
            customerId: groupData.id, // Use group's id instead of customerId string
            email: groupData.email,
            phone: groupData.phone,
            reservedAt: groupData.reservedAt,
            expiresAt: expiresAt,
            isConfirmed: isConfirmed,
            isExpired: isExpired,
            slotCode: slotCode,
            isGroup: false
=======
        // Parse slot code
        const slotCode = row.querySelector('.slot-badge')?.textContent || '';

        const reservedAt = this.parseDateTime(reservedDateText, reservedTimeText);
        const expiresAt = this.parseDateTime(expiresDateText, expiresTimeText);

        return {
            id: id,
            name: customerName,
            customerId: customerId,
            email: email,
            phone: phone,
            reservedAt: reservedAt,
            expiresAt: expiresAt,
            isConfirmed: isConfirmed,
            isExpired: isExpired,
            slotCode: slotCode
        };
    }

    extractDataFromGridItem(item) {
        const id = parseInt(item.dataset.id);
        const customerName = item.querySelector('.customer-name')?.textContent || '';
        const email = item.querySelector('.detail-item:nth-child(1) span')?.textContent || '';
        const phone = item.querySelector('.detail-item:nth-child(2) span')?.textContent || '';

        // Parse dates from detail items
        const dateTimeTexts = item.querySelectorAll('.detail-item span');
        const reservedDateTime = dateTimeTexts[2]?.textContent || '';
        const expiresDateTime = dateTimeTexts[3]?.textContent || '';

        // Parse status
        const statusElement = item.querySelector('.status-badge');
        const isConfirmed = statusElement?.classList.contains('status-confirmed') || false;
        const isExpired = statusElement?.classList.contains('status-expired') || false;

        const slotCode = item.querySelector('.slot-badge')?.textContent || '';

        return {
            id: id,
            name: customerName,
            email: email,
            phone: phone,
            reservedAt: this.parseDateTimeString(reservedDateTime),
            expiresAt: this.parseDateTimeString(expiresDateTime),
            isConfirmed: isConfirmed,
            isExpired: isExpired,
            slotCode: slotCode
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        };
    }

    parseDateTime(dateStr, timeStr) {
        try {
            const dateParts = dateStr.split('/');
            const timeParts = timeStr.split(':');
<<<<<<< HEAD
=======

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
            if (dateParts.length === 3 && timeParts.length === 2) {
                const day = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1;
                const year = parseInt(dateParts[2]);
                const hours = parseInt(timeParts[0]);
                const minutes = parseInt(timeParts[1]);
<<<<<<< HEAD
=======

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                return new Date(year, month, day, hours, minutes);
            }
        } catch (error) {
            console.warn('Error parsing date/time:', dateStr, timeStr, error);
        }
        return new Date();
    }

<<<<<<< HEAD
    filterAndPaginate() {
        let filteredData = [...this.tableData];

        // Apply all filters
=======
    parseDateTimeString(dateTimeStr) {
        try {
            const [dateStr, timeStr] = dateTimeStr.split(' ');
            return this.parseDateTime(dateStr, timeStr);
        } catch (error) {
            console.warn('Error parsing datetime string:', dateTimeStr, error);
            return new Date();
        }
    }

    filterAndPaginate() {
        let filteredData = [...this.tableData];

        // Apply filters
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        if (this.filters.search) {
            filteredData = filteredData.filter(item =>
                item.name.toLowerCase().includes(this.filters.search) ||
                item.email.toLowerCase().includes(this.filters.search) ||
                item.phone.includes(this.filters.search)
            );
        }

        if (this.filters.status) {
            if (this.filters.status === 'confirmed') {
                filteredData = filteredData.filter(item => item.isConfirmed);
            } else if (this.filters.status === 'pending') {
<<<<<<< HEAD
                filteredData = filteredData.filter(item => !item.isConfirmed && (item.expiresAt > new Date() || !item.expiresAt));
            } else if (this.filters.status === 'expired') {
=======
                filteredData = filteredData.filter(item => !item.isConfirmed && item.expiresAt > new Date());
            } else if (this.filters.status === 'expired') {
                // Expired: not confirmed AND expiration date has passed
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                filteredData = filteredData.filter(item => !item.isConfirmed && item.expiresAt < new Date());
            }
        }

<<<<<<< HEAD
        if (this.filters.selectedDate) {
            const selectedDateKey = this.formatDateKey(this.filters.selectedDate);
            filteredData = filteredData.filter(item => {
                const itemDateKey = this.formatDateKey(item.reservedAt);
                return itemDateKey === selectedDateKey;
            });
        }

=======
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        if (this.filters.fromDate) {
            const fromDate = this.parseDate(this.filters.fromDate);
            filteredData = filteredData.filter(item => item.reservedAt >= fromDate);
        }

        if (this.filters.toDate) {
            const toDate = this.parseDate(this.filters.toDate);
            filteredData = filteredData.filter(item => item.reservedAt <= toDate);
        }

<<<<<<< HEAD
        // QUAN TRỌNG: Chỉ lấy group-row để tính pagination
        const groupOnlyData = filteredData.filter(item => item.isGroup);

        if (this.currentSort.column) {
            groupOnlyData.sort((a, b) => {
                let aVal = a[this.currentSort.column];
                let bVal = b[this.currentSort.column];
=======
        // Apply sorting
        if (this.currentSort.column) {
            filteredData.sort((a, b) => {
                let aVal = a[this.currentSort.column];
                let bVal = b[this.currentSort.column];

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }
<<<<<<< HEAD
=======

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                let result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return this.currentSort.direction === 'desc' ? -result : result;
            });
        } else {
<<<<<<< HEAD
            groupOnlyData.sort((a, b) => b.reservedAt - a.reservedAt);
        }

        // Cập nhật thông tin pagination dựa trên group-row
        this.totalItems = groupOnlyData.length;
=======
            // Default sort: newest first
            filteredData.sort((a, b) => b.reservedAt - a.reservedAt);
        }

        this.totalItems = filteredData.length;
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);

        if (this.currentPage > this.totalPages && this.totalPages > 0) {
            this.currentPage = this.totalPages;
        }

<<<<<<< HEAD
        // Pagination cho group-row
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const currentPageGroups = groupOnlyData.slice(startIndex, endIndex);

        // Lấy tất cả detail-row tương ứng với các group trong trang hiện tại
        const currentPageGroupIds = currentPageGroups.map(group => group.id);
        const currentPageDetails = filteredData.filter(item =>
            !item.isGroup && currentPageGroupIds.includes(item.customerId)
        );

        // Combine group và detail cho trang hiện tại
        this.currentPageData = [...currentPageGroups, ...currentPageDetails];
=======
        // Apply pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.currentPageData = filteredData.slice(startIndex, endIndex);
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd

        this.renderCurrentView();
        this.updatePagination();
        this.updatePaginationInfo();
    }

    renderCurrentView() {
<<<<<<< HEAD
        if (this.currentView === 'table') this.renderTable();
        else this.renderGrid();
=======
        if (this.currentView === 'table') {
            this.renderTable();
        } else {
            this.renderGrid();
        }
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
    }

    setupTableSorting() {
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
<<<<<<< HEAD
=======

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                if (this.currentSort.column === column) {
                    this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    this.currentSort.column = column;
                    this.currentSort.direction = 'asc';
                }
<<<<<<< HEAD
=======

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                this.updateSortIcons();
                this.filterAndPaginate();
            });
        });
    }

    updateSortIcons() {
        document.querySelectorAll('.sortable').forEach(header => {
            const icon = header.querySelector('.sort-icon');
            header.classList.remove('sorted');
<<<<<<< HEAD
=======

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
            if (header.dataset.sort === this.currentSort.column) {
                header.classList.add('sorted');
                icon.className = this.currentSort.direction === 'asc' ?
                    'fas fa-sort-up sort-icon' : 'fas fa-sort-down sort-icon';
            } else {
                icon.className = 'fas fa-sort sort-icon';
            }
        });
    }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;

        if (this.currentPageData.length === 0) {
            tbody.innerHTML = `
<<<<<<< HEAD
            <tr>
                <td colspan="8" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Không tìm thấy dữ liệu</h5>
                        <p class="text-muted">Thử điều chỉnh bộ lọc của bạn</p>
                    </div>
                </td>
            </tr>
        `;
            return;
        }

        // Sắp xếp data: group-row trước, detail-row ngay sau group tương ứng
        const sortedData = [];
        const groups = this.currentPageData.filter(item => item.isGroup);

        groups.forEach(group => {
            // Thêm group row
            sortedData.push(group);

            // Thêm tất cả detail rows của group này
            const details = this.currentPageData.filter(item =>
                !item.isGroup && item.customerId === group.id
            );
            sortedData.push(...details);
        });

        // Render tất cả rows theo thứ tự đã sắp xếp
        tbody.innerHTML = sortedData.map(item => this.renderTableRow(item)).join('');

        this.setupRowAnimations();
        this.setupExpandCollapse(); // Re-initialize expand/collapse after render
    }

    setupActionButtons() {
        if (this.tableBody) {
            this.tableBody.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.btn-delete');
                if (deleteBtn) {
                    e.preventDefault();
                    this.confirmDelete(deleteBtn);
                    return;
                }

                // Xử lý các action buttons khác nếu cần
                const editBtn = e.target.closest('.btn-edit');
                if (editBtn) {
                    // Có thể thêm logic validation trước khi edit
                    console.log('Editing item:', editBtn.href);
                }

                const viewBtn = e.target.closest('.btn-view');
                if (viewBtn) {
                    // Có thể thêm logic tracking hoặc loading
                    console.log('Viewing item:', viewBtn.href);
                }
            });
        }
=======
                <tr>
                    <td colspan="9" class="text-center py-5">
                        <div class="empty-state">
                            <i class="fas fa-search fa-3x text-muted mb-3"></i>
                            <h5 class="text-muted">Không tìm thấy dữ liệu</h5>
                            <p class="text-muted">Thử điều chỉnh bộ lọc của bạn</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.currentPageData.map(item => this.renderTableRow(item)).join('');
        this.setupRowAnimations();
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
    }

    renderGrid() {
        const gridContainer = document.getElementById('gridContainer');
        if (!gridContainer) return;

        if (this.currentPageData.length === 0) {
            gridContainer.innerHTML = `
<<<<<<< HEAD
            <div class="col-12 text-center py-5">
                <div class="empty-state">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Không tìm thấy dữ liệu</h5>
                    <p class="text-muted">Thử điều chỉnh bộ lọc của bạn</p>
                </div>
            </div>
        `;
            return;
        }

        // Chỉ lấy group-row để hiển thị trong grid
        const groupData = this.currentPageData.filter(item => item.isGroup);
        gridContainer.innerHTML = groupData.map(item => this.renderGridItem(item)).join('');
=======
                <div class="col-12 text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Không tìm thấy dữ liệu</h5>
                        <p class="text-muted">Thử điều chỉnh bộ lọc của bạn</p>
                    </div>
                </div>
            `;
            return;
        }

        gridContainer.innerHTML = this.currentPageData.map(item => this.renderGridItem(item)).join('');
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        this.setupRowAnimations();
    }

    renderTableRow(item) {
        const initials = item.name.split(' ').map(n => n[0]).slice(0, 2).join('');
<<<<<<< HEAD
        let statusClass, statusIcon, statusText;

        if (item.isConfirmed) {
            statusClass = 'status-confirmed';
            statusIcon = 'fa-check-circle';
            statusText = 'Đã xác nhận';
        } else if (item.isExpired || (item.expiresAt && item.expiresAt < new Date())) {
            statusClass = 'status-expired';
            statusIcon = 'fa-times-circle';
            statusText = 'Đá hết hạn';
        } else {
            statusClass = 'status-pending';
            statusIcon = 'fa-clock';
            statusText = 'Chờ xác nhận';
        }

        if (item.isGroup) {
            // Render group row - giữ nguyên format gốc
            return `
            <tr class="group-row table-row" 
                data-group-id="group-${item.id}" 
                data-date="${this.formatDateKey(item.reservedAt)}">
                <td>
                    <div class="form-check">
                        <input class="form-check-input row-checkbox group-checkbox" 
                               type="checkbox" value="${item.id}">
                    </div>
                </td>
                <td>
                    <div class="customer-info">
                        <div class="customer-avatar">
                            <span>${initials}</span>
                        </div>
                        <div class="customer-details">
                            <div class="customer-name">${item.name}</div>
                            <div class="customer-id">ID: ${item.customerId}</div>
                            <div class="group-stats">
                                <span class="stat-item">
                                    <i class="fas fa-layer-group"></i>
                                    <span class="stat-number">${item.slotCode.split(', ').length}</span> slot
                                </span>
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="email-info">
                        <span>${item.email}</span>
                    </div>
                </td>
                <td>
                    <div class="phone-info">
                        <span>${item.phone}</span>
                    </div>
                </td>
                <td>
                    <div class="slot-badges">
                        ${item.slotCode.split(', ').slice(0, 3).map(code => `<span class="slot-badge-group">${code}</span>`).join('')}
                        ${item.slotCode.split(', ').length > 3 ? `<span class="slot-badge-group">+${item.slotCode.split(', ').length - 3}</span>` : ''}
                    </div>
                </td>
                <td>
                    <div class="date-info">
                        <div class="date">${this.formatDate(item.reservedAt)}</div>
                        <div class="time">${this.formatTime(item.reservedAt)}</div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        <span>${statusText}</span>
                    </span>
                </td>
                <td>
                    <i class="fas fa-chevron-right expand-icon" aria-hidden="true"></i>
                </td>
            </tr>
        `;
        } else {
            // Render detail row - Format giống như trong view gốc
            return `
            <tr class="detail-row" 
                data-parent="group-${item.customerId}" 
                style="display: none;">
                <td></td>
                <td colspan="2">
                    <div class="ms-4">
                        <div class="customer-id">ID: ${item.id.toString().padStart(3, '0')}</div>
                    </div>
                </td>
                <td>
                    <span class="slot-badge">${item.slotCode}</span>
                </td>
                <td>
                    <div class="date-info">
                        <div class="date">${item.expiresAt ? this.formatDate(item.expiresAt) : ''}</div>
                        <div class="time">${item.expiresAt ? this.formatTime(item.expiresAt) : ''}</div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        <span>${statusText}</span>
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <div class="btn-group">
                            <a href="/Transactions/Details/${item.id}" 
                               class="btn btn-action btn-view"
                               data-bs-toggle="tooltip" title="Xem chi tiết">
                                <i class="fas fa-eye"></i>
                            </a>
                            <a href="/Transactions/Edit/${item.id}" 
                               class="btn btn-action btn-edit"
                               data-bs-toggle="tooltip" title="Chỉnh sửa">
                                <i class="fas fa-edit"></i>
                            </a>
                            <a href="/Transactions/Delete/${item.id}" 
                               class="btn btn-action btn-delete"
                               data-bs-toggle="tooltip" title="Xóa">
                                <i class="fas fa-trash"></i>
                            </a>
                        </div>
                    </div>
                </td>
                <td></td>
            </tr>
        `;
        }
    }

    renderGridItem(item) {
        const initials = item.name.split(' ').map(n => n[0]).slice(0, 2).join('');
=======

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        let statusClass, statusIcon, statusText;
        if (item.isConfirmed) {
            statusClass = 'status-confirmed';
            statusIcon = 'fa-check-circle';
            statusText = 'Đã xác nhận';
        } else if (item.expiresAt < new Date()) {
            statusClass = 'status-expired';
            statusIcon = 'fa-times-circle';
            statusText = 'Đã hết hạn';
        } else {
            statusClass = 'status-pending';
            statusIcon = 'fa-clock';
            statusText = 'Chờ xác nhận';
        }

        return `
<<<<<<< HEAD
            <div class="col-xl-4 col-lg-6 col-md-12 grid-item" data-id="${item.id}" data-date="${this.formatDateKey(item.reservedAt)}">
=======
            <tr class="table-row animate-fade-in" data-id="${item.id}">
                <td>
                    <div class="form-check">
                        <input class="form-check-input row-checkbox" type="checkbox" value="${item.id}">
                    </div>
                </td>
                <td>
                    <div class="customer-info">
                        <div class="customer-avatar">
                            <span>${initials}</span>
                        </div>
                        <div class="customer-details">
                            <div class="customer-name">${item.name}</div>
                            <div class="customer-id">ID: #${item.id.toString().padStart(3, '0')}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="email-info">
                        <span>${item.email}</span>
                    </div>
                </td>
                <td>
                    <div class="phone-info">
                        <span>${item.phone}</span>
                    </div>
                </td>
                <td>
                    <div class="date-info">
                        <div class="date">${this.formatDate(item.reservedAt)}</div>
                        <div class="time">${this.formatTime(item.reservedAt)}</div>
                    </div>
                </td>
                <td>
                    <div class="date-info">
                        <div class="date">${this.formatDate(item.expiresAt)}</div>
                        <div class="time">${this.formatTime(item.expiresAt)}</div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        <span>${statusText}</span>
                    </span>
                </td>
                <td>
                    <div class="slot-info">
                        <span class="slot-badge">${item.slotCode}</span>
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <div class="btn-group">
                            <a href="/Transactions/Details/${item.id}" 
                               class="btn btn-action btn-view" 
                               data-bs-toggle="tooltip" title="Xem chi tiết">
                                <i class="fas fa-eye"></i>
                            </a>
                            <a href="/Transactions/Edit/${item.id}" 
                               class="btn btn-action btn-edit"
                               data-bs-toggle="tooltip" title="Chỉnh sửa">
                                <i class="fas fa-edit"></i>
                            </a>
                            <a href="/Transactions/Delete/${item.id}" 
                               class="btn btn-action btn-delete"
                               data-bs-toggle="tooltip" title="Xóa">
                                <i class="fas fa-trash"></i>
                            </a>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-action btn-more" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-h"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#"><i class="fas fa-print"></i> In hóa đơn</a></li>
                                <li><a class="dropdown-item" href="#"><i class="fas fa-paper-plane"></i> Gửi email</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#"><i class="fas fa-ban"></i> Hủy đặt chỗ</a></li>
                            </ul>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    renderGridItem(item) {
        const initials = item.name.split(' ').map(n => n[0]).slice(0, 2).join('');

        let statusClass, statusIcon, statusText;
        if (item.isConfirmed) {
            statusClass = 'status-confirmed';
            statusIcon = 'fa-check-circle';
            statusText = 'Đã xác nhận';
        } else if (item.expiresAt < new Date()) {
            statusClass = 'status-expired';
            statusIcon = 'fa-times-circle';
            statusText = 'Đã hết hạn';
        } else {
            statusClass = 'status-pending';
            statusIcon = 'fa-clock';
            statusText = 'Chờ xác nhận';
        }

        return `
            <div class="col-xl-4 col-lg-6 col-md-12 grid-item animate-fade-in" data-id="${item.id}">
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                <div class="card transaction-card">
                    <div class="card-header">
                        <div class="d-flex align-items-center justify-content-between">
                            <div class="customer-info-grid">
                                <div class="customer-avatar">
                                    <span>${initials}</span>
                                </div>
                                <div>
                                    <div class="customer-name">${item.name}</div>
                                    <div class="customer-id">ID: #${item.id.toString().padStart(3, '0')}</div>
                                </div>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input row-checkbox" type="checkbox" value="${item.id}">
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="transaction-details">
<<<<<<< HEAD
                            <div class="detail-item"><i class="fas fa-envelope text-muted"></i><span>${item.email}</span></div>
                            <div class="detail-item"><i class="fas fa-phone text-muted"></i><span>${item.phone}</span></div>
                            <div class="detail-item"><i class="fas fa-calendar text-muted"></i><span>${this.formatDate(item.reservedAt)} ${this.formatTime(item.reservedAt)}</span></div>
                            <div class="detail-item"><i class="fas fa-calendar-times text-muted"></i><span>${this.formatDate(item.expiresAt)} ${this.formatTime(item.expiresAt)}</span></div>
                            <div class="detail-item"><i class="fas fa-parking text-muted"></i><span class="slot-badge">${item.slotCode}</span></div>
                        </div>
=======
                            <div class="detail-item">
                                <i class="fas fa-envelope text-muted"></i>
                                <span>${item.email}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-phone text-muted"></i>
                                <span>${item.phone}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-calendar text-muted"></i>
                                <span>${this.formatDate(item.reservedAt)} ${this.formatTime(item.reservedAt)}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-calendar-times text-muted"></i>
                                <span>${this.formatDate(item.expiresAt)} ${this.formatTime(item.expiresAt)}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-parking text-muted"></i>
                                <span class="slot-badge">${item.slotCode}</span>
                            </div>
                        </div>
                        
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                        <div class="status-section mt-3">
                            <span class="status-badge ${statusClass}">
                                <i class="fas ${statusIcon}"></i>
                                <span>${statusText}</span>
                            </span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="action-buttons justify-content-center">
<<<<<<< HEAD
                            <a href="/Transactions/Details/${item.id}" class="btn btn-action btn-view" data-bs-toggle="tooltip" title="Xem chi tiết"><i class="fas fa-eye"></i></a>
                            <a href="/Transactions/Edit/${item.id}" class="btn btn-action btn-edit" data-bs-toggle="tooltip" title="Chỉnh sửa"><i class="fas fa-edit"></i></a>
                            <a href="/Transactions/Delete/${item.id}" class="btn btn-action btn-delete" data-bs-toggle="tooltip" title="Xóa"><i class="fas fa-trash"></i></a>
=======
                            <a href="/Transactions/Details/${item.id}"
                               class="btn btn-action btn-view"
                               data-bs-toggle="tooltip" title="Xem chi tiết">
                                <i class="fas fa-eye"></i>
                            </a>
                            <a href="/Transactions/Edit/${item.id}"
                               class="btn btn-action btn-edit"
                               data-bs-toggle="tooltip" title="Chỉnh sửa">
                                <i class="fas fa-edit"></i>
                            </a>
                            <a href="/Transactions/Delete/${item.id}"
                               class="btn btn-action btn-delete"
                               data-bs-toggle="tooltip" title="Xóa">
                                <i class="fas fa-trash"></i>
                            </a>
                            <div class="dropdown">
                                <button class="btn btn-action btn-more" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-h"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#"><i class="fas fa-print"></i> In hóa đơn</a></li>
                                    <li><a class="dropdown-item" href="#"><i class="fas fa-paper-plane"></i> Gửi email</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#"><i class="fas fa-ban"></i> Hủy đặt chỗ</a></li>
                                </ul>
                            </div>
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupRowAnimations() {
        const rows = this.currentView === 'table' ?
<<<<<<< HEAD
            document.querySelectorAll('.table-row, .detail-row') :
            document.querySelectorAll('.grid-item');
        rows.forEach((row, index) => {
            row.style.animationDelay = `${index * 50}ms`;
        });
=======
            document.querySelectorAll('.table-row') :
            document.querySelectorAll('.grid-item');

        rows.forEach((row, index) => {
            setTimeout(() => {
                row.style.animationDelay = `${index * 50}ms`;
            }, 0);
        });

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        this.initializeTooltips();
    }

    toggleView(event) {
        const viewType = event.currentTarget.dataset.view;
<<<<<<< HEAD
        document.querySelectorAll('[data-view]').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        const tableView = document.getElementById('tableView');
        const gridView = document.getElementById('gridView');
        this.currentView = viewType;
        tableView.style.display = viewType === 'table' ? 'block' : 'none';
        gridView.style.display = viewType === 'grid' ? 'block' : 'none';
=======
        const buttons = document.querySelectorAll('[data-view]');

        // Update active button
        buttons.forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');

        // Switch views
        const tableView = document.getElementById('tableView');
        const gridView = document.getElementById('gridView');

        if (viewType === 'table') {
            this.currentView = 'table';
            tableView.style.display = 'block';
            gridView.style.display = 'none';
        } else {
            this.currentView = 'grid';
            tableView.style.display = 'none';
            gridView.style.display = 'block';
        }

        // Re-render current view
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        this.renderCurrentView();
        this.showNotification(`Đã chuyển sang chế độ xem ${viewType === 'table' ? 'bảng' : 'lưới'}`, 'info');
    }

    updatePagination() {
        const container = document.getElementById('paginationContainer');
        if (!container) return;

        let html = '';
<<<<<<< HEAD
        html += `<li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="transactionsManager.goToPage(${this.currentPage - 1})"><i class="fas fa-chevron-left"></i></a></li>`;

=======

        // Previous button
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="transactionsManager.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

<<<<<<< HEAD
        if (endPage - startPage < maxVisiblePages - 1) startPage = Math.max(1, endPage - maxVisiblePages + 1);
        if (startPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="transactionsManager.goToPage(1)">1</a></li>`;
            if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<li class="page-item ${i === this.currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="transactionsManager.goToPage(${i})">${i}</a></li>`;
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            html += `<li class="page-item"><a class="page-link" href="#" onclick="transactionsManager.goToPage(${this.totalPages})">${this.totalPages}</a></li>`;
        }

        html += `<li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="transactionsManager.goToPage(${this.currentPage + 1})"><i class="fas fa-chevron-right"></i></a></li>`;
=======
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="transactionsManager.goToPage(1)">1</a></li>`;
            if (startPage > 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="transactionsManager.goToPage(${i})">${i}</a>
                </li>
            `;
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            html += `<li class="page-item"><a class="page-link" href="#" onclick="transactionsManager.goToPage(${this.totalPages})">${this.totalPages}</a></li>`;
        }

        // Next button
        html += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="transactionsManager.goToPage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        container.innerHTML = html;
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
<<<<<<< HEAD
        this.currentPage = page;
        this.filterAndPaginate();
        document.querySelector('.table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    updatePaginationInfo() {
        // Tính toán dựa trên group-row
        const groupOnlyCount = this.tableData.filter(item => item.isGroup).length;
        const currentGroupsOnPage = this.currentPageData.filter(item => item.isGroup).length;

        const startEntry = (this.currentPage - 1) * this.pageSize + 1;
        const endEntry = Math.min(startEntry + currentGroupsOnPage - 1, this.totalItems);

        document.getElementById('showingStart').textContent = startEntry;
        document.getElementById('showingEnd').textContent = endEntry;
        document.getElementById('totalEntries').textContent = this.totalItems;
=======

        this.currentPage = page;
        this.filterAndPaginate();

        // Smooth scroll to table
        document.querySelector('.table-section')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    updatePaginationInfo() {
        const startEntry = (this.currentPage - 1) * this.pageSize + 1;
        const endEntry = Math.min(this.currentPage * this.pageSize, this.totalItems);

        const startElement = document.getElementById('showingStart');
        const endElement = document.getElementById('showingEnd');
        const totalElement = document.getElementById('totalEntries');

        if (startElement) startElement.textContent = startEntry;
        if (endElement) endElement.textContent = endEntry;
        if (totalElement) totalElement.textContent = this.totalItems;
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
    }

    handlePageSizeChange(event) {
        this.pageSize = parseInt(event.target.value);
        this.currentPage = 1;
        this.filterAndPaginate();
    }

    setupBulkActions() {
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-checkbox') || e.target.id === 'selectAll') {
                this.updateBulkActions();
            }
        });
    }

    handleSelectAll(event) {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = event.target.checked;
<<<<<<< HEAD
            if (event.target.checked) this.selectedItems.add(checkbox.value);
            else this.selectedItems.delete(checkbox.value);
=======
            if (event.target.checked) {
                this.selectedItems.add(checkbox.value);
            } else {
                this.selectedItems.delete(checkbox.value);
            }
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        });
        this.updateBulkActions();
    }

    handleRowSelection(checkbox) {
<<<<<<< HEAD
        if (checkbox.checked) this.selectedItems.add(checkbox.value);
        else {
=======
        if (checkbox.checked) {
            this.selectedItems.add(checkbox.value);
        } else {
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
            this.selectedItems.delete(checkbox.value);
            document.getElementById('selectAll').checked = false;
        }
        this.updateBulkActions();
    }

    updateBulkActions() {
        const bulkActions = document.getElementById('bulkActions');
        const selectedCount = document.getElementById('selectedCount');
<<<<<<< HEAD
=======

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        if (this.selectedItems.size > 0) {
            bulkActions.style.display = 'block';
            selectedCount.textContent = this.selectedItems.size;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    handleBulkConfirm() {
<<<<<<< HEAD
        if (this.selectedItems.size === 0) {
            this.showNotification('Vui lòng chọn ít nhất một giao dịch để xác nhận', 'warning');
            return;
        }

        console.log('Selected items:', Array.from(this.selectedItems));

        // Lấy dữ liệu các item đã chọn (chỉ group-row)
        const selectedGroupIds = Array.from(this.selectedItems);
        console.log('Selected group IDs:', selectedGroupIds);

        const selectedGroups = this.tableData.filter(item =>
            selectedGroupIds.includes(item.id) && item.isGroup
        );
        console.log('Found selected groups:', selectedGroups);

        // Lọc những group chưa được xác nhận
        const unconfirmedGroups = selectedGroups.filter(group => !group.isConfirmed);
        console.log('Unconfirmed groups:', unconfirmedGroups);

        const alreadyConfirmedCount = selectedGroups.length - unconfirmedGroups.length;

        if (unconfirmedGroups.length === 0) {
            this.showNotification('Tất cả giao dịch đã chọn đều đã được xác nhận rồi', 'info');
            return;
        }

        let confirmMessage = `Bạn có chắc muốn xác nhận ${unconfirmedGroups.length} giao dịch chưa xác nhận?`;
        if (alreadyConfirmedCount > 0) {
            confirmMessage += `\n(${alreadyConfirmedCount} giao dịch đã được xác nhận từ trước)`;
        }
        confirmMessage += '\n\nHệ thống sẽ gửi email thông báo đến khách hàng.';

        this.showConfirmDialog(
            'Xác nhận giao dịch hàng loạt',
            confirmMessage,
            () => {
                console.log('Sending GroupIds to backend:', selectedGroupIds);
                this.performBulkConfirm(selectedGroupIds);
=======
        if (this.selectedItems.size === 0) return;

        this.showConfirmDialog(
            'Xác nhận giao dịch',
            `Bạn có chắc muốn xác nhận ${this.selectedItems.size} giao dịch đã chọn?`,
            () => {
                this.performBulkConfirm();
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
            }
        );
    }

<<<<<<< HEAD
    async performBulkConfirm(groupIds) {
        try {
            this.showLoading('Đang xử lý xác nhận giao dịch...');

            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';
=======
    async performBulkConfirm() {
        try {
            this.showLoading('Đang xử lý...');

            const selectedIds = Array.from(this.selectedItems).map(id => parseInt(id));

            // Get anti-forgery token
            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value ||
                document.querySelector('meta[name="RequestVerificationToken"]')?.content;
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd

            const response = await fetch('/Transactions/BulkConfirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
<<<<<<< HEAD
                    'RequestVerificationToken': token
                },
                body: JSON.stringify(groupIds)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // Cập nhật trạng thái local
                this.updateLocalItemsStatus(result.confirmedGroupIds);

                // Xóa selection và cập nhật UI
                this.selectedItems.clear();
                document.getElementById('selectAll').checked = false;
                this.updateBulkActions();

                // Render lại bảng
                this.filterAndPaginate();

                this.hideLoading();

                let message = result.message;
                if (result.emailsSent > 0) {
                    message += ` và đã gửi ${result.emailsSent} email thông báo`;
                }
                if (result.emailErrors > 0) {
                    message += ` (${result.emailErrors} email gửi thất bại)`;
                }

                this.showNotification(message, 'success');
            } else {
                this.hideLoading();
                this.showNotification(result.message || 'Có lỗi xảy ra khi xác nhận giao dịch', 'error');
                console.log('Debug info:', result.debug); // Log thông tin debug từ backend
            }
        } catch (error) {
            console.error('Lỗi khi xác nhận giao dịch:', error);
            this.hideLoading();
            this.showNotification('Có lỗi xảy ra khi kết nối với máy chủ', 'error');
        }
    }

    handleBulkSendEmail() {
        if (this.selectedItems.size === 0) {
            this.showNotification('Vui lòng chọn ít nhất một giao dịch để gửi email', 'warning');
            return;
        }

        console.log('Selected items for email:', Array.from(this.selectedItems));

        // Lấy dữ liệu các item đã chọn (chỉ group-row)
        const selectedGroupIds = Array.from(this.selectedItems);
        console.log('Selected group IDs for email:', selectedGroupIds);

        const selectedGroups = this.tableData.filter(item =>
            selectedGroupIds.includes(item.id) && item.isGroup
        );
        console.log('Found selected groups for email:', selectedGroups);

        // Lọc những group đã được xác nhận
        const confirmedGroups = selectedGroups.filter(group => group.isConfirmed);
        console.log('Confirmed groups for email:', confirmedGroups);

        const unconfirmedCount = selectedGroups.length - confirmedGroups.length;

        if (confirmedGroups.length === 0) {
            this.showNotification('Tất cả giao dịch đã chọn đều chưa được xác nhận', 'info');
            return;
        }

        let confirmMessage = `Bạn có chắc muốn gửi email xác nhận cho ${confirmedGroups.length} nhóm khách hàng?`;
        if (unconfirmedCount > 0) {
            confirmMessage += `\n(${unconfirmedCount} giao dịch chưa được xác nhận sẽ bị bỏ qua)`;
        }

        this.showConfirmDialog(
            'Gửi email xác nhận hàng loạt',
            confirmMessage,
            () => {
                console.log('Sending GroupIds to backend for email:', selectedGroupIds);
                this.performBulkSendEmail(selectedGroupIds);
            }
        );
    }

    async performBulkSendEmail(groupIds) {
        try {
            this.showLoading('Đang xử lý gửi email...');

            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';

            const response = await fetch('/Transactions/BulkSendEmail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': token
                },
                body: JSON.stringify(groupIds)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.hideLoading();
                let message = result.message;
                if (result.emailsSent > 0) {
                    message += ` và đã gửi ${result.emailsSent} email`;
                }
                if (result.emailErrors > 0) {
                    message += ` (${result.emailErrors} email gửi thất bại)`;
                    if (result.failedEmails) {
                        console.log('Chi tiết lỗi email:', result.failedEmails);
                        message += `. Chi tiết lỗi: ${result.failedEmails.join('; ')}`;
                    }
                }

                this.showNotification(message, 'success');
            } else {
                this.hideLoading();
                this.showNotification(result.message || 'Có lỗi xảy ra khi gửi email', 'error');
                console.log('Debug info:', result.debug); // Log thông tin debug từ backend
            }
        } catch (error) {
            console.error('Lỗi khi gửi email:', error);
            this.hideLoading();
            this.showNotification('Có lỗi xảy ra khi kết nối với máy chủ', 'error');
        }
    }

    async performBulkSendEmail(confirmedIds) {
        try {
            this.showLoading('Đang gửi email thông báo...');

            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';

            const response = await fetch('/Transactions/BulkSendEmail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': token
                },
                body: JSON.stringify(confirmedIds)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // Xóa selection
                this.selectedItems.clear();
                document.getElementById('selectAll').checked = false;
                this.updateBulkActions();

                this.hideLoading();

                let message = `Đã gửi thành công ${result.emailsSent} email`;
                if (result.emailErrors > 0) {
                    message += ` (${result.emailErrors} email gửi thất bại)`;
                }

                this.showNotification(message, result.emailErrors > 0 ? 'warning' : 'success');
            } else {
                this.hideLoading();
                this.showNotification(result.message || 'Có lỗi xảy ra khi gửi email', 'error');
            }
        } catch (error) {
            console.error('Lỗi khi gửi email:', error);
            this.hideLoading();
            this.showNotification('Có lỗi xảy ra khi kết nối với máy chủ', 'error');
        }
    }



    updateLocalItemsStatus(confirmedGroupIds) {
        console.log('Updating local status for confirmed GroupIds:', confirmedGroupIds);

        // Cập nhật trạng thái cho group rows
        this.tableData.forEach(item => {
            if (confirmedGroupIds.includes(item.id) && item.isGroup) {
                item.isConfirmed = true;
                console.log(`Updated group ${item.id} to confirmed`);
            }
        });

        this.originalTableData.forEach(item => {
            if (confirmedGroupIds.includes(item.id) && item.isGroup) {
                item.isConfirmed = true;
            }
        });

        // Cập nhật trạng thái cho detail rows tương ứng
        this.tableData.forEach(item => {
            if (!item.isGroup && confirmedGroupIds.includes(item.customerId)) {
                item.isConfirmed = true;
                console.log(`Updated detail item ${item.id} to confirmed (parent: ${item.customerId})`);
            }
        });

        this.originalTableData.forEach(item => {
            if (!item.isGroup && confirmedGroupIds.includes(item.customerId)) {
=======
                    'RequestVerificationToken': token || ''
                },
                body: JSON.stringify(selectedIds)
            });

            const result = await response.json();

            if (result.success) {
                // Cập nhật trạng thái các item trong bộ nhớ local
                this.updateLocalItemsStatus(result.confirmedIds);

                // Clear selection và refresh view
                this.selectedItems.clear();
                this.updateBulkActions();
                this.filterAndPaginate();

                this.hideLoading();
                this.showNotification(result.message, 'success');
            } else {
                this.hideLoading();
                this.showNotification(result.message || 'Có lỗi xảy ra', 'error');
            }
        } catch (error) {
            console.error('Error in bulk confirm:', error);
            this.hideLoading();
            this.showNotification('Có lỗi xảy ra khi xác nhận giao dịch', 'error');
        }

    }


    updateLocalItemsStatus(confirmedIds) {
        // Cập nhật trạng thái trong tableData
        this.tableData.forEach(item => {
            if (confirmedIds.includes(item.id)) {
                item.isConfirmed = true;
            }
        });

        // Cập nhật trạng thái trong originalTableData
        this.originalTableData.forEach(item => {
            if (confirmedIds.includes(item.id)) {
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
                item.isConfirmed = true;
            }
        });
    }
<<<<<<< HEAD

    handleBulkExport() {
        if (this.selectedItems.size === 0) return;
=======
    handleBulkExport() {
        if (this.selectedItems.size === 0) return;

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        this.showLoading('Đang xuất dữ liệu...');
        setTimeout(() => {
            this.exportSelectedItems();
            this.hideLoading();
            this.showNotification('Đã xuất dữ liệu thành công', 'success');
        }, 1000);
    }

    handleBulkDelete() {
<<<<<<< HEAD
        if (this.selectedItems.size === 0) {
            this.showNotification('Vui lòng chọn ít nhất một giao dịch để xóa', 'warning');
            return;
        }

        console.log('Selected items for delete:', Array.from(this.selectedItems));

        // Lấy dữ liệu các item đã chọn (chỉ group-row)
        const selectedGroupIds = Array.from(this.selectedItems);
        console.log('Selected group IDs for delete:', selectedGroupIds);

        const selectedGroups = this.tableData.filter(item =>
            selectedGroupIds.includes(item.id) && item.isGroup
        );
        console.log('Found selected groups for delete:', selectedGroups);

        const confirmMessage = `Bạn có chắc muốn xóa ${selectedGroups.length} nhóm giao dịch? Hành động này không thể hoàn tác.`;

        this.showConfirmDialog(
            'Xóa giao dịch',
            confirmMessage,
            () => {
                console.log('Sending GroupIds to backend for delete:', selectedGroupIds);
                this.performBulkDelete(selectedGroupIds);
=======
        if (this.selectedItems.size === 0) return;

        this.showConfirmDialog(
            'Xóa giao dịch',
            `Bạn có chắc muốn xóa ${this.selectedItems.size} giao dịch đã chọn? Hành động này không thể hoàn tác.`,
            () => {
                this.showLoading('Đang xóa...');
                setTimeout(() => {
                    this.selectedItems.clear();
                    this.updateBulkActions();
                    this.loadTableDataFromDOM();
                    this.hideLoading();
                    this.showNotification('Đã xóa thành công', 'success');
                }, 1500);
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
            },
            'danger'
        );
    }
<<<<<<< HEAD
    async performBulkDelete(groupIds) {
        try {
            this.showLoading('Đang xóa...');

            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';

            const response = await fetch('/Transactions/BulkDelete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': token
                },
                body: JSON.stringify(groupIds)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // Xóa các nhóm đã chọn khỏi tableData
                this.tableData = this.tableData.filter(item =>
                    !item.isGroup || !result.deletedGroupIds.includes(item.id)
                );
                this.originalTableData = this.originalTableData.filter(item =>
                    !item.isGroup || !result.deletedGroupIds.includes(item.id)
                );

                // Xóa các detail rows liên quan
                this.tableData = this.tableData.filter(item =>
                    item.isGroup || !result.deletedGroupIds.includes(item.customerId)
                );
                this.originalTableData = this.originalTableData.filter(item =>
                    item.isGroup || !result.deletedGroupIds.includes(item.customerId)
                );

                // Cập nhật UI
                this.selectedItems.clear();
                document.getElementById('selectAll').checked = false;
                this.updateBulkActions();
                this.updatePagination();
                this.filterAndPaginate();

                this.hideLoading();
                this.showNotification(result.message, 'success');
            } else {
                this.hideLoading();
                this.showNotification(result.message || 'Có lỗi xảy ra khi xóa giao dịch', 'error');
                console.log('Debug info:', result.debug);
            }
        } catch (error) {
            console.error('Lỗi khi xóa giao dịch:', error);
            this.hideLoading();
            this.showNotification('Có lỗi xảy ra khi kết nối với máy chủ', 'error');
        }
    }

    exportToExcel() {
        this.showLoading('Đang tạo file Excel...');
=======

    exportToExcel() {
        this.showLoading('Đang tạo file Excel...');

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        setTimeout(() => {
            const csvContent = this.generateCSVContent(this.currentPageData);
            this.downloadFile(csvContent, 'transactions.csv', 'text/csv');
            this.hideLoading();
            this.showNotification('Đã xuất Excel thành công', 'success');
        }, 1200);
    }

    exportToPDF() {
        this.showLoading('Đang tạo file PDF...');
<<<<<<< HEAD
=======

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        setTimeout(() => {
            const htmlContent = this.generateHTMLReport(this.currentPageData);
            this.downloadFile(htmlContent, 'transactions.html', 'text/html');
            this.hideLoading();
            this.showNotification('Đã xuất PDF thành công', 'success');
        }, 1500);
    }

    exportSelectedItems() {
<<<<<<< HEAD
        const selectedData = this.tableData.filter(item => this.selectedItems.has(item.id.toString()));
=======
        const selectedData = this.tableData.filter(item =>
            this.selectedItems.has(item.id.toString())
        );
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        const csvContent = this.generateCSVContent(selectedData);
        this.downloadFile(csvContent, 'selected_transactions.csv', 'text/csv');
    }

    generateCSVContent(data) {
        const headers = ['ID', 'Tên', 'Email', 'Điện thoại', 'Ngày đặt', 'Hết hạn', 'Trạng thái', 'Vị trí'];
        const rows = data.map(item => [
            item.id,
            item.name,
            item.email,
            item.phone,
            this.formatDate(item.reservedAt),
<<<<<<< HEAD
            item.expiresAt ? this.formatDate(item.expiresAt) : '',
            item.isConfirmed ? 'Đã xác nhận' : (item.expiresAt < new Date() ? 'Đã hết hạn' : 'Chờ xác nhận'),
            item.slotCode
        ]);
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
        return 'data:text/csv;charset=utf-8,\ufeff' + encodeURIComponent(csvContent);
    }

=======
            this.formatDate(item.expiresAt),
            item.isConfirmed ? 'Đã xác nhận' : (item.expiresAt < new Date() ? 'Đã hết hạn' : 'Chờ xác nhận'),
            item.slotCode
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return 'data:text/csv;charset=utf-8,\ufeff' + encodeURIComponent(csvContent);
    }
    
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
    generateHTMLReport(data) {
        const html = `
            <!DOCTYPE html>
            <html>
<<<<<<< HEAD
            <head><meta charset="UTF-8"><title>Báo cáo giao dịch</title>
            <style>body { font-family: Arial, sans-serif; } table { width: 100%; border-collapse: collapse; } th, td { padding: 8px; border: 1px solid #ddd; text-align: left; } th { background-color: #f2f2f2; }</style>
            </head>
            <body><h1>Báo cáo Giao dịch</h1><p>Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}</p>
            <table><thead><tr><th>ID</th><th>Tên</th><th>Email</th><th>Điện thoại</th><th>Ngày đặt</th><th>Hết hạn</th><th>Trạng thái</th><th>Vị trí</th></tr></thead>
            <tbody>${data.map(item => `<tr><td>${item.id}</td><td>${item.name}</td><td>${item.email}</td><td>${item.phone}</td><td>${this.formatDate(item.reservedAt)}</td><td>${item.expiresAt ? this.formatDate(item.expiresAt) : ''}</td><td>${item.isConfirmed ? 'Đã xác nhận' : (item.expiresAt < new Date() ? 'Đã hết hạn' : 'Chờ xác nhận')}</td><td>${item.slotCode}</td></tr>`).join('')}</tbody></table></body></html>
        `;
=======
            <head>
                <meta charset="UTF-8">
                <title>Báo cáo giao dịch</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <h1>Báo cáo Giao dịch</h1>
                <p>Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}</p>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên</th>
                            <th>Email</th>
                            <th>Điện thoại</th>
                            <th>Ngày đặt</th>
                            <th>Hết hạn</th>
                            <th>Trạng thái</th>
                            <th>Vị trí</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => `
                            <tr>
                                <td>${item.id}</td>
                                <td>${item.name}</td>
                                <td>${item.email}</td>
                                <td>${item.phone}</td>
                                <td>${this.formatDate(item.reservedAt)}</td>
                                <td>${this.formatDate(item.expiresAt)}</td>
                                <td>${item.isConfirmed ? 'Đã xác nhận' : (item.expiresAt < new Date() ? 'Đã hết hạn' : 'Chờ xác nhận')}</td>
                                <td>${item.slotCode}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    }

    downloadFile(content, filename, mimeType) {
        const link = document.createElement('a');
        link.href = content;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    confirmDelete(deleteButton) {
        const href = deleteButton.href;
<<<<<<< HEAD
        const row = deleteButton.closest('tr');
        const itemId = href.split('/').pop();

        // Lấy thông tin item từ data
        const item = this.currentPageData.find(item => item.id.toString() === itemId);
        const itemName = item ? item.name : 'mục này';

        this.showConfirmDialog(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa giao dịch của ${itemName}? Hành động này không thể hoàn tác.`,
            () => {
                this.showLoading('Đang xóa...');
                // Simulate API call
                setTimeout(() => {
                    window.location.href = href;
                }, 1000);
=======
        const row = deleteButton.closest('tr, .grid-item');
        const customerName = row.querySelector('.customer-name').textContent;

        this.showConfirmDialog(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa giao dịch của ${customerName}? Hành động này không thể hoàn tác.`,
            () => {
                window.location.href = href;
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
            },
            'danger'
        );
    }

    showConfirmDialog(title, message, onConfirm, type = 'primary') {
        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal fade';
        confirmModal.innerHTML = `
<<<<<<< HEAD
            <div class="modal-dialog"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">${title}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body"><p>${message}</p></div>
            <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button><button type="button" class="btn btn-${type}" id="confirmAction">${type === 'danger' ? 'Xóa' : 'Xác nhận'}</button></div>
            </div></div>
        `;
        document.body.appendChild(confirmModal);
        const modal = new bootstrap.Modal(confirmModal);
        modal.show();
=======
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn btn-${type}" id="confirmAction">
                            ${type === 'danger' ? 'Xóa' : 'Xác nhận'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(confirmModal);

        const modal = new bootstrap.Modal(confirmModal);
        modal.show();

>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        confirmModal.querySelector('#confirmAction').addEventListener('click', () => {
            modal.hide();
            onConfirm();
        });
<<<<<<< HEAD
        confirmModal.addEventListener('hidden.bs.modal', () => document.body.removeChild(confirmModal));
=======

        confirmModal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(confirmModal);
        });
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
    }

    showLoading(message = 'Đang tải...') {
        const overlay = document.getElementById('loadingOverlay');
<<<<<<< HEAD
        if (overlay) {
            overlay.querySelector('.loading-text').textContent = message;
            overlay.style.display = 'flex';
        }
=======
        const text = overlay.querySelector('.loading-text');
        if (text) text.textContent = message;
        overlay.style.display = 'flex';
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
<<<<<<< HEAD
        if (overlay) overlay.style.display = 'none';
    }

    showNotification(message, type = 'info', duration = 4000, showProgress = true) {
        // Tạo container nếu chưa có
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
            max-width: 400px;
            width: 100%;
        `;
            document.body.appendChild(container);
        }

        // Tạo notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade position-fixed enhanced-notification`;
        notification.style.cssText = `
        backdrop-filter: blur(15px);
        border: none !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        border-radius: 16px !important;
        border-left: 4px solid !important;
        padding: 20px !important;
        margin-bottom: 15px;
        min-width: 350px;
        max-width: 450px;
        position: relative;
        overflow: hidden;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        pointer-events: auto;
        --progress-color: ${this.getProgressColor(type)};
    `;

        // Enhanced styling theo type
        const typeStyles = {
            success: 'background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(255, 255, 255, 0.95)) !important; color: #065f46 !important; border-left-color: #10b981 !important;',
            danger: 'background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(255, 255, 255, 0.95)) !important; color: #7f1d1d !important; border-left-color: #ef4444 !important;',
            warning: 'background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(255, 255, 255, 0.95)) !important; color: #78350f !important; border-left-color: #f59e0b !important;',
            info: 'background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(255, 255, 255, 0.95)) !important; color: #1e3a8a !important; border-left-color: #3b82f6 !important;'
        };

        if (typeStyles[type]) {
            notification.style.cssText += typeStyles[type];
        }

        // Icon cho từng loại
        const icons = {
            success: '<i class="fas fa-check"></i>',
            danger: '<i class="fas fa-times"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>',
            primary: '<i class="fas fa-star"></i>',
            secondary: '<i class="fas fa-cog"></i>'
        };

        // Tạo nội dung với icon và progress bar
        notification.innerHTML = `
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 100%; background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%); pointer-events: none;"></div>
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: white; flex-shrink: 0; margin-top: 2px; background: var(--progress-color);">
                ${icons[type] || '<i class="fas fa-info-circle"></i>'}
            </div>
            <div style="flex: 1; font-weight: 500; font-size: 15px; line-height: 1.5;">
                ${message}
            </div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="
            background: none !important;
            border: none !important;
            font-size: 18px !important;
            opacity: 0.6 !important;
            padding: 0 !important;
            width: 24px !important;
            height: 24px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 50% !important;
            transition: all 0.2s ease !important;
            position: absolute !important;
            top: 15px !important;
            right: 15px !important;
        ">
            <i class="fas fa-times"></i>
        </button>
        ${showProgress ? '<div style="position: absolute; bottom: 0; left: 0; height: 3px; background: var(--progress-color); transition: width linear; border-radius: 0 0 16px 16px; width: 100%;"></div>' : ''}
    `;

        // Thêm vào container
        container.appendChild(notification);

        // Animation hiển thị
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
            notification.classList.add('show');

            // Bắt đầu progress bar nếu có
            if (showProgress) {
                const progressBar = notification.querySelector('div[style*="position: absolute; bottom: 0"]');
                if (progressBar) {
                    progressBar.style.transitionDuration = duration + 'ms';
                    setTimeout(() => {
                        progressBar.style.width = '0%';
                    }, 100);
                }
            }
        }, 50);

        // Auto close
        const timeoutId = setTimeout(() => {
            this.closeNotification(notification);
        }, duration);

        // Manual close event
        const closeBtn = notification.querySelector('.btn-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(timeoutId);
            this.closeNotification(notification);
        });

        // Giới hạn số lượng notifications
        const notifications = container.querySelectorAll('.alert');
        if (notifications.length > 5) {
            this.closeNotification(notifications[0]);
        }

        // Adjust positions for stacking
        this.adjustNotificationPositions();

        return notification;
    }


    closeNotification(notification) {
        if (!notification || !notification.parentNode) return;

        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        notification.classList.remove('show');

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
                this.adjustNotificationPositions();
            }
        }, 400);
    }
    adjustNotificationPositions() {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notifications = container.querySelectorAll('.alert.show');
        let topOffset = 20;

        notifications.forEach((notification, index) => {
            notification.style.top = topOffset + 'px';
            topOffset += notification.offsetHeight + 15;
        });
    }

    getProgressColor(type) {
        const colors = {
            success: '#10b981',
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            primary: '#8b4513',
            secondary: '#6b7280'
        };
        return colors[type] || colors.info;
    }
    handleResize() {
        const isMobile = window.innerWidth < 768;
        if (isMobile) this.pageSize = Math.min(this.pageSize, 10);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
=======
        overlay.style.display = 'none';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 150);
        }, 3000);
    }

    handleResize() {
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            this.pageSize = Math.min(this.pageSize, 10);
        }
    }

    // Utility functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        };
    }

    formatDate(date) {
<<<<<<< HEAD
        return date ? date.toLocaleDateString('vi-VN') : '';
    }

    formatTime(date) {
        return date ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
=======
        if (!date || !(date instanceof Date)) return '';
        return date.toLocaleDateString('vi-VN');
    }

    formatTime(date) {
        if (!date || !(date instanceof Date)) return '';
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
    }

    parseDate(dateString) {
        const parts = dateString.split('/');
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
}

<<<<<<< HEAD
document.addEventListener('DOMContentLoaded', () => {
    window.transactionsManager = new TransactionsManager();
});

class PerformanceMonitor {
    constructor() {
        this.metrics = { loadTime: 0, renderTime: 0, searchTime: 0, sortTime: 0 };
=======
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    window.transactionsManager = new TransactionsManager();
});

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            loadTime: 0,
            renderTime: 0,
            searchTime: 0,
            sortTime: 0
        };
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
        this.startTime = performance.now();
    }

    markLoadComplete() {
        this.metrics.loadTime = performance.now() - this.startTime;
        console.log(`Page load completed in ${this.metrics.loadTime.toFixed(2)}ms`);
    }

    startTimer(operation) {
        this.timers = this.timers || {};
        this.timers[operation] = performance.now();
    }

    endTimer(operation) {
        if (this.timers && this.timers[operation]) {
<<<<<<< HEAD
            this.metrics[operation + 'Time'] = performance.now() - this.timers[operation];
            console.log(`${operation} completed in ${this.metrics[operation + 'Time'].toFixed(2)}ms`);
=======
            const duration = performance.now() - this.timers[operation];
            this.metrics[operation + 'Time'] = duration;
            console.log(`${operation} completed in ${duration.toFixed(2)}ms`);
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
            delete this.timers[operation];
        }
    }

<<<<<<< HEAD
    getMetrics() { return { ...this.metrics }; }
}

window.performanceMonitor = new PerformanceMonitor();

=======
    getMetrics() {
        return { ...this.metrics };
    }
    async performBulkConfirm() {
        try {
            this.showLoading('Đang xử lý...');

            const selectedIds = Array.from(this.selectedItems).map(id => parseInt(id));

            // Get anti-forgery token
            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value ||
                document.querySelector('meta[name="RequestVerificationToken"]')?.content;

            const response = await fetch('/Transactions/BulkConfirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': token || ''
                },
                body: JSON.stringify(selectedIds)
            });

            const result = await response.json();

            if (result.success) {
                // Cập nhật trạng thái các item trong bộ nhớ local
                this.updateLocalItemsStatus(result.confirmedIds);

                // Clear selection và refresh view
                this.selectedItems.clear();
                this.updateBulkActions();
                this.filterAndPaginate();

                this.hideLoading();
                this.showNotification(result.message, 'success');
            } else {
                this.hideLoading();
                this.showNotification(result.message || 'Có lỗi xảy ra', 'error');
            }
        } catch (error) {
            console.error('Error in bulk confirm:', error);
            this.hideLoading();
            this.showNotification('Có lỗi xảy ra khi xác nhận giao dịch', 'error');
        }
    }

    // Thêm hàm mới này vào cuối class TransactionsManager (trước dấu đóng ngoặc cuối cùng)
    updateLocalItemsStatus(confirmedIds) {
        // Cập nhật trạng thái trong tableData
        this.tableData.forEach(item => {
            if (confirmedIds.includes(item.id)) {
                item.isConfirmed = true;
            }
        });

        // Cập nhật trạng thái trong originalTableData
        this.originalTableData.forEach(item => {
            if (confirmedIds.includes(item.id)) {
                item.isConfirmed = true;
            }
        });
    }
}

// Initialize performance monitoring
window.performanceMonitor = new PerformanceMonitor();

// Clean up on page unload
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
window.addEventListener('beforeunload', () => {
    if (window.transactionsManager) {
        // Cleanup logic here
    }
});

<<<<<<< HEAD
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered: ', registration))
            .catch(registrationError => console.log('SW registration failed: ', registrationError));
=======
// Service Worker registration for caching (if available)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
>>>>>>> 64e0d03ff136d14360ec1ebf20b3b64dce1332fd
    });
}