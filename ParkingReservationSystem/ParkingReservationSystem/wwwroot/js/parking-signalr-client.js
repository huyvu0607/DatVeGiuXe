(function () {
    'use strict';

    // ===== CROSS-TAB SYNC CLASS =====
    class CrossTabSync {
        constructor() {
            this.storageKey = 'parking_slot_updates';
            this.lastUpdateTime = Date.now();
            this.tabId = this.generateTabId();
            console.log('CrossTabSync initialized for tab:', this.tabId);
            this.setupStorageListener();
        }

        generateTabId() {
            return 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        setupStorageListener() {
            window.addEventListener('storage', (e) => {
                if (e.key === this.storageKey && e.newValue) {
                    try {
                        const updateData = JSON.parse(e.newValue);

                        // Không xử lý update từ chính tab này
                        if (updateData.tabId === this.tabId) return;

                        // Chỉ xử lý update mới
                        if (updateData.timestamp > this.lastUpdateTime) {
                            console.log('CrossTab received update:', updateData);
                            this.handleCrossTabUpdate(updateData);
                            this.lastUpdateTime = updateData.timestamp;
                        }
                    } catch (error) {
                        console.error('CrossTab sync error:', error);
                    }
                }
            });
        }

        notifyOtherTabs(eventType, data) {
            const updateData = {
                eventType,
                data,
                timestamp: Date.now(),
                tabId: this.tabId
            };

            try {
                console.log('CrossTab sending:', updateData);
                localStorage.setItem(this.storageKey, JSON.stringify(updateData));

                // Cleanup sau 2 giây
                setTimeout(() => {
                    try {
                        const current = localStorage.getItem(this.storageKey);
                        if (current && JSON.parse(current).timestamp === updateData.timestamp) {
                            localStorage.removeItem(this.storageKey);
                        }
                    } catch (e) {
                        localStorage.removeItem(this.storageKey);
                    }
                }, 2000);
            } catch (error) {
                console.error('Failed to notify other tabs:', error);
            }
        }

        handleCrossTabUpdate(updateData) {
            const { eventType, data } = updateData;

            // Tìm debug client để cập nhật
            const debugClient = window.parkingSignalRDebug;
            if (!debugClient || !debugClient.updateSlotStatusWithColors) {
                console.log('No debug client available for cross-tab update');
                return;
            }

            console.log(`CrossTab processing: ${eventType}`, data);

            switch (eventType) {
                case 'SlotCancelled':
                case 'SlotReleased':
                    if (data.slotCode) {
                        debugClient.updateSlotStatusWithColors(data.slotCode, 'available', true);
                        debugClient.showNotification(`Chỗ ${data.slotCode} đã được giải phóng`, 'info');
                    }
                    break;

                case 'SlotReserved':
                case 'SlotTaken':
                    if (data.slotCode) {
                        debugClient.updateSlotStatusWithColors(data.slotCode, 'reserved');
                        debugClient.showNotification(`Chỗ ${data.slotCode} đã được đặt`, 'warning');
                    }
                    break;

                case 'SlotConfirmed':
                    if (data.slotCode) {
                        debugClient.updateSlotStatusWithColors(data.slotCode, 'occupied');
                    }
                    break;

                case 'MultipleSlotsCancel':
                case 'MultipleSlotsReleased':
                    if (data.slotCodes && Array.isArray(data.slotCodes)) {
                        data.slotCodes.forEach(slotCode => {
                            debugClient.updateSlotStatusWithColors(slotCode, 'available', true);
                        });
                        debugClient.showNotification(`${data.slotCodes.length} chỗ đã được giải phóng`, 'info');
                    }
                    break;
            }

            // Đảm bảo event listeners được gắn lại
            setTimeout(() => {
                if (debugClient.ensureAllSlotsHaveEventListeners) {
                    debugClient.ensureAllSlotsHaveEventListeners();
                }
            }, 100);
        }
    }

    // ===== PARKING SIGNALR DEBUG CLIENT (UPDATED) =====
    class ParkingSignalRDebugClient {
        constructor(options = {}) {
            this.connection = null;
            this.isConnected = false;
            this.reconnectAttempts = 0;
            this.maxReconnectAttempts = 5;
            this.reconnectInterval = 3000;

            // Configuration
            this.config = {
                hubUrl: options.hubUrl || '/parkingHub',
                enableDebug: options.enableDebug !== false,
                autoReconnect: options.autoReconnect !== false,
                enableCrossTab: options.enableCrossTab !== false,
                ...options
            };

            // Khởi tạo cross-tab sync
            if (this.config.enableCrossTab) {
                this.crossTabSync = new CrossTabSync();
            }

            this.debugLog('Initializing SignalR client with config:', this.config);
            this.init();
        }

        debugLog(message, data = null) {
            if (this.config.enableDebug) {
                console.log(`[SignalR Debug] ${message}`, data || '');
            }
        }

        async init() {
            try {
                const possibleUrls = [
                    '/parkingHub',
                    '/parkinghub',
                    '/hubs/parking',
                    '/hub/parking'
                ];

                for (const url of possibleUrls) {
                    this.debugLog(`Trying to connect to: ${url}`);
                    try {
                        await this.createConnection(url);
                        await this.connect();
                        this.debugLog(`Successfully connected to: ${url}`);
                        break;
                    } catch (error) {
                        this.debugLog(`Failed to connect to ${url}:`, error.message);
                        continue;
                    }
                }

                if (!this.isConnected) {
                    throw new Error('Không thể kết nối đến bất kỳ SignalR hub nào');
                }
            } catch (error) {
                console.error('SignalR initialization failed:', error);
                this.showNotification('Không thể kết nối đến server thời gian thực: ' + error.message, 'danger');
                this.showDebugInfo();
            }
        }

        async createConnection(hubUrl) {
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl, {
                    transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
                })
                .withAutomaticReconnect([0, 2000, 10000, 30000])
                .configureLogging(this.config.enableDebug ? signalR.LogLevel.Debug : signalR.LogLevel.Information)
                .build();

            this.registerEventHandlers();
        }

        async connect() {
            try {
                this.debugLog('Attempting to start connection...');
                await this.connection.start();

                this.isConnected = true;
                this.reconnectAttempts = 0;

                this.debugLog('SignalR connected successfully, state:', this.connection.state);

                await this.connection.invoke("JoinParkingGroup");
                this.debugLog('Successfully joined ParkingGroup');

                this.showNotification('Đã kết nối thành công đến server real-time', 'success');
                this.updateConnectionStatus(true);

            } catch (error) {
                this.debugLog('Connection failed:', error);
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.handleConnectionError();
                throw error;
            }
        }

        registerEventHandlers() {
            this.connection.onreconnecting((error) => {
                this.debugLog('SignalR reconnecting...', error);
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.showNotification('Đang kết nối lại...', 'warning');
            });

            this.connection.onreconnected((connectionId) => {
                this.debugLog('SignalR reconnected with ID:', connectionId);
                this.isConnected = true;
                this.updateConnectionStatus(true);
                this.showNotification('Đã kết nối lại thành công', 'success');
                this.connection.invoke("JoinParkingGroup").catch(err => {
                    this.debugLog('Failed to rejoin ParkingGroup after reconnect:', err);
                });
            });

            this.connection.onclose((error) => {
                this.debugLog('SignalR connection closed:', error);
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.showNotification('Mất kết nối với server', 'danger');
                if (this.config.autoReconnect) {
                    this.handleConnectionError();
                }
            });

            const eventHandlers = {
                'SlotReserved': this.handleSlotReserved.bind(this),
                'SlotConfirmed': this.handleSlotConfirmed.bind(this),
                'SlotCancelled': this.handleSlotCancelled.bind(this),
                'SlotReleased': this.handleSlotReleased.bind(this),
                'MultipleSlotsReserved': this.handleMultipleSlotsReserved.bind(this),
                'MultipleSlotsConfirmed': this.handleMultipleSlotsConfirmed.bind(this),
                'MultipleSlotsCancel': this.handleMultipleSlotsCancel.bind(this),
                'MultipleSlotsReleased': this.handleMultipleSlotsReleased.bind(this),
                'SlotTaken': this.handleSlotTaken.bind(this),
                'AdminOnline': this.handleAdminOnline.bind(this),
                'AdminOffline': this.handleAdminOffline.bind(this),
                'SystemNotification': this.handleSystemNotification.bind(this)
            };

            Object.keys(eventHandlers).forEach(eventName => {
                this.connection.on(eventName, (...args) => {
                    this.debugLog(`Received event: ${eventName}`, args);
                    eventHandlers[eventName](...args);
                });
            });
        }

        handleConnectionError() {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                this.debugLog(`Reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
                setTimeout(async () => {
                    try {
                        await this.connect();
                    } catch (error) {
                        this.debugLog(`Reconnect attempt ${this.reconnectAttempts} failed:`, error);
                    }
                }, delay);
                this.showNotification(`Thử kết nối lại lần ${this.reconnectAttempts}...`, 'warning');
            } else {
                this.showNotification('Không thể kết nối đến server. Vui lòng tải lại trang.', 'danger');
            }
        }

        // ===== EVENT HANDLERS WITH CROSS-TAB SYNC =====
        handleSlotReserved(slotCode, customerName) {
            this.debugLog(`SlotReserved: ${slotCode} by ${customerName}`);

            const slotElement = this.findSlotElement(slotCode);
            if (!slotElement) return;

            const checkbox = slotElement.querySelector('input[type="checkbox"]');
            const wasSelected = checkbox && checkbox.checked;

            this.updateSlotStatusWithColors(slotCode, 'reserved');
            this.removeSlotFromUserSelection(slotCode);

            // Cross-tab notification
            if (this.crossTabSync) {
                this.crossTabSync.notifyOtherTabs('SlotReserved', { slotCode, customerName });
            }

            if (wasSelected && typeof window.showSlotTakenOverlay === 'function') {
                window.showSlotTakenOverlay(slotCode, customerName);
            } else {
                this.showNotification(`Chỗ ${slotCode} đã được ${customerName} đặt`, 'info');
            }
        }

        handleSlotConfirmed(slotCode, customerName) {
            this.debugLog(`SlotConfirmed: ${slotCode} by ${customerName}`);

            const slotElement = this.findSlotElement(slotCode);
            if (!slotElement) return;

            this.updateSlotStatusWithColors(slotCode, 'occupied');
            this.removeSlotFromUserSelection(slotCode);

            // Cross-tab notification
            if (this.crossTabSync) {
                this.crossTabSync.notifyOtherTabs('SlotConfirmed', { slotCode, customerName });
            }
        }

        handleSlotCancelled(slotCode, customerName) {
            this.debugLog(`SlotCancelled: ${slotCode} by ${customerName}`);

            const slotElement = this.findSlotElement(slotCode);
            if (!slotElement) return;

            this.updateSlotStatusWithColors(slotCode, 'available', true);

            // Cross-tab notification
            if (this.crossTabSync) {
                this.crossTabSync.notifyOtherTabs('SlotCancelled', { slotCode, customerName });
            }

            setTimeout(() => {
                this.ensureAllSlotsHaveEventListeners();
            }, 100);

            this.showNotification(`Chỗ ${slotCode} đã được ${customerName} hủy`, 'info');
        }

        handleSlotReleased(slotCode) {
            this.debugLog(`SlotReleased: ${slotCode}`);

            const slotElement = this.findSlotElement(slotCode);
            if (!slotElement) return;

            this.updateSlotStatusWithColors(slotCode, 'available', true);

            // Cross-tab notification
            if (this.crossTabSync) {
                this.crossTabSync.notifyOtherTabs('SlotReleased', { slotCode });
            }

            setTimeout(() => {
                this.ensureAllSlotsHaveEventListeners();
            }, 100);

            this.showNotification(`Chỗ ${slotCode} đã được giải phóng`, 'info');
        }

        handleSlotTaken(slotCode, message) {
            this.debugLog(`SlotTaken: ${slotCode} - ${message}`);

            const slotElement = this.findSlotElement(slotCode);
            if (!slotElement) return;

            const checkbox = slotElement.querySelector('input[type="checkbox"]');
            const wasSelected = checkbox && checkbox.checked;

            this.updateSlotStatusWithColors(slotCode, 'reserved');
            this.removeSlotFromUserSelection(slotCode);

            // Cross-tab notification
            if (this.crossTabSync) {
                this.crossTabSync.notifyOtherTabs('SlotTaken', { slotCode, message });
            }

            if (wasSelected && typeof window.showSlotTakenOverlay === 'function') {
                window.showSlotTakenOverlay(slotCode, "người khác");
            } else {
                this.showNotification(`${message} (Chỗ ${slotCode})`, 'error');
            }
        }

        handleMultipleSlotsReserved(slotCodes, customerName) {
            this.debugLog(`MultipleSlotsReserved: ${slotCodes.join(', ')} by ${customerName}`);

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

                this.updateSlotStatusWithColors(slotCode, 'reserved');
                this.removeSlotFromUserSelection(slotCode);
            });

            // Cross-tab notification
            if (this.crossTabSync) {
                this.crossTabSync.notifyOtherTabs('MultipleSlotsReserved', { slotCodes, customerName });
            }

            if (showOverlay && typeof window.showSlotTakenOverlay === 'function') {
                const slotText = selectedSlots.length > 1 ? `các chỗ ${selectedSlots.join(', ')}` : `chỗ ${selectedSlots[0]}`;
                window.showSlotTakenOverlay(selectedSlots[0], customerName, `${slotText} bạn đang chọn vừa được ${customerName} đặt trước`);
            }
        }

        handleMultipleSlotsConfirmed(slotCodes) {
            this.debugLog(`MultipleSlotsConfirmed: ${slotCodes.join(', ')}`);

            slotCodes.forEach(slotCode => {
                const slotElement = this.findSlotElement(slotCode);
                if (!slotElement) return;

                this.updateSlotStatusWithColors(slotCode, 'occupied');
                this.removeSlotFromUserSelection(slotCode);
            });

            // Cross-tab notification
            if (this.crossTabSync) {
                this.crossTabSync.notifyOtherTabs('MultipleSlotsConfirmed', { slotCodes });
            }
        }

        handleMultipleSlotsCancel(slotCodes, customerName) {
            this.debugLog(`MultipleSlotsCancel: ${slotCodes.join(', ')} by ${customerName}`);

            slotCodes.forEach(slotCode => {
                const slotElement = this.findSlotElement(slotCode);
                if (!slotElement) return;

                this.updateSlotStatusWithColors(slotCode, 'available', true);
            });

            // Cross-tab notification
            if (this.crossTabSync) {
                this.crossTabSync.notifyOtherTabs('MultipleSlotsCancel', { slotCodes, customerName });
            }

            setTimeout(() => {
                this.ensureAllSlotsHaveEventListeners();
            }, 100);
        }

        handleMultipleSlotsReleased(slotCodes) {
            this.debugLog(`MultipleSlotsReleased: ${slotCodes.join(', ')}`);

            slotCodes.forEach(slotCode => {
                const slotElement = this.findSlotElement(slotCode);
                if (!slotElement) return;

                this.updateSlotStatusWithColors(slotCode, 'available', true);
            });

            // Cross-tab notification
            if (this.crossTabSync) {
                this.crossTabSync.notifyOtherTabs('MultipleSlotsReleased', { slotCodes });
            }

            setTimeout(() => {
                this.ensureAllSlotsHaveEventListeners();
            }, 100);

            this.showNotification(`${slotCodes.length} chỗ đã được giải phóng`, 'info');
        }

        handleAdminOnline(adminName) {
            this.showNotification(`Admin ${adminName} đã online`, 'success');
            this.updateAdminStatus(true, adminName);
        }

        handleAdminOffline(adminName) {
            this.showNotification(`Admin ${adminName} đã offline`, 'info');
            this.updateAdminStatus(false, adminName);
        }

        handleSystemNotification(message, type) {
            this.showNotification(message, type || 'info');
        }

        // ===== SLOT MANAGEMENT METHODS =====
        updateSlotStatusWithColors(slotCode, status, enableCheckbox = false) {
            const slotElement = this.findSlotElement(slotCode);
            if (!slotElement) {
                this.debugLog(`Cannot find slot element for code: ${slotCode}`);
                return;
            }

            const checkbox = slotElement.querySelector('input[type="checkbox"]');

            // Xóa tất cả class status cũ
            slotElement.classList.remove('available', 'selected', 'reserved', 'occupied');

            // Thêm class status mới
            slotElement.classList.add(status);

            this.debugLog(`Updating slot ${slotCode} to status: ${status}`);

            if (status === 'occupied') {
                slotElement.innerHTML = `
                    <div class="slot-occupied">
                        <div class="slot-code">${slotCode}</div>
                        <div class="slot-status-icon">
                            <i class="fas fa-ban"></i>
                        </div>
                    </div>
                `;
                this.applyOccupiedStyle(slotElement);

            } else if (status === 'available' && enableCheckbox) {
                const floor = slotElement.getAttribute('data-floor') || 'Unknown';

                slotElement.innerHTML = `
                    <input type="checkbox" name="selectedSlots" value="${slotCode}" class="slot-checkbox" id="slot_${slotCode}" />
                    <label for="slot_${slotCode}" class="slot-label">
                        <div class="slot-code">${slotCode}</div>
                        <div class="slot-status-icon">
                            <i class="fas fa-car"></i>
                        </div>
                    </label>
                `;

                this.applyAvailableStyle(slotElement);
                this.attachSlotEventListeners(slotElement);
                this.handleFloorVisibility(slotElement, floor);

            } else if (status === 'reserved') {
                if (checkbox) {
                    checkbox.disabled = true;
                    checkbox.checked = false;
                }
                this.applyReservedStyle(slotElement);

            } else if (status === 'available') {
                if (checkbox) {
                    checkbox.disabled = false;
                }
                this.applyAvailableStyle(slotElement);
            }

            this.addUpdateAnimation(slotElement);
            this.updateStatsDisplay();
        }

        applyOccupiedStyle(slotElement) {
            slotElement.style.background = 'linear-gradient(135deg, #dc3545, #b02a37)';
            slotElement.style.color = '#ffffff';
            slotElement.style.cursor = 'not-allowed';
            slotElement.style.opacity = '0.9';
            slotElement.style.border = '2px solid #721c24';
            slotElement.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)';
        }

        applyReservedStyle(slotElement) {
            slotElement.style.background = 'linear-gradient(135deg, #ffc107, #e0a800)';
            slotElement.style.color = '#212529';
            slotElement.style.cursor = 'not-allowed';
            slotElement.style.opacity = '0.8';
            slotElement.style.border = '2px solid #d39e00';
            slotElement.style.boxShadow = '0 2px 8px rgba(255, 193, 7, 0.3)';
        }

        applyAvailableStyle(slotElement) {
            slotElement.style.background = 'linear-gradient(135deg, #28a745, #1e7e34)';
            slotElement.style.color = '#ffffff';
            slotElement.style.cursor = 'pointer';
            slotElement.style.opacity = '1';
            slotElement.style.border = '2px solid #1c7430';
            slotElement.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.2)';

            slotElement.addEventListener('mouseenter', () => {
                slotElement.style.transform = 'scale(1.02)';
                slotElement.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
            });

            slotElement.addEventListener('mouseleave', () => {
                slotElement.style.transform = 'scale(1)';
                slotElement.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.2)';
            });
        }

        addUpdateAnimation(slotElement) {
            slotElement.classList.add('slot-updating');
            setTimeout(() => {
                slotElement.classList.remove('slot-updating');
            }, 1000);
        }

        handleFloorVisibility(slotElement, floor) {
            if (window.parkingSelection && window.parkingSelection.currentFloor) {
                if (floor === window.parkingSelection.currentFloor) {
                    slotElement.style.display = 'flex';
                    slotElement.classList.add('fade-in');
                } else {
                    slotElement.style.display = 'none';
                    slotElement.classList.remove('fade-in');
                }
            }
        }

        removeSlotFromUserSelection(slotCode) {
            if (window.parkingSelection && typeof window.parkingSelection.removeSlotFromSelection === 'function') {
                window.parkingSelection.removeSlotFromSelection(slotCode);
                this.debugLog(`Removed slot ${slotCode} from user selection due to conflict`);
            }
        }

        findSlotElement(slotCode) {
            const selectors = [
                `[data-slot-code="${slotCode}"]`,
                `[data-slot="${slotCode}"]`,
                `#slot-${slotCode}`,
                `.slot-${slotCode}`,
                `.parking-slot[data-slot="${slotCode}"]`
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    this.debugLog(`Found slot element using selector: ${selector}`);
                    return element;
                }
            }

            this.debugLog(`Slot element not found for code: ${slotCode}`, 'Available selectors tried: ' + selectors.join(', '));
            return null;
        }

        ensureAllSlotsHaveEventListeners() {
            document.querySelectorAll('.parking-slot.available input[type="checkbox"]').forEach(checkbox => {
                const slotElement = checkbox.closest('.parking-slot');
                const slotCode = slotElement.getAttribute('data-slot');
                const hasListener = checkbox.onchange || checkbox.onclick;

                if (!hasListener && window.parkingSelection) {
                    checkbox.addEventListener('change', (e) => {
                        if (window.parkingSelection.handleSlotSelection) {
                            window.parkingSelection.handleSlotSelection(e.target);
                        }
                    });
                    this.debugLog(`Added missing event listener for slot: ${slotCode}`);
                }
            });
        }

        attachSlotEventListeners(slotElement) {
            const checkbox = slotElement.querySelector('input[type="checkbox"]');
            if (checkbox && window.parkingSelection) {
                checkbox.replaceWith(checkbox.cloneNode(true));
                const newCheckbox = slotElement.querySelector('input[type="checkbox"]');
                newCheckbox.addEventListener('change', (e) => {
                    window.parkingSelection.handleSlotSelection(e.target);
                });
                this.debugLog(`Reattached event listeners for slot: ${slotElement.getAttribute('data-slot')}`);
            }
        }

        updateStatsDisplay() {
            const allSlots = document.querySelectorAll('.parking-slot');
            const availableSlots = document.querySelectorAll('.parking-slot.available').length;
            const occupiedSlots = document.querySelectorAll('.parking-slot.occupied').length;

            const statCards = document.querySelectorAll('.stat-card .stat-number');
            if (statCards.length >= 2) {
                statCards[0].textContent = availableSlots;
                statCards[1].textContent = occupiedSlots;
            }

            document.querySelectorAll('.floor-btn').forEach(btn => {
                const floor = btn.getAttribute('data-floor');
                if (floor) {
                    const floorSlots = document.querySelectorAll(`[data-floor="${floor}"]`);
                    const floorAvailable = document.querySelectorAll(`[data-floor="${floor}"].available`).length;
                    const floorTotal = floorSlots.length;
                    const countElement = btn.querySelector('.floor-count');
                    if (countElement) {
                        countElement.textContent = `${floorAvailable}/${floorTotal}`;
                    }
                }
            });
        }

        updateConnectionStatus(isConnected) {
            let indicator = document.querySelector('#signalr-status');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'signalr-status';
                indicator.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    padding: 5px 10px;
                    border-radius: 15px;
                    font-size: 12px;
                    font-weight: bold;
                    z-index: 10000;
                    transition: all 0.3s ease;
                `;
                document.body.appendChild(indicator);
            }

            if (isConnected) {
                indicator.style.backgroundColor = '#28a745';
                indicator.style.color = 'white';
                indicator.innerHTML = '<i class="fas fa-wifi"></i> Connected';
            } else {
                indicator.style.backgroundColor = '#dc3545';
                indicator.style.color = 'white';
                indicator.innerHTML = '<i class="fas fa-wifi"></i> Disconnected';
            }
        }

        updateAdminStatus(isOnline, adminName) {
            let adminIndicator = document.querySelector('#admin-status');
            if (!adminIndicator) {
                adminIndicator = document.createElement('div');
                adminIndicator.id = 'admin-status';
                adminIndicator.style.cssText = `
                    position: fixed;
                    top: 50px;
                    right: 10px;
                    padding: 5px 10px;
                    border-radius: 15px;
                    font-size: 12px;
                    z-index: 10000;
                `;
                document.body.appendChild(adminIndicator);
            }

            adminIndicator.style.backgroundColor = isOnline ? '#28a745' : '#6c757d';
            adminIndicator.style.color = 'white';
            adminIndicator.innerHTML = `<i class="fas fa-user-shield"></i> Admin ${isOnline ? 'Online' : 'Offline'}`;
        }

        showNotification(message, type = 'info', duration = 5000) {
            document.querySelectorAll(`.notification-${type}`).forEach(n => n.remove());

            const toast = document.createElement('div');
            toast.className = `alert alert-${type} notification-${type} position-fixed`;
            toast.style.cssText = `
                top: ${document.querySelectorAll('.alert.position-fixed').length * 80 + 20}px;
                right: 20px;
                z-index: 9999;
                min-width: 300px;
                max-width: 400px;
                animation: slideInFromRight 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border-radius: 8px;
            `;

            const iconMap = {
                'success': 'fas fa-check-circle',
                'info': 'fas fa-info-circle',
                'warning': 'fas fa-exclamation-triangle',
                'danger': 'fas fa-times-circle',
                'error': 'fas fa-times-circle'
            };

            toast.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="${iconMap[type] || 'fas fa-info-circle'} me-2"></i>
                    <div class="flex-grow-1">${message}</div>
                    <button type="button" class="btn-close ms-2" onclick="this.parentElement.parentElement.remove()"></button>
                </div>
            `;

            document.body.appendChild(toast);

            if (duration > 0) {
                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.style.animation = 'slideOutToRight 0.3s ease';
                        setTimeout(() => toast.remove(), 300);
                    }
                }, duration);
            }
        }

        showDebugInfo() {
            if (!this.config.enableDebug) return;

            const debugInfo = document.createElement('div');
            debugInfo.id = 'signalr-debug-info';
            debugInfo.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
                max-width: 400px;
            `;

            debugInfo.innerHTML = `
                <h6>SignalR Debug Info</h6>
                <div>Connection State: ${this.connection?.state || 'Not initialized'}</div>
                <div>Is Connected: ${this.isConnected}</div>
                <div>Reconnect Attempts: ${this.reconnectAttempts}</div>
                <div>Hub URL: ${this.config.hubUrl}</div>
                <div>Cross-Tab Sync: ${this.crossTabSync ? 'Enabled' : 'Disabled'}</div>
                <div>Tab ID: ${this.crossTabSync?.tabId || 'N/A'}</div>
                <div>Browser: ${navigator.userAgent}</div>
                <button onclick="this.parentElement.remove()" style="margin-top:10px;">Close</button>
            `;

            const existing = document.querySelector('#signalr-debug-info');
            if (existing) existing.remove();

            document.body.appendChild(debugInfo);
        }

        async testConnection() {
            try {
                if (this.connection && this.isConnected) {
                    await this.connection.invoke('JoinParkingGroup');
                    this.showNotification('Test connection successful', 'success');
                    return true;
                }
            } catch (error) {
                this.debugLog('Test connection failed:', error);
                this.showNotification('Test connection failed: ' + error.message, 'danger');
                return false;
            }
        }

        getStatus() {
            return {
                isConnected: this.isConnected,
                connectionState: this.connection?.state,
                reconnectAttempts: this.reconnectAttempts,
                hubUrl: this.config.hubUrl,
                crossTabEnabled: !!this.crossTabSync,
                tabId: this.crossTabSync?.tabId || null
            };
        }

        async disconnect() {
            if (this.connection && this.isConnected) {
                try {
                    await this.connection.invoke("LeaveParkingGroup");
                    await this.connection.stop();
                    this.debugLog('Disconnected successfully');
                } catch (error) {
                    this.debugLog('Error during disconnect:', error);
                }
            }
        }
    }

    // ===== CSS STYLES =====
    const styles = document.createElement('style');
    styles.id = 'parking-signalr-debug-styles';
    styles.textContent = `
        @keyframes slideInFromRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutToRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .slot-updating {
            animation: slotPulse 1s ease-in-out;
        }
        
        @keyframes slotPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); box-shadow: 0 0 15px rgba(40,167,69,0.5); }
        }

        .parking-slot {
            transition: all 0.3s ease;
            border-radius: 8px;
            position: relative;
            overflow: hidden;
        }

        .parking-slot.available {
            background: linear-gradient(135deg, #28a745, #1e7e34) !important;
            border: 2px solid #1c7430 !important;
            color: white !important;
        }

        .parking-slot.available:hover {
            transform: scale(1.02) !important;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4) !important;
        }

        .parking-slot.reserved {
            background: linear-gradient(135deg, #ffc107, #e0a800) !important;
            border: 2px solid #d39e00 !important;
            color: #212529 !important;
            cursor: not-allowed !important;
        }

        .parking-slot.occupied {
            background: linear-gradient(135deg, #dc3545, #b02a37) !important;
            border: 2px solid #721c24 !important;
            color: white !important;
            cursor: not-allowed !important;
        }

        .parking-slot.selected {
            background: linear-gradient(135deg, #007bff, #0056b3) !important;
            border: 2px solid #004085 !important;
            color: white !important;
            box-shadow: 0 0 20px rgba(0, 123, 255, 0.5) !important;
        }

        .parking-slot.slot-updating {
            animation: slotUpdateFlash 1.5s ease-in-out;
        }

        @keyframes slotUpdateFlash {
            0%, 100% { 
                transform: scale(1); 
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            25% { 
                transform: scale(1.08); 
                box-shadow: 0 8px 25px rgba(40, 167, 69, 0.6);
            }
            50% { 
                transform: scale(1.05); 
                box-shadow: 0 6px 20px rgba(255, 193, 7, 0.5);
            }
            75% { 
                transform: scale(1.03); 
                box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);
            }
        }

        .parking-slot .slot-code {
            font-weight: bold;
            font-size: 1.1em;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }

        .parking-slot .slot-status-icon {
            font-size: 1.2em;
            margin-top: 5px;
        }

        .slot-occupied {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
        }

        .slot-occupied .slot-status-icon i {
            font-size: 1.5em;
            opacity: 0.8;
        }

        .fade-in {
            animation: fadeInSlot 0.5s ease-in-out;
        }

        @keyframes fadeInSlot {
            from { 
                opacity: 0; 
                transform: translateY(-10px); 
            }
            to { 
                opacity: 1; 
                transform: translateY(0); 
            }
        }

        #signalr-debug-info {
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }

        #signalr-status, #admin-status {
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }

        @media (max-width: 768px) {
            .parking-slot {
                min-height: 60px;
                font-size: 0.9em;
            }
            
            .parking-slot .slot-code {
                font-size: 1em;
            }
            
            .parking-slot .slot-status-icon {
                font-size: 1em;
            }
        }
    `;
    document.head.appendChild(styles);

    // ===== INITIALIZATION =====
    window.parkingSignalRDebug = null;

    function initializeParkingClient() {
        console.log('Initializing ParkingSignalR Debug Client with Cross-Tab Sync...');
        window.parkingSignalRDebug = new ParkingSignalRDebugClient({
            enableDebug: true,
            autoReconnect: true,
            enableCrossTab: true // BẬT CROSS-TAB SYNC
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeParkingClient);
    } else {
        initializeParkingClient();
    }

    // Add test button after 3 seconds
    setTimeout(() => {
        if (window.parkingSignalRDebug) {
            const testBtn = document.createElement('button');
            testBtn.innerHTML = 'Test SignalR';
            testBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10001;
                padding: 10px 15px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            `;
            testBtn.onclick = () => {
                window.parkingSignalRDebug.testConnection();
                console.log('SignalR Status:', window.parkingSignalRDebug.getStatus());
            };
            document.body.appendChild(testBtn);

            // Add cross-tab test button
            const crossTabTestBtn = document.createElement('button');
            crossTabTestBtn.innerHTML = 'Test Cross-Tab';
            crossTabTestBtn.style.cssText = `
                position: fixed;
                bottom: 70px;
                right: 20px;
                z-index: 10001;
                padding: 10px 15px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            `;
            crossTabTestBtn.onclick = () => {
                if (window.parkingSignalRDebug.crossTabSync) {
                    window.parkingSignalRDebug.crossTabSync.notifyOtherTabs('SlotReleased', {
                        slotCode: 'TEST-001'
                    });
                    console.log('Cross-tab test notification sent');
                }
            };
            document.body.appendChild(crossTabTestBtn);
        }
    }, 3000);

    // Event listeners
    window.addEventListener('beforeunload', () => {
        if (window.parkingSignalRDebug) {
            window.parkingSignalRDebug.disconnect();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && window.parkingSignalRDebug) {
            const status = window.parkingSignalRDebug.getStatus();
            if (!status.isConnected) {
                window.parkingSignalRDebug.connect();
            }
        }
    });

    // Global debug functions
    window.debugCrossTab = {
        testSlotRelease: (slotCode = 'TEST-001') => {
            if (window.parkingSignalRDebug?.crossTabSync) {
                window.parkingSignalRDebug.crossTabSync.notifyOtherTabs('SlotReleased', { slotCode });
                console.log(`Cross-tab test: Released slot ${slotCode}`);
            }
        },

        getStatus: () => {
            return {
                signalRDebug: !!window.parkingSignalRDebug,
                crossTabSync: !!window.parkingSignalRDebug?.crossTabSync,
                isConnected: window.parkingSignalRDebug?.isConnected,
                tabId: window.parkingSignalRDebug?.crossTabSync?.tabId
            };
        },

        testAll: () => {
            console.log('=== Cross-Tab Debug Test ===');
            console.log('Status:', window.debugCrossTab.getStatus());
            window.debugCrossTab.testSlotRelease('A-001');
        }
    };

    console.log('Enhanced ParkingSignalR Debug Client loaded with Cross-Tab Sync');
    console.log('Use window.debugCrossTab.testAll() to test cross-tab functionality');

})();