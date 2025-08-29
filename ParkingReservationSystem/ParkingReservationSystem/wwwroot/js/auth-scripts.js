/**
 * ===== IMPROVED AUTHENTICATION SCRIPTS =====
 * Enhanced error handling for duplicate email and better validation
 */

class AuthManager {
    constructor() {
        this.emailCheckCache = new Map(); // Cache để lưu kết quả kiểm tra email
        this.initializeComponents();
        this.attachEventListeners();
        this.addBodyClass();
        this.handleServerErrors();
        this.handleSuccessRedirect();
    }

    addBodyClass() {
        document.body.classList.add('auth-page');
    }

    handleSuccessRedirect() {
        const redirectToLogin = document.querySelector('meta[name="redirect-to-login"]');
        if (redirectToLogin && redirectToLogin.content === 'true') {
            this.showSuccessWithRedirect();
        }
    }

    showSuccessWithRedirect() {
        let countdown = 3;
        const countdownInterval = setInterval(() => {
            if (countdown > 0) {
                this.showToast(
                    `Đăng ký thành công! Chuyển đến trang đăng nhập sau ${countdown} giây...`,
                    'success',
                    1000
                );
                countdown--;
            } else {
                clearInterval(countdownInterval);
                window.location.href = '/Account/Login';
            }
        }, 1000);
    }

    /**
     * Enhanced server error handling
     */
    handleServerErrors() {
        // Xử lý validation summary errors
        const validationSummary = document.querySelector('.validation-summary-errors');
        if (validationSummary) {
            const errorText = validationSummary.textContent.trim();
            if (errorText) {
                this.showToast(errorText, 'error', 8000);
                this.highlightFormWithError();
            }
        }

        // Xử lý error alerts với focus cải tiến
        const errorAlert = document.querySelector('.auth-alert.alert-danger');
        if (errorAlert) {
            const errorText = errorAlert.querySelector('span')?.textContent.trim();
            if (errorText) {
                this.showToast(errorText, 'error', 8000);
                this.highlightFormWithError();

                // Nếu là lỗi email, focus vào email field
                if (errorText.toLowerCase().includes('email')) {
                    this.focusEmailField();
                } else {
                    this.focusFirstInput();
                }
            }
        }

        // Xử lý field-specific errors với cải thiện
        const fieldErrors = document.querySelectorAll('.text-danger, .field-validation-error');
        let hasEmailError = false;

        fieldErrors.forEach(error => {
            const errorText = error.textContent.trim();
            if (errorText) {
                const input = error.closest('.form-group')?.querySelector('.form-input');
                if (input) {
                    this.setFieldValidation(input, false, errorText);

                    // Track email errors
                    if (input.type === 'email' || input.name.toLowerCase().includes('email')) {
                        hasEmailError = true;
                        // Cache lỗi email từ server
                        this.emailCheckCache.set(input.value.trim().toLowerCase(), {
                            isAvailable: false,
                            error: errorText
                        });
                    }
                }
            }
        });

        // Focus email field nếu có lỗi email
        if (hasEmailError) {
            this.focusEmailField();
        }

        // Xử lý success messages
        const successAlert = document.querySelector('.auth-alert.alert-success');
        if (successAlert) {
            const successText = successAlert.querySelector('span')?.textContent.trim();
            if (successText) {
                this.showToast(successText, 'success', 6000);
            }
        }
    }

    /**
     * Focus email field with enhanced UX
     */
    focusEmailField() {
        const emailInput = document.querySelector('input[type="email"], input[name*="email" i]');
        if (emailInput) {
            setTimeout(() => {
                emailInput.focus();
                emailInput.select();

                // Scroll to email field if needed
                emailInput.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 500);
        }
    }

    highlightFormWithError() {
        const form = document.querySelector('.auth-form');
        if (form) {
            form.classList.add('has-error');
            form.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                form.style.animation = '';
            }, 500);
        }
    }

    focusFirstInput() {
        const firstInput = document.querySelector('.form-input');
        if (firstInput) {
            setTimeout(() => {
                firstInput.focus();
            }, 100);
        }
    }

    initializeComponents() {
        this.initializePasswordToggles();
        this.initializeFormValidation();
        this.initializeFormSubmission();
        this.initializeAnimations();
        this.initializePasswordStrength();
        this.initializeEmailValidation();
    }

    /**
     * Enhanced email validation with real-time checking (only for register page)
     */
    initializeEmailValidation() {
        const emailInput = document.querySelector('input[type="email"]');
        if (!emailInput) return;

        // Chỉ kiểm tra availability trên trang đăng ký
        const isRegisterPage = this.isRegisterPage();

        let debounceTimer;
        let lastCheckedEmail = '';

        emailInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);

            const email = emailInput.value.trim().toLowerCase();

            // Clear validation chỉ khi email thay đổi
            if (email !== lastCheckedEmail) {
                this.clearFieldError(emailInput);
                const form = emailInput.closest('.auth-form');
                if (form) {
                    form.classList.remove('has-error');
                }
            }

            // Chỉ thực hiện validation nâng cao trên trang register
            if (isRegisterPage && email) {
                debounceTimer = setTimeout(() => {
                    // Kiểm tra cache trước
                    const cachedResult = this.emailCheckCache.get(email);
                    if (cachedResult) {
                        if (!cachedResult.isAvailable) {
                            this.setFieldValidation(emailInput, false, cachedResult.error);
                        } else {
                            this.setFieldValidation(emailInput, true, '');
                        }
                        return;
                    }

                    // Basic validation first
                    if (!this.isValidEmail(emailInput.value)) {
                        this.setFieldValidation(emailInput, false, 'Định dạng email không hợp lệ');
                        return;
                    }

                    // Check availability if email is valid and different
                    if (email !== lastCheckedEmail) {
                        this.checkEmailAvailability(emailInput.value, emailInput);
                        lastCheckedEmail = email;
                    }
                }, 800);
            }
        });

        // Modified focus handler - không xóa lỗi email trùng lặp
        emailInput.addEventListener('focus', () => {
            const email = emailInput.value.trim().toLowerCase();
            const cachedResult = this.emailCheckCache.get(email);

            // Chỉ xóa lỗi nếu không phải lỗi email trùng lặp
            if (!cachedResult || cachedResult.isAvailable) {
                this.clearFieldError(emailInput);
            }
            // Nếu email trùng lặp, giữ nguyên lỗi nhưng vẫn cho phép edit
        });

        // Clear cache khi email thay đổi nhiều
        emailInput.addEventListener('input', () => {
            const email = emailInput.value.trim().toLowerCase();
            // Xóa cache của email cũ khi user thay đổi đáng kể
            if (Math.abs(email.length - lastCheckedEmail.length) > 3) {
                this.emailCheckCache.clear();
            }
        });
    }

    /**
     * Check if current page is register page
     */
    isRegisterPage() {
        // Kiểm tra URL
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('register') || currentPath.includes('signup')) {
            return true;
        }

        // Kiểm tra title page
        const pageTitle = document.title.toLowerCase();
        if (pageTitle.includes('đăng ký') || pageTitle.includes('register')) {
            return true;
        }

        // Kiểm tra form action
        const form = document.querySelector('.auth-form');
        if (form) {
            const action = form.getAttribute('action');
            if (action && action.toLowerCase().includes('register')) {
                return true;
            }
        }

        // Kiểm tra nội dung trang
        const authTitle = document.querySelector('.auth-title');
        if (authTitle && authTitle.textContent.toLowerCase().includes('đăng ký')) {
            return true;
        }

        // Kiểm tra có confirm password field không (chỉ có ở register)
        const confirmPasswordField = document.querySelector('input[name="confirmPassword"], input[name="ConfirmPassword"]');
        if (confirmPasswordField) {
            return true;
        }

        return false;
    }

    /**
     * Enhanced email availability check with better error handling and caching
     */
    async checkEmailAvailability(email, emailInput) {
        try {
            const emailLower = email.trim().toLowerCase();

            // Show checking indicator
            this.setFieldChecking(emailInput, true);

            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;

            const response = await fetch('/Account/CheckEmailAvailability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'RequestVerificationToken': token })
                },
                body: JSON.stringify({ email: email })
            });

            this.setFieldChecking(emailInput, false);

            if (response.ok) {
                const result = await response.json();

                // Cache kết quả
                this.emailCheckCache.set(emailLower, {
                    isAvailable: result.isAvailable,
                    error: result.isAvailable ? null : 'Email này đã được sử dụng'
                });

                if (!result.isAvailable) {
                    this.setFieldValidation(emailInput, false, 'Email này đã được sử dụng');

                    // Show toast notification for duplicate email
                    this.showToast('Email này đã được sử dụng. Vui lòng chọn email khác.', 'error', 6000);
                } else {
                    this.setFieldValidation(emailInput, true, '');
                }
            } else {
                // Nếu API lỗi, không hiển thị lỗi - để server-side validation xử lý
                console.log('Email availability check failed - will rely on server validation');
            }
        } catch (error) {
            this.setFieldChecking(emailInput, false);

            // Log error nhưng không hiển thị cho user
            console.log('Email availability check failed:', error);

            // Không hiển thị lỗi - để server-side validation xử lý khi submit
            // User vẫn có thể tiếp tục và sẽ nhận được thông báo từ server nếu email trùng
        }
    }

    /**
     * Set field checking state
     */
    setFieldChecking(input, isChecking) {
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;

        let checkingIndicator = formGroup.querySelector('.checking-indicator');

        if (isChecking && !checkingIndicator) {
            checkingIndicator = document.createElement('div');
            checkingIndicator.className = 'checking-indicator';
            checkingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang kiểm tra...';
            formGroup.appendChild(checkingIndicator);
        } else if (!isChecking && checkingIndicator) {
            checkingIndicator.remove();
        }
    }

    initializePasswordToggles() {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            this.addPasswordToggle(input);
        });
    }

    addPasswordToggle(passwordInput) {
        const formGroup = passwordInput.closest('.form-group');
        if (!formGroup || formGroup.querySelector('.password-toggle')) return;

        formGroup.classList.add('has-icon');

        // Tạo wrapper cho input nếu chưa có
        let inputWrapper = formGroup.querySelector('.input-wrapper');
        if (!inputWrapper) {
            inputWrapper = document.createElement('div');
            inputWrapper.className = 'input-wrapper';

            // Wrap input trong wrapper
            passwordInput.parentNode.insertBefore(inputWrapper, passwordInput);
            inputWrapper.appendChild(passwordInput);
        }

        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'password-toggle';
        toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
        toggleButton.setAttribute('aria-label', 'Toggle password visibility');

        // Thêm button vào wrapper thay vì form-group
        inputWrapper.appendChild(toggleButton);

        toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.togglePasswordVisibility(passwordInput, toggleButton);
        });
    }

    togglePasswordVisibility(input, button) {
        const icon = button.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
            button.setAttribute('aria-label', 'Hide password');
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
            button.setAttribute('aria-label', 'Show password');
        }

        // Smooth icon transition
        icon.style.transform = 'scale(0.8)';
        setTimeout(() => {
            icon.style.transform = 'scale(1)';
        }, 150);
    }

    initializePasswordStrength() {
        const passwordInput = document.querySelector('#password, input[name="password"]');
        if (!passwordInput) return;

        const formGroup = passwordInput.closest('.form-group');
        if (!formGroup) return;

        const strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'password-strength';
        strengthIndicator.innerHTML = `
            <div class="strength-bar">
                <div class="strength-progress"></div>
            </div>
            <div class="strength-text"></div>
        `;

        formGroup.appendChild(strengthIndicator);

        passwordInput.addEventListener('input', () => {
            this.updatePasswordStrength(passwordInput, strengthIndicator);
        });
    }

    updatePasswordStrength(input, indicator) {
        const password = input.value;
        const progressBar = indicator.querySelector('.strength-progress');
        const strengthText = indicator.querySelector('.strength-text');

        if (!password) {
            progressBar.className = 'strength-progress';
            strengthText.textContent = '';
            strengthText.className = 'strength-text';
            return;
        }

        const strength = this.calculatePasswordStrength(password);
        progressBar.className = `strength-progress ${strength.level}`;
        strengthText.textContent = strength.text;
        strengthText.className = `strength-text ${strength.level}`;
    }

    calculatePasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        if (checks.length) score += 2;
        if (checks.lowercase) score += 1;
        if (checks.uppercase) score += 1;
        if (checks.number) score += 1;
        if (checks.special) score += 1;

        if (score < 3) {
            return { level: 'weak', text: 'Mật khẩu yếu' };
        } else if (score < 4) {
            return { level: 'medium', text: 'Mật khẩu trung bình' };
        } else if (score < 6) {
            return { level: 'strong', text: 'Mật khẩu mạnh' };
        } else {
            return { level: 'very-strong', text: 'Mật khẩu rất mạnh' };
        }
    }

    initializeFormValidation() {
        const forms = document.querySelectorAll('.auth-form');

        forms.forEach(form => {
            const inputs = form.querySelectorAll('.form-input');

            inputs.forEach(input => {
                input.addEventListener('blur', () => {
                    this.validateField(input);
                });

                input.addEventListener('input', () => {
                    // Chỉ clear error cho non-email fields hoặc email không có lỗi trùng lặp
                    if (input.type !== 'email') {
                        this.clearFieldError(input);
                        form.classList.remove('has-error');
                    } else {
                        // Với email, chỉ clear nếu không có lỗi cached
                        const email = input.value.trim().toLowerCase();
                        const cachedResult = this.emailCheckCache.get(email);
                        if (!cachedResult || cachedResult.isAvailable) {
                            form.classList.remove('has-error');
                        }
                    }

                    if (input.name === 'confirmPassword') {
                        this.validatePasswordMatch(input);
                    }
                });
            });
        });
    }

    validateField(input) {
        const value = input.value.trim();
        const type = input.type;
        const name = input.name;
        const isRequired = input.hasAttribute('required');

        let isValid = true;
        let errorMessage = '';

        // Kiểm tra cache cho email trước
        if (type === 'email' && value) {
            const cachedResult = this.emailCheckCache.get(value.toLowerCase());
            if (cachedResult && !cachedResult.isAvailable) {
                this.setFieldValidation(input, false, cachedResult.error);
                return false;
            }
        }

        if (isRequired && !value) {
            isValid = false;
            errorMessage = 'Trường này là bắt buộc';
        } else if (type === 'email' && value && !this.isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Email không hợp lệ';
        } else if ((type === 'password' || name === 'password') && value && value.length < 6) {
            isValid = false;
            errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
        } else if (name === 'confirmPassword') {
            isValid = this.validatePasswordMatch(input);
        } else if (name === 'Name' && value && value.length < 2) {
            isValid = false;
            errorMessage = 'Họ tên phải có ít nhất 2 ký tự';
        }

        this.setFieldValidation(input, isValid, errorMessage);
        return isValid;
    }

    validatePasswordMatch(confirmInput) {
        const passwordInput = document.querySelector('#password, input[name="password"]');
        if (!passwordInput) return true;

        const password = passwordInput.value;
        const confirmPassword = confirmInput.value;

        if (confirmPassword && password !== confirmPassword) {
            this.setFieldValidation(confirmInput, false, 'Mật khẩu xác nhận không khớp');
            return false;
        }

        if (confirmPassword && password === confirmPassword) {
            this.setFieldValidation(confirmInput, true, '');
            return true;
        }

        return true;
    }

    setFieldValidation(input, isValid, errorMessage) {
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;

        const existingError = formGroup.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        input.classList.remove('is-valid', 'is-invalid');

        if (!isValid && errorMessage) {
            input.classList.add('is-invalid');

            const errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${errorMessage}`;
            formGroup.appendChild(errorElement);

            errorElement.style.opacity = '0';
            errorElement.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                errorElement.style.opacity = '1';
                errorElement.style.transform = 'translateY(0)';
            }, 50);
        } else if (input.value.trim()) {
            input.classList.add('is-valid');
        }
    }

    clearFieldError(input) {
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;

        const existingError = formGroup.querySelector('.field-error');
        if (existingError) {
            existingError.style.opacity = '0';
            setTimeout(() => {
                existingError.remove();
            }, 200);
        }

        input.classList.remove('is-invalid');
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    initializeFormSubmission() {
        const forms = document.querySelectorAll('.auth-form');

        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                this.handleFormSubmit(e, form);
            });
        });
    }

    handleFormSubmit(e, form) {
        const inputs = form.querySelectorAll('.form-input');
        const submitButton = form.querySelector('.auth-button[type="submit"]');
        let isFormValid = true;

        form.classList.remove('has-error');

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isFormValid = false;
            }
        });

        if (!isFormValid) {
            e.preventDefault();
            this.showValidationError();
            this.highlightFormWithError();
            return;
        }

        if (submitButton) {
            this.setButtonLoading(submitButton, true);
            setTimeout(() => {
                this.setButtonLoading(submitButton, false);
            }, 10000);
        }
    }

    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
            const buttonText = button.querySelector('.button-text');
            if (buttonText) {
                buttonText.style.opacity = '0';
            }
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            const buttonText = button.querySelector('.button-text');
            if (buttonText) {
                buttonText.style.opacity = '1';
            }
        }
    }

    showValidationError() {
        this.showToast('Vui lòng kiểm tra lại thông tin nhập vào', 'error');
    }

    initializeAnimations() {
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.closest('.form-group').classList.add('focused');

                // Chỉ clear error cho non-email hoặc email không có lỗi trùng lặp
                if (input.type !== 'email') {
                    this.clearFieldError(input);
                } else {
                    const email = input.value.trim().toLowerCase();
                    const cachedResult = this.emailCheckCache.get(email);
                    if (!cachedResult || cachedResult.isAvailable) {
                        this.clearFieldError(input);
                    }
                }
            });

            input.addEventListener('blur', () => {
                if (!input.value.trim()) {
                    input.closest('.form-group').classList.remove('focused');
                }
            });
        });

        const formGroups = document.querySelectorAll('.form-group');
        formGroups.forEach((group, index) => {
            group.style.animationDelay = `${index * 0.1}s`;
            group.classList.add('slide-up');
        });
    }

    attachEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.classList.contains('form-input')) {
                    const form = activeElement.closest('form');
                    if (form) {
                        const submitButton = form.querySelector('.auth-button[type="submit"]');
                        if (submitButton && !submitButton.disabled) {
                            submitButton.click();
                        }
                    }
                }
            }
        });

        const authLinks = document.querySelectorAll('.auth-link');
        authLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                link.style.transform = 'translateY(-2px)';
            });

            link.addEventListener('mouseleave', () => {
                link.style.transform = 'translateY(0)';
            });
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                const loadingButtons = document.querySelectorAll('.auth-button.loading');
                loadingButtons.forEach(button => {
                    this.setButtonLoading(button, false);
                });
            }
        });
    }

    showToast(message, type = 'info', duration = 5000) {
        const existingToasts = document.querySelectorAll('.auth-toast');
        existingToasts.forEach(toast => this.removeToast(toast));

        const toast = document.createElement('div');
        toast.className = `auth-toast auth-toast-${type}`;

        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <div class="toast-content">
                <i class="${icon}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        const autoRemoveTimeout = setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        const closeButton = toast.querySelector('.toast-close');
        closeButton.addEventListener('click', () => {
            clearTimeout(autoRemoveTimeout);
            this.removeToast(toast);
        });

        toast.addEventListener('click', (e) => {
            if (e.target === toast) {
                clearTimeout(autoRemoveTimeout);
                this.removeToast(toast);
            }
        });
    }

    getToastIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    removeToast(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }

    showLoginError(message) {
        this.showToast(message, 'error', 8000);
        this.highlightFormWithError();

        // Focus email field for retry
        const emailInput = document.querySelector('input[type="email"]');
        if (emailInput) {
            setTimeout(() => {
                emailInput.focus();
                emailInput.select();
            }, 500);
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success', 6000);
    }

    /**
     * Method để clear cache email khi cần thiết (có thể gọi từ bên ngoài)
     */
    clearEmailCache() {
        this.emailCheckCache.clear();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const authManager = new AuthManager();
    window.authManager = authManager;
});

// Handle page load events for better error display
window.addEventListener('load', () => {
    const authManager = window.authManager;
    if (authManager) {
        setTimeout(() => {
            authManager.handleServerErrors();
        }, 100);
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const closeButtons = document.querySelectorAll('.alert-close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const alertDiv = this.closest('.auth-alert');
            if (alertDiv) {
                alertDiv.style.transition = 'opacity 0.3s, max-height 0.3s';
                alertDiv.style.opacity = '0';
                alertDiv.style.maxHeight = '0';
                setTimeout(() => {
                    alertDiv.remove();
                }, 300);
            }
        });
    });
});