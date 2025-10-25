/**
 * Custom Confirmation Dialog System
 * Provides elegant confirmation dialogs without external dependencies
 */

class ConfirmManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    
    // Create confirm container
    this.container = document.createElement('div');
    this.container.id = 'confirm-container';
    this.container.className = 'fixed inset-0 z-50 hidden';
    document.body.appendChild(this.container);
  }

  show(options = {}) {
    if (typeof window === 'undefined') return Promise.resolve(false);

    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'warning' // warning, danger, info
    } = options;

    return new Promise((resolve) => {
      const modal = this.createModal(title, message, confirmText, cancelText, type, resolve);
      this.container.innerHTML = '';
      this.container.appendChild(modal);
      this.container.classList.remove('hidden');
      
      // Focus on cancel button by default for safety
      setTimeout(() => {
        const cancelBtn = modal.querySelector('[data-action="cancel"]');
        if (cancelBtn) cancelBtn.focus();
      }, 100);
    });
  }

  createModal(title, message, confirmText, cancelText, type, resolve) {
    const modal = document.createElement('div');
    modal.className = 'bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full';
    
    const typeColors = {
      warning: 'text-yellow-600 bg-yellow-100',
      danger: 'text-red-600 bg-red-100',
      info: 'text-blue-600 bg-blue-100'
    };

    const typeIcons = {
      warning: '⚠️',
      danger: '🗑️',
      info: 'ℹ️'
    };

    const confirmButtonColors = {
      warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
      danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    };

    modal.innerHTML = `
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3 text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full ${typeColors[type] || typeColors.warning} mb-4">
            <span class="text-2xl">${typeIcons[type] || typeIcons.warning}</span>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">${title}</h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-gray-500">${message}</p>
          </div>
          <div class="flex justify-center space-x-3 mt-4">
            <button 
              data-action="cancel"
              class="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              ${cancelText}
            </button>
            <button 
              data-action="confirm"
              class="px-4 py-2 ${confirmButtonColors[type] || confirmButtonColors.warning} text-white text-base font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              ${confirmText}
            </button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const confirmBtn = modal.querySelector('[data-action="confirm"]');
    const cancelBtn = modal.querySelector('[data-action="cancel"]');
    
    const handleConfirm = () => {
      this.hide();
      resolve(true);
    };

    const handleCancel = () => {
      this.hide();
      resolve(false);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        handleCancel();
      }
    });

    // Handle escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return modal;
  }

  hide() {
    if (this.container) {
      this.container.classList.add('hidden');
      this.container.innerHTML = '';
    }
  }
}

// Create singleton instance
const confirmManager = new ConfirmManager();

// Export convenience functions
export const confirm = {
  show: (options) => confirmManager.show(options),
  warning: (message, title = 'Warning') => confirmManager.show({
    title,
    message,
    type: 'warning',
    confirmText: 'Proceed',
    cancelText: 'Cancel'
  }),
  danger: (message, title = 'Confirm Deletion') => confirmManager.show({
    title,
    message,
    type: 'danger',
    confirmText: 'Delete',
    cancelText: 'Cancel'
  }),
  info: (message, title = 'Confirm') => confirmManager.show({
    title,
    message,
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel'
  })
};

export default confirm;
