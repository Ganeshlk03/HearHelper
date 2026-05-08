/**
 * HearHelper - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎧 HearHelper Application Initialized');
    
    initializeApp();
    setupEventListeners();
    loadUserSettings();
});

// Initialize Application
function initializeApp() {
    // Check browser support
    checkBrowserSupport();
    
    // Load user settings
    const settings = storageManager.getSettings();
    applyTheme(settings);
    
    // Log activity
    storageManager.recordActivity('app_started', {
        timestamp: new Date().toISOString()
    });
}

// Check Browser Support
function checkBrowserSupport() {
    const features = {
        speechRecognition: window.SpeechRecognition || window.webkitSpeechRecognition,
        speechSynthesis: window.speechSynthesis,
        localStorage: typeof(Storage) !== 'undefined',
        geolocation: navigator.geolocation
    };

    console.log('Browser Support:', features);

    if (!features.speechRecognition) {
        console.warn('Speech Recognition not supported in this browser');
    }

    if (!features.speechSynthesis) {
        console.warn('Speech Synthesis not supported in this browser');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('App backgrounded');
        } else {
            console.log('App restored');
        }
    });

    // Online/Offline status
    window.addEventListener('online', () => {
        showNotification('🟢 Back Online', 'success');
        storageManager.recordActivity('app_online');
    });

    window.addEventListener('offline', () => {
        showNotification('🔴 No Internet Connection', 'warning');
        storageManager.recordActivity('app_offline');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S: Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleSave();
        }

        // Ctrl/Cmd + E: Export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            console.log('Export shortcut triggered');
        }
    });
}

// Load User Settings
function loadUserSettings() {
    const settings = storageManager.getSettings();
    
    // Apply font size
    document.documentElement.style.fontSize = settings.fontSize + 'px';
    
    // Apply theme
    applyTheme(settings);
    
    // Apply accessibility features
    if (settings.highContrast) {
        document.body.classList.add('high-contrast');
    }
    
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
    }
}

// Apply Theme
function applyTheme(settings) {
    const root = document.documentElement;
    
    if (settings.darkMode) {
        root.style.setProperty('--dark-bg', '#1a1a2e');
        root.style.setProperty('--light-bg', '#0f0f1e');
        root.style.setProperty('--text-dark', '#ecf0f1');
        document.body.style.backgroundColor = '#1a1a2e';
        document.body.style.color = '#ecf0f1';
    }
    
    if (settings.highContrast) {
        root.style.setProperty('--primary-color', '#000');
        root.style.setProperty('--secondary-color', '#fff');
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Handle Save
function handleSave() {
    showNotification('✅ Changes saved!', 'success');
}

// Navigation Helper
function navigateTo(page) {
    document.body.style.opacity = '0.8';
    setTimeout(() => {
        window.location.href = page;
    }, 200);
}
