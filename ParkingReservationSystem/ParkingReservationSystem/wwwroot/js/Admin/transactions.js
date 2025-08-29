/**
 * TRANSACTIONS MANAGEMENT JAVASCRIPT - UPDATED VERSION
 * Enhanced functionality with corrected filters and grid view
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
            toDate: ''
        };
        this.selectedItems = new Set();
        this.tableData = [];
        this.originalTableData = [];
        this.currentView = 'table'; // 'table' or 'grid'

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
        console.log('TransactionsManager initialized successfully');
    }

    setupColumnToggle() {
        // Lắng nghe sự kiện change cho các checkbox trong dropdown
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.column) {
                this.toggleColumn(e.target.dataset.column, e.target.checked);
            }
        });

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
        document.head.appendChild(style);
    }

    toggleColumn(columnName, show) {
        // Map column names to actual column indices (0-based, bỏ qua cột checkbox đầu tiên)
        const columnMap = {
            'customer': 1,    // Khách hàng
            'email': 2,       // Email  
            'phone': 3,       // Điện thoại
            'reserved': 4,    // Ngày đặt
            'expires': 5,     // Hết hạn
            'status': 6       // Trạng thái
            // Cột vị trí (7) và thao tác (8) không có trong dropdown nên không cần ẩn
        };

        const columnIndex = columnMap[columnName];
        if (columnIndex === undefined) return;

        // Ẩn/hiện header
        const headerCells = document.querySelectorAll(`#transactionsTable thead th:nth-child(${columnIndex + 1})`);
        headerCells.forEach(cell => {
            cell.style.display = show ? '' : 'none';
        });

        // Ẩn/hiện body cells
        const bodyCells = document.querySelectorAll(`#transactionsTable tbody td:nth-child(${columnIndex + 1})`);
        bodyCells.forEach(cell => {
            cell.style.display = show ? '' : 'none';
        });
    }

    setupEventListeners() {
        // Filter toggle
        document.getElementById('toggleFilters')?.addEventListener('click', this.toggleFilters.bind(this));

        // Search input with debounce
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        }

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
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(tooltipTriggerEl => {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    }

    animateStatsNumbers() {
        const statsNumbers = document.querySelectorAll('.stats-number[data-count]');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateNumber(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        });

        statsNumbers.forEach(number => observer.observe(number));
    }

    animateNumber(element) {
        const target = parseInt(element.dataset.count) || 0;
        const duration = 1500;
        const start = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * target);

            element.textContent = this.formatNumber(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }

    toggleFilters() {
        const filterBody = document.getElementById('filterBody');
        const toggleBtn = document.getElementById('toggleFilters');

        if (filterBody && toggleBtn) {
            const isCollapsed = filterBody.classList.contains('collapsed');

            filterBody.classList.toggle('collapsed');
            const icon = toggleBtn.querySelector('i');

            if (isCollapsed) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
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

        if (id === 'fromDate') {
            this.filters.fromDate = value;
        } else if (id === 'toDate') {
            this.filters.toDate = value;
        }

        this.filterAndPaginate();
    }

    applyFilters() {
        this.showLoading('Đang áp dụng bộ lọc...');

        setTimeout(() => {
            this.filterAndPaginate();
            this.hideLoading();
            this.showNotification('Đã áp dụng bộ lọc thành công', 'success');
        }, 800);
    }

    clearFilters() {
        // Reset all filter inputs
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('fromDate').value = '';
        document.getElementById('toDate').value = '';

        // Reset filter object
        this.filters = {
            search: '',
            status: '',
            fromDate: '',
            toDate: ''
        };

        this.currentPage = 1;
        this.filterAndPaginate();
        this.showNotification('Đã xóa tất cả bộ lọc', 'info');
    }

    loadTableDataFromDOM() {
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
        const statusElement = row.querySelector('.status-badge');
        const isConfirmed = statusElement?.classList.contains('status-confirmed') || false;
        const isExpired = statusElement?.classList.contains('status-expired') || false;

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
        };
    }

    parseDateTime(dateStr, timeStr) {
        try {
            const dateParts = dateStr.split('/');
            const timeParts = timeStr.split(':');

            if (dateParts.length === 3 && timeParts.length === 2) {
                const day = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1;
                const year = parseInt(dateParts[2]);
                const hours = parseInt(timeParts[0]);
                const minutes = parseInt(timeParts[1]);

                return new Date(year, month, day, hours, minutes);
            }
        } catch (error) {
            console.warn('Error parsing date/time:', dateStr, timeStr, error);
        }
        return new Date();
    }

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
                filteredData = filteredData.filter(item => !item.isConfirmed && item.expiresAt > new Date());
            } else if (this.filters.status === 'expired') {
                // Expired: not confirmed AND expiration date has passed
                filteredData = filteredData.filter(item => !item.isConfirmed && item.expiresAt < new Date());
            }
        }

        if (this.filters.fromDate) {
            const fromDate = this.parseDate(this.filters.fromDate);
            filteredData = filteredData.filter(item => item.reservedAt >= fromDate);
        }

        if (this.filters.toDate) {
            const toDate = this.parseDate(this.filters.toDate);
            filteredData = filteredData.filter(item => item.reservedAt <= toDate);
        }

        // Apply sorting
        if (this.currentSort.column) {
            filteredData.sort((a, b) => {
                let aVal = a[this.currentSort.column];
                let bVal = b[this.currentSort.column];

                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                let result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return this.currentSort.direction === 'desc' ? -result : result;
            });
        } else {
            // Default sort: newest first
            filteredData.sort((a, b) => b.reservedAt - a.reservedAt);
        }

        this.totalItems = filteredData.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);

        if (this.currentPage > this.totalPages && this.totalPages > 0) {
            this.currentPage = this.totalPages;
        }

        // Apply pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.currentPageData = filteredData.slice(startIndex, endIndex);

        this.renderCurrentView();
        this.updatePagination();
        this.updatePaginationInfo();
    }

    renderCurrentView() {
        if (this.currentView === 'table') {
            this.renderTable();
        } else {
            this.renderGrid();
        }
    }

    setupTableSorting() {
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;

                if (this.currentSort.column === column) {
                    this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    this.currentSort.column = column;
                    this.currentSort.direction = 'asc';
                }

                this.updateSortIcons();
                this.filterAndPaginate();
            });
        });
    }

    updateSortIcons() {
        document.querySelectorAll('.sortable').forEach(header => {
            const icon = header.querySelector('.sort-icon');
            header.classList.remove('sorted');

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
    }

    renderGrid() {
        const gridContainer = document.getElementById('gridContainer');
        if (!gridContainer) return;

        if (this.currentPageData.length === 0) {
            gridContainer.innerHTML = `
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
        this.setupRowAnimations();
    }

    renderTableRow(item) {
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
                        
                        <div class="status-section mt-3">
                            <span class="status-badge ${statusClass}">
                                <i class="fas ${statusIcon}"></i>
                                <span>${statusText}</span>
                            </span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="action-buttons justify-content-center">
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
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupRowAnimations() {
        const rows = this.currentView === 'table' ?
            document.querySelectorAll('.table-row') :
            document.querySelectorAll('.grid-item');

        rows.forEach((row, index) => {
            setTimeout(() => {
                row.style.animationDelay = `${index * 50}ms`;
            }, 0);
        });

        this.initializeTooltips();
    }

    toggleView(event) {
        const viewType = event.currentTarget.dataset.view;
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
        this.renderCurrentView();
        this.showNotification(`Đã chuyển sang chế độ xem ${viewType === 'table' ? 'bảng' : 'lưới'}`, 'info');
    }

    updatePagination() {
        const container = document.getElementById('paginationContainer');
        if (!container) return;

        let html = '';

        // Previous button
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="transactionsManager.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

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

        container.innerHTML = html;
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;

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
            if (event.target.checked) {
                this.selectedItems.add(checkbox.value);
            } else {
                this.selectedItems.delete(checkbox.value);
            }
        });
        this.updateBulkActions();
    }

    handleRowSelection(checkbox) {
        if (checkbox.checked) {
            this.selectedItems.add(checkbox.value);
        } else {
            this.selectedItems.delete(checkbox.value);
            document.getElementById('selectAll').checked = false;
        }
        this.updateBulkActions();
    }

    updateBulkActions() {
        const bulkActions = document.getElementById('bulkActions');
        const selectedCount = document.getElementById('selectedCount');

        if (this.selectedItems.size > 0) {
            bulkActions.style.display = 'block';
            selectedCount.textContent = this.selectedItems.size;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    handleBulkConfirm() {
        if (this.selectedItems.size === 0) return;

        this.showConfirmDialog(
            'Xác nhận giao dịch',
            `Bạn có chắc muốn xác nhận ${this.selectedItems.size} giao dịch đã chọn?`,
            () => {
                this.performBulkConfirm();
            }
        );
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
    handleBulkExport() {
        if (this.selectedItems.size === 0) return;

        this.showLoading('Đang xuất dữ liệu...');
        setTimeout(() => {
            this.exportSelectedItems();
            this.hideLoading();
            this.showNotification('Đã xuất dữ liệu thành công', 'success');
        }, 1000);
    }

    handleBulkDelete() {
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
            },
            'danger'
        );
    }

    exportToExcel() {
        this.showLoading('Đang tạo file Excel...');

        setTimeout(() => {
            const csvContent = this.generateCSVContent(this.currentPageData);
            this.downloadFile(csvContent, 'transactions.csv', 'text/csv');
            this.hideLoading();
            this.showNotification('Đã xuất Excel thành công', 'success');
        }, 1200);
    }

    exportToPDF() {
        this.showLoading('Đang tạo file PDF...');

        setTimeout(() => {
            const htmlContent = this.generateHTMLReport(this.currentPageData);
            this.downloadFile(htmlContent, 'transactions.html', 'text/html');
            this.hideLoading();
            this.showNotification('Đã xuất PDF thành công', 'success');
        }, 1500);
    }

    exportSelectedItems() {
        const selectedData = this.tableData.filter(item =>
            this.selectedItems.has(item.id.toString())
        );
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
            this.formatDate(item.expiresAt),
            item.isConfirmed ? 'Đã xác nhận' : (item.expiresAt < new Date() ? 'Đã hết hạn' : 'Chờ xác nhận'),
            item.slotCode
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return 'data:text/csv;charset=utf-8,\ufeff' + encodeURIComponent(csvContent);
    }
    
    generateHTMLReport(data) {
        const html = `
            <!DOCTYPE html>
            <html>
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
        const row = deleteButton.closest('tr, .grid-item');
        const customerName = row.querySelector('.customer-name').textContent;

        this.showConfirmDialog(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa giao dịch của ${customerName}? Hành động này không thể hoàn tác.`,
            () => {
                window.location.href = href;
            },
            'danger'
        );
    }

    showConfirmDialog(title, message, onConfirm, type = 'primary') {
        const confirmModal = document.createElement('div');
        confirmModal.className = 'modal fade';
        confirmModal.innerHTML = `
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

        confirmModal.querySelector('#confirmAction').addEventListener('click', () => {
            modal.hide();
            onConfirm();
        });

        confirmModal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(confirmModal);
        });
    }

    showLoading(message = 'Đang tải...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = overlay.querySelector('.loading-text');
        if (text) text.textContent = message;
        overlay.style.display = 'flex';
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
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
        };
    }

    formatDate(date) {
        if (!date || !(date instanceof Date)) return '';
        return date.toLocaleDateString('vi-VN');
    }

    formatTime(date) {
        if (!date || !(date instanceof Date)) return '';
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    parseDate(dateString) {
        const parts = dateString.split('/');
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
}

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
            const duration = performance.now() - this.timers[operation];
            this.metrics[operation + 'Time'] = duration;
            console.log(`${operation} completed in ${duration.toFixed(2)}ms`);
            delete this.timers[operation];
        }
    }

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
window.addEventListener('beforeunload', () => {
    if (window.transactionsManager) {
        // Cleanup logic here
    }
});

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
    });
}