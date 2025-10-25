/**
 * Custom Toast Notification System
 * Provides elegant toast notifications without external dependencies
 */

class ToastManager {
  constructor() {
    this.toasts = [];
    this.container = null;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    
    // Create toast container
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-3';
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', duration = 4000) {
    if (typeof window === 'undefined') return;

    const toast = this.createToast(message, type);
    this.container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.add('translate-y-0', 'opacity-100');
      toast.classList.remove('-translate-y-2', 'opacity-0');
    }, 10);

    // Auto remove
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);

    return toast;
  }

  createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `
      transform transition-all duration-300 ease-in-out
      -translate-y-2 opacity-0
      min-w-96 max-w-lg w-auto bg-white shadow-xl rounded-lg pointer-events-auto
      ring-1 ring-black ring-opacity-5 overflow-hidden border border-gray-200
    `;

    const iconMap = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const colorMap = {
      success: 'text-green-600 bg-green-50',
      error: 'text-red-600 bg-red-50',
      warning: 'text-yellow-600 bg-yellow-50',
      info: 'text-blue-600 bg-blue-50'
    };

    toast.innerHTML = `
      <div class="p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 rounded-full flex items-center justify-center ${colorMap[type] || colorMap.info}">
              <span class="text-lg">${iconMap[type] || iconMap.info}</span>
            </div>
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-900 leading-5">${message}</p>
          </div>
          <div class="ml-4 flex-shrink-0">
            <button class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" onclick="this.closest('.transform').remove()">
              <span class="sr-only">Close</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    return toast;
  }

  removeToast(toast) {
    if (!toast || !toast.parentNode) return;

    toast.classList.add('-translate-y-2', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

// Create singleton instance
const toastManager = new ToastManager();

// Export convenience functions
export const toast = {
  success: (message, duration) => toastManager.success(message, duration),
  error: (message, duration) => toastManager.error(message, duration),
  warning: (message, duration) => toastManager.warning(message, duration),
  info: (message, duration) => toastManager.info(message, duration),
  show: (message, type, duration) => toastManager.show(message, type, duration)
};

export default toast;
