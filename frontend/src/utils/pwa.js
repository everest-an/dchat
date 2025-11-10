/**
 * PWA (Progressive Web App) Utilities
 * 
 * Handles service worker registration, installation prompts, and PWA features.
 * 
 * Author: Manus AI
 * Date: 2024-11-05
 */

// Service Worker Registration
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('[PWA] New Service Worker found');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[PWA] New version available');
          // Notify user about update
          notifyUpdate(registration);
        }
      });
    });

    // Auto-update check every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

// Unregister Service Worker
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('[PWA] Service Worker unregistered');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Service Worker unregistration failed:', error);
    return false;
  }
}

// Notify user about update
function notifyUpdate(registration) {
  const event = new CustomEvent('pwa-update-available', {
    detail: { registration },
  });
  window.dispatchEvent(event);
}

// Skip waiting and activate new service worker
export function skipWaiting(registration) {
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

// Install Prompt Management
let deferredPrompt = null;

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA] Install prompt available');
    e.preventDefault();
    deferredPrompt = e;

    // Notify app that install is available
    const event = new CustomEvent('pwa-install-available');
    window.dispatchEvent(event);
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    deferredPrompt = null;

    // Track installation
    trackPWAInstall();

    // Notify app
    const event = new CustomEvent('pwa-installed');
    window.dispatchEvent(event);
  });
}

export async function showInstallPrompt() {
  if (!deferredPrompt) {
    console.log('[PWA] Install prompt not available');
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);

    deferredPrompt = null;
    return outcome === 'accepted';
  } catch (error) {
    console.error('[PWA] Install prompt failed:', error);
    return false;
  }
}

export function isInstallPromptAvailable() {
  return deferredPrompt !== null;
}

// Check if app is installed
export function isAppInstalled() {
  // Check if running in standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check if running in fullscreen mode (iOS)
  if (window.navigator.standalone === true) {
    return true;
  }

  return false;
}

// Push Notifications
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('[PWA] Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('[PWA] Notification permission denied');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('[PWA] Notification permission request failed:', error);
    return false;
  }
}

export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[PWA] Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push notifications
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.error('[PWA] VAPID public key not configured');
        return null;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log('[PWA] Subscribed to push notifications');
    }

    return subscription;
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error);
    return null;
  }
}

export async function unsubscribeFromPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('[PWA] Unsubscribed from push notifications');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[PWA] Push unsubscription failed:', error);
    return false;
  }
}

// Background Sync
export async function registerBackgroundSync(tag) {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.log('[PWA] Background Sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(tag);
    console.log('[PWA] Background sync registered:', tag);
    return true;
  } catch (error) {
    console.error('[PWA] Background sync registration failed:', error);
    return false;
  }
}

// Offline Message Queue
export async function queueOfflineMessage(message) {
  try {
    const db = await openOfflineDB();
    await addPendingMessage(db, message);
    console.log('[PWA] Message queued for offline sync');

    // Register background sync
    await registerBackgroundSync('sync-messages');

    return true;
  } catch (error) {
    console.error('[PWA] Failed to queue offline message:', error);
    return false;
  }
}

// IndexedDB for offline storage
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('dchat-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-messages')) {
        db.createObjectStore('pending-messages', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function addPendingMessage(db, message) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-messages'], 'readwrite');
    const store = transaction.objectStore('pending-messages');
    const request = store.add({
      ...message,
      timestamp: Date.now(),
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Network Status
export function isOnline() {
  return navigator.onLine;
}

export function setupNetworkListeners(onOnline, onOffline) {
  window.addEventListener('online', () => {
    console.log('[PWA] Connection restored');
    if (onOnline) onOnline();
  });

  window.addEventListener('offline', () => {
    console.log('[PWA] Connection lost');
    if (onOffline) onOffline();
  });
}

// Share API
export async function shareContent(data) {
  if (!navigator.share) {
    console.log('[PWA] Web Share API not supported');
    return false;
  }

  try {
    await navigator.share(data);
    console.log('[PWA] Content shared successfully');
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('[PWA] Share failed:', error);
    }
    return false;
  }
}

// Utility Functions
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Analytics
function trackPWAInstall() {
  // Track installation in analytics
  if (window.gtag) {
    window.gtag('event', 'pwa_install', {
      event_category: 'PWA',
      event_label: 'App Installed',
    });
  }
}

// Initialize PWA
export async function initializePWA() {
  console.log('[PWA] Initializing...');

  // Register service worker
  await registerServiceWorker();

  // Setup install prompt
  setupInstallPrompt();

  // Setup network listeners
  setupNetworkListeners(
    () => {
      console.log('[PWA] Back online');
      // Trigger background sync
      registerBackgroundSync('sync-messages');
    },
    () => {
      console.log('[PWA] Gone offline');
    }
  );

  console.log('[PWA] Initialized successfully');
}

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  setupInstallPrompt,
  showInstallPrompt,
  isInstallPromptAvailable,
  isAppInstalled,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  registerBackgroundSync,
  queueOfflineMessage,
  isOnline,
  setupNetworkListeners,
  shareContent,
  initializePWA,
};
