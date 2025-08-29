/**
 * Privacy Policy Page JavaScript
 * Handles smooth scrolling, section highlighting, and interactive features
 */

// Smooth scroll to top function
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Initialize all privacy page functionality
document.addEventListener('DOMContentLoaded', function () {
    initializeSmoothScrolling();
    initializeSectionHighlighting();
    initializeButtonAnimations();
});

/**
 * Initialize smooth scrolling for table of contents links
 */
function initializeSmoothScrolling() {
    const tocLinks = document.querySelectorAll('.toc-item');

    tocLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const headerOffset = 100; // Offset for fixed header
                const elementPosition = targetElement.offsetTop;
                const offsetPosition = elementPosition - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Add visual feedback
                this.classList.add('clicked');
                setTimeout(() => {
                    this.classList.remove('clicked');
                }, 300);
            }
        });
    });
}

/**
 * Initialize section highlighting using Intersection Observer
 */
function initializeSectionHighlighting() {
    const sections = document.querySelectorAll('.content-card[id]');
    const tocLinks = document.querySelectorAll('.toc-item');

    // Create intersection observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Remove active class from all TOC links
                tocLinks.forEach(link => {
                    link.classList.remove('active');
                    link.style.transform = '';
                });

                // Add active class to current section's TOC link
                const activeLink = document.querySelector(`a[href="#${entry.target.id}"]`);
                if (activeLink && activeLink.classList.contains('toc-item')) {
                    activeLink.classList.add('active');

                    // Add pulse animation to active link
                    activeLink.style.animation = 'pulse 0.5s ease-in-out';
                    setTimeout(() => {
                        activeLink.style.animation = '';
                    }, 500);
                }
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-100px 0px -50% 0px'
    });

    // Observe all sections
    sections.forEach(section => {
        observer.observe(section);
    });
}

/**
 * Initialize button animations and interactions
 */
function initializeButtonAnimations() {
    const buttons = document.querySelectorAll('.btn');

    buttons.forEach(button => {
        // Add ripple effect on click
        button.addEventListener('click', function (e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;

            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

/**
 * Add CSS animation for ripple effect
 */
function addRippleStyles() {
    if (!document.getElementById('privacy-dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'privacy-dynamic-styles';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .toc-item.clicked {
                transform: scale(0.95) !important;
                transition: transform 0.1s ease;
            }
            
            .content-card.highlight {
                animation: cardHighlight 1s ease-in-out;
            }
            
            @keyframes cardHighlight {
                0% { transform: translateY(-5px); box-shadow: 0 25px 50px rgba(102, 126, 234, 0.15); }
                100% { transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Highlight a specific section programmatically
 * @param {string} sectionId - The ID of the section to highlight
 */
function highlightSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section && section.classList.contains('content-card')) {
        section.classList.add('highlight');
        setTimeout(() => {
            section.classList.remove('highlight');
        }, 1000);
    }
}

/**
 * Scroll progress indicator
 */
function initializeScrollProgress() {
    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        z-index: 9999;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);

    // Update progress on scroll
    window.addEventListener('scroll', () => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollTop = window.pageYOffset;
        const scrollPercent = (scrollTop / scrollHeight) * 100;
        progressBar.style.width = scrollPercent + '%';
    });
}

/**
 * Lazy load animations for better performance
 */
function initializeLazyAnimations() {
    const animatedElements = document.querySelectorAll('.content-card, .toc-card');

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                animationObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        animationObserver.observe(element);
    });
}

/**
 * Enhanced search functionality (if search input exists)
 */
function initializeSearch() {
    const searchInput = document.getElementById('privacy-search');
    if (!searchInput) return;

    let searchTimeout;

    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = this.value.toLowerCase();
            const sections = document.querySelectorAll('.content-card');

            sections.forEach(section => {
                const content = section.textContent.toLowerCase();
                const isMatch = content.includes(searchTerm);

                section.style.display = isMatch || !searchTerm ? 'block' : 'none';

                if (isMatch && searchTerm) {
                    section.style.animation = 'cardHighlight 0.5s ease-in-out';
                    setTimeout(() => {
                        section.style.animation = '';
                    }, 500);
                }
            });
        }, 300);
    });
}

/**
 * Print functionality enhancement
 */
function initializePrintFeatures() {
    // Add print button functionality
    const printBtn = document.querySelector('.btn[onclick*="print"]');
    if (printBtn) {
        printBtn.onclick = function (e) {
            e.preventDefault();

            // Add print-specific styles before printing
            const printStyles = document.createElement('style');
            printStyles.id = 'print-styles';
            printStyles.textContent = `
                @media print {
                    .toc-card { page-break-after: always; }
                    .content-card { page-break-inside: avoid; margin-bottom: 20px; }
                    .action-buttons, .privacy-header::before { display: none !important; }
                    body { font-size: 12px; line-height: 1.4; }
                    .card-header { background: #f8f9fa !important; color: #333 !important; }
                }
            `;
            document.head.appendChild(printStyles);

            // Print the page
            window.print();

            // Remove print styles after printing
            setTimeout(() => {
                const styles = document.getElementById('print-styles');
                if (styles) styles.remove();
            }, 1000);
        };
    }
}

/**
 * Keyboard navigation support
 */
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', function (e) {
        // ESC to scroll to top
        if (e.key === 'Escape') {
            scrollToTop();
        }

        // Ctrl/Cmd + P for print
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            const printBtn = document.querySelector('.btn[onclick*="print"]');
            if (printBtn) printBtn.click();
        }

        // Arrow keys for section navigation
        if (e.key === 'ArrowDown' && e.ctrlKey) {
            e.preventDefault();
            navigateToNextSection();
        }

        if (e.key === 'ArrowUp' && e.ctrlKey) {
            e.preventDefault();
            navigateToPreviousSection();
        }
    });
}

/**
 * Navigate to next section
 */
function navigateToNextSection() {
    const sections = document.querySelectorAll('.content-card[id]');
    const currentSection = getCurrentSection();

    if (currentSection) {
        const currentIndex = Array.from(sections).indexOf(currentSection);
        const nextSection = sections[currentIndex + 1];

        if (nextSection) {
            nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            highlightSection(nextSection.id);
        }
    } else if (sections.length > 0) {
        sections[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
        highlightSection(sections[0].id);
    }
}

/**
 * Navigate to previous section
 */
function navigateToPreviousSection() {
    const sections = document.querySelectorAll('.content-card[id]');
    const currentSection = getCurrentSection();

    if (currentSection) {
        const currentIndex = Array.from(sections).indexOf(currentSection);
        const prevSection = sections[currentIndex - 1];

        if (prevSection) {
            prevSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            highlightSection(prevSection.id);
        }
    }
}

/**
 * Get currently visible section
 */
function getCurrentSection() {
    const sections = document.querySelectorAll('.content-card[id]');
    const scrollPosition = window.pageYOffset + 200;

    for (let i = sections.length - 1; i >= 0; i--) {
        if (sections[i].offsetTop <= scrollPosition) {
            return sections[i];
        }
    }

    return null;
}

/**
 * Dark/Light mode toggle (if implemented)
 */
function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('privacy-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', function () {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('privacy-theme', newTheme);

        // Update button icon
        const icon = this.querySelector('i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    });
}

/**
 * Accessibility enhancements
 */
function initializeAccessibility() {
    // Add skip-to-content link
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
    `;

    skipLink.addEventListener('focus', function () {
        this.style.top = '6px';
        this.style.opacity = '1';
        this.style.transform = 'translateY(0)';
    });

    skipLink.addEventListener('blur', function () {
        this.style.top = '-40px';
        this.style.opacity = '0';
        this.style.transform = 'translateY(-10px)';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);

    // Add main content landmark
    const privacyContent = document.querySelector('.privacy-content');
    if (privacyContent && !privacyContent.id) {
        privacyContent.id = 'main-content';
        privacyContent.setAttribute('role', 'main');
    }

    // Enhance focus management
    const focusableElements = document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
        element.addEventListener('focus', function () {
            this.style.outline = '2px solid #667eea';
            this.style.outlineOffset = '2px';
        });

        element.addEventListener('blur', function () {
            this.style.outline = '';
            this.style.outlineOffset = '';
        });
    });
}

/**
 * Performance monitoring and optimization
 */
function initializePerformanceOptimizations() {
    // Lazy load non-critical animations
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (reduceMotionQuery.matches) {
        // Disable animations for users who prefer reduced motion
        const style = document.createElement('style');
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Optimize scroll performance
    let ticking = false;

    function updateScrollEffects() {
        // Update any scroll-based effects here
        ticking = false;
    }

    window.addEventListener('scroll', function () {
        if (!ticking) {
            requestAnimationFrame(updateScrollEffects);
            ticking = true;
        }
    }, { passive: true });
}

/**
 * Analytics and user interaction tracking
 */
function initializeAnalytics() {
    // Track section views
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                console.log(`User viewed section: ${sectionId}`);

                // Send analytics event (replace with your analytics service)
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'section_view', {
                        'section_id': sectionId,
                        'page_title': document.title
                    });
                }
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.content-card[id]').forEach(section => {
        sectionObserver.observe(section);
    });

    // Track button clicks
    document.querySelectorAll('.btn, .toc-item').forEach(element => {
        element.addEventListener('click', function () {
            const elementText = this.textContent.trim();
            console.log(`User clicked: ${elementText}`);

            if (typeof gtag !== 'undefined') {
                gtag('event', 'click', {
                    'element_text': elementText,
                    'element_type': this.className
                });
            }
        });
    });
}

/**
 * Error handling and fallbacks
 */
function initializeErrorHandling() {
    window.addEventListener('error', function (e) {
        console.warn('Privacy page error:', e.error);
        // Fallback: ensure basic functionality still works
    });

    // Check if required elements exist
    const requiredElements = ['.privacy-header', '.privacy-content', '.toc-card'];
    const missingElements = requiredElements.filter(selector =>
        !document.querySelector(selector)
    );

    if (missingElements.length > 0) {
        console.warn('Missing privacy page elements:', missingElements);
    }
}

// Initialize all features when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    try {
        addRippleStyles();
        initializeScrollProgress();
        initializeLazyAnimations();
        initializeSearch();
        initializePrintFeatures();
        initializeKeyboardNavigation();
        initializeThemeToggle();
        initializeAccessibility();
        initializePerformanceOptimizations();
        initializeAnalytics();
        initializeErrorHandling();

        console.log('Privacy page initialized successfully');
    } catch (error) {
        console.error('Privacy page initialization error:', error);
    }
});

// Export functions for external use
window.PrivacyPage = {
    scrollToTop,
    highlightSection,
    navigateToNextSection,
    navigateToPreviousSection,
    getCurrentSection
};