// PWA Service Worker Registration and Management
let deferredPrompt;
let installPromptShown = false;

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registration successful:', registration.scope);
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content is available, show update notification
            showUpdateNotification();
          }
        });
      });
      
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
    }
  });
}

// Handle PWA Install Prompt
window.addEventListener('beforeinstallprompt', (event) => {
  console.log('PWA install prompt available');
  event.preventDefault();
  deferredPrompt = event;
  
  // Show custom install button/banner after a delay
  setTimeout(() => {
    if (!installPromptShown && !isAppInstalled()) {
      showInstallPrompt();
    }
  }, 10000); // Show after 10 seconds
});

// Handle successful PWA installation
window.addEventListener('appinstalled', (event) => {
  console.log('PWA installed successfully');
  hideInstallPrompt();
  showSuccessMessage('App installed successfully! You can now use uWork offline.');
  
  // Track installation
  if (typeof gtag !== 'undefined') {
    gtag('event', 'pwa_install', {
      event_category: 'PWA',
      event_label: 'App Installed'
    });
  }
});

// Check if app is already installed
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Show install prompt
function showInstallPrompt() {
  if (installPromptShown || isAppInstalled()) return;
  
  const installBanner = document.createElement('div');
  installBanner.id = 'pwa-install-banner';
  installBanner.className = 'pwa-install-banner';
  installBanner.innerHTML = `
    <div class="install-content">
      <div class="install-icon">
        <i class="bi bi-download"></i>
      </div>
      <div class="install-text">
        <strong>Install uWork</strong>
        <span>Get quick access and work offline</span>
      </div>
      <div class="install-actions">
        <button class="btn btn-primary btn-sm" onclick="installPWA()">
          <i class="bi bi-plus-circle me-1"></i>Install
        </button>
        <button class="btn btn-outline-secondary btn-sm" onclick="dismissInstallPrompt()">
          <i class="bi bi-x"></i>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(installBanner);
  installPromptShown = true;
  
  // Auto-hide after 30 seconds
  setTimeout(() => {
    dismissInstallPrompt();
  }, 30000);
}

// Install PWA
async function installPWA() {
  if (!deferredPrompt) return;
  
  try {
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted PWA install');
    } else {
      console.log('User dismissed PWA install');
    }
    
    deferredPrompt = null;
    hideInstallPrompt();
  } catch (error) {
    console.error('Error installing PWA:', error);
  }
}

// Dismiss install prompt
function dismissInstallPrompt() {
  hideInstallPrompt();
  // Don't show again for 7 days
  localStorage.setItem('pwa-install-dismissed', Date.now() + (7 * 24 * 60 * 60 * 1000));
}

// Hide install prompt
function hideInstallPrompt() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.remove();
  }
  installPromptShown = false;
}

// Check if install prompt was recently dismissed
function shouldShowInstallPrompt() {
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed && Date.now() < parseInt(dismissed)) {
    return false;
  }
  return true;
}

// Show update notification
function showUpdateNotification() {
  const updateBanner = document.createElement('div');
  updateBanner.id = 'pwa-update-banner';
  updateBanner.className = 'pwa-update-banner';
  updateBanner.innerHTML = `
    <div class="update-content">
      <div class="update-icon">
        <i class="bi bi-arrow-clockwise"></i>
      </div>
      <div class="update-text">
        <strong>Update Available</strong>
        <span>New features and improvements are ready</span>
      </div>
      <div class="update-actions">
        <button class="btn btn-success btn-sm" onclick="updatePWA()">
          <i class="bi bi-download me-1"></i>Update
        </button>
        <button class="btn btn-outline-secondary btn-sm" onclick="dismissUpdateNotification()">
          Later
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(updateBanner);
  
  // Auto-dismiss after 1 minute
  setTimeout(() => {
    dismissUpdateNotification();
  }, 60000);
}

// Update PWA
function updatePWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    });
  }
  dismissUpdateNotification();
}

// Dismiss update notification
function dismissUpdateNotification() {
  const banner = document.getElementById('pwa-update-banner');
  if (banner) {
    banner.remove();
  }
}

// Handle online/offline status
function updateNetworkStatus() {
  const statusIndicator = document.getElementById('network-status');
  if (statusIndicator) {
    if (navigator.onLine) {
      statusIndicator.className = 'network-status online';
      statusIndicator.innerHTML = '<i class="bi bi-wifi"></i> Online';
    } else {
      statusIndicator.className = 'network-status offline';
      statusIndicator.innerHTML = '<i class="bi bi-wifi-off"></i> Offline';
    }
  }
}

// Listen for network status changes
window.addEventListener('online', () => {
  updateNetworkStatus();
  showSuccessMessage('You\'re back online!');
});

window.addEventListener('offline', () => {
  updateNetworkStatus();
  showWarningMessage('You\'re offline. Some features may be limited.');
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  updateNetworkStatus();
  
  // Check if we should show install prompt
  if (shouldShowInstallPrompt() && !isAppInstalled()) {
    // Delay showing prompt until user has engaged with the app
    let userEngaged = false;
    const engagementEvents = ['click', 'scroll', 'keypress'];
    
    const handleEngagement = () => {
      if (!userEngaged) {
        userEngaged = true;
        setTimeout(() => {
          if (!installPromptShown && deferredPrompt) {
            showInstallPrompt();
          }
        }, 5000);
        
        // Remove event listeners
        engagementEvents.forEach(event => {
          document.removeEventListener(event, handleEngagement);
        });
      }
    };
    
    engagementEvents.forEach(event => {
      document.addEventListener(event, handleEngagement);
    });
  }
});

// Utility functions for notifications
function showSuccessMessage(message) {
  showNotification(message, 'success');
}

function showWarningMessage(message) {
  showNotification(message, 'warning');
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `pwa-notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="bi ${type === 'success' ? 'bi-check-circle' : type === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle'}"></i>
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
        <i class="bi bi-x"></i>
      </button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
} 