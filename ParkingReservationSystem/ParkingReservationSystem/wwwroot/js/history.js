/**
 * ===== HISTORY PAGE JAVASCRIPT =====
 * Interactive features for parking reservation history
 */

class HistoryPageManager {
    constructor() {
        this.scrollToTopButton = null;
        this.isInitialized = false;
        this.init();
    }

    /**
     * Initialize the history page
     */
    init() {
        if (this.isInitialized) return;

        this.setupScrollToTop();
        this.setupLoadingStates();
        this.setupAnimations();
        this.setupToastNotifications();
        this.setupErrorHandling();
        this.setupAccessibility();

        this.isInitialized = true;
        console.log('History page initialized successfully');
    }

    /**
     * Setup scroll to top functionality
     */
    setupScrollToTop() {
        // Create scroll to top button
        this.scrollToTopButton = document.createElement('button');
        this.scrollToTopButton.className = 'scroll-to-top';
        this.scrollToTopButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
        this.scrollToTopButton.setAttribute('aria-label', 'Cuộn lên đầu trang');
        this.scrollToTopButton.setAttribute('title', 'Cuộn lên đầu trang');

        // Add click event
        this.scrollToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Add to page
        document.body.appendChild(this.scrollToTopButton);

        // Setup scroll listener
        this.setupScrollListener();
    }

    /**
     * Setup scroll listener for scroll to top button
     */
    setupScrollListener() {
        let ticking = false;

        const updateScrollButton = () => {
            const scrollY = window.scrollY;

            if (scrollY > 300) {
                this.scrollToTopButton.classList.add('show');
            } else {
                this.scrollToTopButton.classList.remove('show');
            }

            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollButton);
                ticking = true;
            }
        });
    }

    /**
     * Setup loading states for payment buttons
     */
    setupLoadingStates() {
        document.querySelectorAll('.status-pending').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Prevent multiple clicks
                if (btn.classList.contains('loading')) {
                    e.preventDefault();
                    return;
                }

                // Add loading state
                btn.classList.add('loading');
                btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Đang chuyển...';

                // Store original content for potential restoration
                btn.setAttribute('data-original-content', btn.innerHTML);

                // Timeout fallback to restore button if navigation fails
                setTimeout(() => {
                    if (btn && btn.classList.contains('loading')) {
                        this.restoreButton(btn);
                    }
                }, 10000);
            });
        });
    }

    /**
     * Restore button to original state
     */
    restoreButton(btn) {
        btn.classList.remove('loading');
        const originalContent = btn.getAttribute('data-original-content') ||
            '<i class="fas fa-exclamation-circle me-1"></i>Chưa thanh toán';
        btn.innerHTML = originalContent;
    }

    /**
     * Setup animations for booking groups
     */
    setupAnimations() {
        const groups = document.querySelectorAll('.booking-group');

        // Add staggered animation delay
        groups.forEach((group, index) => {
            group.style.animationDelay = `${index * 0.1}s`;
            group.classList.add('fade-in');
        });

        // Setup intersection observer for scroll animations
        this.setupScrollAnimations();
    }

    /**
     * Setup scroll-based animations using Intersection Observer
     */
    setupScrollAnimations() {
        if (!('IntersectionObserver' in window)) return;

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe booking groups for animation
        document.querySelectorAll('.booking-group').forEach(group => {
            group.style.opacity = '0';
            group.style.transform = 'translateY(20px)';
            group.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(group);
        });
    }

    /**
     * Setup toast notifications
     */
    setupToastNotifications() {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');

        if (success === 'True') {
            this.showSuccessToast();
        }
    }

    /**
     * Show success toast notification
     */
    showSuccessToast() {
        const successToast = document.getElementById('successToast');
        if (successToast && typeof bootstrap !== 'undefined') {
            const toast = new bootstrap.Toast(successToast, {
                autohide: false
            });

            toast.show();

            // Auto hide after 8 seconds with fade effect
            setTimeout(() => {
                successToast.style.transition = 'opacity 0.5s ease';
                successToast.style.opacity = '0';

                setTimeout(() => {
                    toast.hide();
                }, 500);
            }, 8000);
        }
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // Handle network errors
        window.addEventListener('error', (e) => {
            if (e.message && e.message.includes('network')) {
                this.showErrorNotification('Kiểm tra kết nối mạng của bạn');
            }
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.showErrorNotification('Đã xảy ra lỗi. Vui lòng thử lại.');
        });
    }

    /**
     * Show error notification
     */
    showErrorNotification(message) {
        const toast = document.createElement('div');
        toast.className = 'toast bg-danger text-white position-fixed';
        toast.style.cssText = 'bottom: 2rem; right: 2rem; z-index: 9999;';
        toast.innerHTML = `
            <div class="toast-body">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
            </div>
        `;

        document.body.appendChild(toast);

        if (typeof bootstrap !== 'undefined') {
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();

            // Auto remove after hiding
            toast.addEventListener('hidden.bs.toast', () => {
                toast.remove();
            });
        } else {
            // Fallback without Bootstrap
            toast.style.display = 'block';
            setTimeout(() => {
                toast.remove();
            }, 5000);
        }
    }

    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        // Add keyboard navigation for status badges
        document.querySelectorAll('.status-pending').forEach(badge => {
            badge.setAttribute('role', 'button');
            badge.setAttribute('tabindex', '0');

            badge.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    badge.click();
                }
            });
        });

        // Add keyboard navigation for action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });

        // Add screen reader announcements
        this.setupScreenReaderAnnouncements();
    }

    /**
     * Setup screen reader announcements
     */
    setupScreenReaderAnnouncements() {
        const announcements = document.createElement('div');
        announcements.id = 'sr-announcements';
        announcements.className = 'sr-only';
        announcements.setAttribute('aria-live', 'polite');
        announcements.setAttribute('aria-atomic', 'true');
        document.body.appendChild(announcements);

        // Announce when loading states change
        document.querySelectorAll('.status-pending').forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(() => {
                    announcements.textContent = 'Đang chuyển đến trang thanh toán';
                }, 100);
            });
        });
    }

    /**
     * Utility functions
     */
    refreshPage() {
        window.location.reload();
    }

    /**
     * Print current page
     */
    printPage() {
        window.print();
    }

    /**
     * Share page (if Web Share API is available)
     */
    async sharePage() {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Lịch sử giao dịch đặt chỗ xe',
                    text: 'Xem lịch sử giao dịch đặt chỗ xe của tôi',
                    url: window.location.href
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback: copy to clipboard
            try {
                await navigator.clipboard.writeText(window.location.href);
                this.showSuccessNotification('Đã sao chép link vào clipboard');
            } catch (err) {
                console.log('Error copying to clipboard:', err);
            }
        }
    }

    /**
     * Show success notification
     */
    showSuccessNotification(message) {
        const toast = document.createElement('div');
        toast.className = 'toast bg-success text-white position-fixed';
        toast.style.cssText = 'bottom: 2rem; right: 2rem; z-index: 9999;';
        toast.innerHTML = `
            <div class="toast-body">
                <i class="fas fa-check-circle me-2"></i>
                ${message}
            </div>
        `;

        document.body.appendChild(toast);

        if (typeof bootstrap !== 'undefined') {
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();

            toast.addEventListener('hidden.bs.toast', () => {
                toast.remove();
            });
        } else {
            toast.style.display = 'block';
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }
    }

    /**
     * Get page statistics
     */
    getPageStatistics() {
        const stats = {
            totalTransactions: document.querySelectorAll('.booking-table tbody tr').length,
            confirmedTransactions: document.querySelectorAll('.status-confirmed').length,
            pendingTransactions: document.querySelectorAll('.status-pending').length,
            bookingGroups: document.querySelectorAll('.booking-group').length
        };

        return stats;
    }

    /**
     * Cleanup function
     */
    destroy() {
        if (this.scrollToTopButton && this.scrollToTopButton.parentNode) {
            this.scrollToTopButton.remove();
        }

        // Remove all event listeners added by this class
        const elements = document.querySelectorAll('[data-history-listener]');
        elements.forEach(el => {
            el.removeAttribute('data-history-listener');
        });

        this.isInitialized = false;
        console.log('History page manager destroyed');
    }
}

/**
 * Initialize when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    // Create global instance
    window.historyPageManager = new HistoryPageManager();

    // Make utility functions globally available
    window.HistoryUtils = {
        refresh: () => window.historyPageManager.refreshPage(),
        print: () => window.historyPageManager.printPage(),
        share: () => window.historyPageManager.sharePage(),
        getStats: () => window.historyPageManager.getPageStatistics()
    };
});

/**
 * Handle page visibility changes
 */
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
        // Refresh data if page was hidden for more than 5 minutes
        const hiddenTime = Date.now() - (window.historyLastVisible || Date.now());
        if (hiddenTime > 300000) { // 5 minutes
            console.log('Page was hidden for a while, consider refreshing data');
        }
    }
    window.historyLastVisible = Date.now();
});

/**
 * Handle before page unload
 */
window.addEventListener('beforeunload', function () {
    if (window.historyPageManager) {
        // Clean up any pending operations
        console.log('History page unloading');
    }
});

/**
 * Handle page performance monitoring
 */
window.addEventListener('load', function () {
    // Monitor page performance
    if ('performance' in window) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`History page loaded in ${loadTime}ms`);

        // Track large CLS if available
        if ('LayoutShift' in window) {
            let cls = 0;
            new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        cls += entry.value;
                    }
                }
            }).observe({ type: 'layout-shift', buffered: true });
        }
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryPageManager;
}