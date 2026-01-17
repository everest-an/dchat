/**
 * Push Notification Service
 * 
 * Handles push notifications using Firebase Cloud Messaging (FCM).
 * Manages device token registration, notification permissions, and delivery.
 * 
 * Author: Manus AI
 * Date: 2024-11-12
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

class PushNotificationService {
  constructor() {
    this.token = null
    this.permission = 'default'
    this.supported = 'Notification' in window && 'serviceWorker' in navigator
    this.initialized = false
  }

  /**
   * Initialize push notifications
   * Requests permission and registers service worker
   * @returns {Promise<boolean>}
   */
  async initialize() {
    if (this.initialized) {
      return true
    }

    if (!this.supported) {
      console.warn('Push notifications are not supported in this browser')
      return false
    }

    try {
      // Check current permission status
      this.permission = Notification.permission

      // If permission is default, request it
      if (this.permission === 'default') {
        this.permission = await Notification.requestPermission()
      }

      if (this.permission === 'granted') {
        // Register service worker
        await this.registerServiceWorker()
        
        // Get FCM token (simulated for now)
        await this.getToken()
        
        this.initialized = true
        console.log('Push notifications initialized successfully')
        return true
      } else {
        console.warn('Push notification permission denied')
        return false
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error)
      return false
    }
  }

  /**
   * Register service worker for push notifications
   * @returns {Promise<ServiceWorkerRegistration>}
   */
  async registerServiceWorker() {
    try {
      // Check if service worker is already registered
      const existingRegistration = await navigator.serviceWorker.getRegistration()
      
      if (existingRegistration) {
        console.log('Service worker already registered')
        return existingRegistration
      }

      // Register new service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service worker registered:', registration)
      return registration
    } catch (error) {
      console.error('Error registering service worker:', error)
      throw error
    }
  }

  /**
   * Get FCM token for this device
   * @returns {Promise<string|null>}
   */
  async getToken() {
    try {
      // For now, generate a simulated token
      // In production, this would use Firebase SDK to get real FCM token
      if (!this.token) {
        this.token = `web_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Register token with backend
        await this.registerToken(this.token)
      }

      return this.token
    } catch (error) {
      console.error('Error getting FCM token:', error)
      return null
    }
  }

  /**
   * Register device token with backend
   * @param {string} token - FCM device token
   * @returns {Promise<boolean>}
   */
  async registerToken(token) {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        console.warn('No auth token found')
        return false
      }

      const deviceInfo = this.getDeviceInfo()

      const response = await axios.post(
        `${API_BASE_URL}/api/push-notifications/register-token`,
        {
          token: token,
          device_type: deviceInfo.type,
          device_name: deviceInfo.name
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        console.log('Device token registered successfully')
        return true
      }

      return false
    } catch (error) {
      console.error('Error registering device token:', error)
      return false
    }
  }

  /**
   * Unregister device token from backend
   * @returns {Promise<boolean>}
   */
  async unregisterToken() {
    try {
      if (!this.token) {
        return true
      }

      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        return false
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/push-notifications/unregister-token`,
        {
          token: this.token
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        this.token = null
        console.log('Device token unregistered successfully')
        return true
      }

      return false
    } catch (error) {
      console.error('Error unregistering device token:', error)
      return false
    }
  }

  /**
   * Send a push notification to a user
   * @param {string} recipientId - Recipient user ID
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data
   * @returns {Promise<boolean>}
   */
  async sendNotification(recipientId, title, body, data = {}) {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        console.warn('No auth token found')
        return false
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/push-notifications/send`,
        {
          recipient_id: recipientId,
          title: title,
          body: body,
          data: data,
          priority: data.priority || 'normal'
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        console.log('Notification sent successfully')
        return true
      }

      return false
    } catch (error) {
      console.error('Error sending notification:', error)
      return false
    }
  }

  /**
   * Get notification preferences
   * @returns {Promise<Object>}
   */
  async getPreferences() {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        return this.getDefaultPreferences()
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/push-notifications/preferences`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      )

      if (response.data.success) {
        return response.data.preferences
      }

      return this.getDefaultPreferences()
    } catch (error) {
      console.error('Error getting notification preferences:', error)
      return this.getDefaultPreferences()
    }
  }

  /**
   * Update notification preferences
   * @param {Object} preferences - Notification preferences
   * @returns {Promise<boolean>}
   */
  async updatePreferences(preferences) {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        return false
      }

      const response = await axios.put(
        `${API_BASE_URL}/api/push-notifications/preferences`,
        preferences,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        console.log('Notification preferences updated')
        return true
      }

      return false
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return false
    }
  }

  /**
   * Send a test notification
   * @returns {Promise<boolean>}
   */
  async sendTestNotification() {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        console.warn('No auth token found')
        return false
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/push-notifications/test`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        console.log('Test notification sent')
        
        // Also show a local notification
        if (this.permission === 'granted') {
          this.showLocalNotification(
            'Dchat Test Notification',
            'This is a test notification from Dchat. Notifications are working!'
          )
        }
        
        return true
      }

      return false
    } catch (error) {
      console.error('Error sending test notification:', error)
      return false
    }
  }

  /**
   * Show a local notification (for testing or fallback)
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} options - Additional options
   */
  showLocalNotification(title, body, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted')
      return
    }

    try {
      const notification = new Notification(title, {
        body: body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/badge-72x72.png',
        tag: options.tag || 'dchat-notification',
        requireInteraction: options.requireInteraction || false,
        data: options.data || {}
      })

      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        notification.close()
        
        // Handle notification click
        if (options.onClick) {
          options.onClick(event)
        }
      }
    } catch (error) {
      console.error('Error showing local notification:', error)
    }
  }

  /**
   * Get device information
   * @returns {Object}
   */
  getDeviceInfo() {
    const userAgent = navigator.userAgent
    let deviceType = 'web'
    let deviceName = 'Unknown Browser'

    // Detect browser
    if (userAgent.includes('Chrome')) {
      deviceName = 'Chrome'
    } else if (userAgent.includes('Firefox')) {
      deviceName = 'Firefox'
    } else if (userAgent.includes('Safari')) {
      deviceName = 'Safari'
    } else if (userAgent.includes('Edge')) {
      deviceName = 'Edge'
    }

    // Detect OS
    if (userAgent.includes('Windows')) {
      deviceName += ' on Windows'
    } else if (userAgent.includes('Mac')) {
      deviceName += ' on MacOS'
    } else if (userAgent.includes('Linux')) {
      deviceName += ' on Linux'
    } else if (userAgent.includes('Android')) {
      deviceName += ' on Android'
      deviceType = 'android'
    } else if (userAgent.includes('iOS')) {
      deviceName += ' on iOS'
      deviceType = 'ios'
    }

    return {
      type: deviceType,
      name: deviceName
    }
  }

  /**
   * Get default notification preferences
   * @returns {Object}
   */
  getDefaultPreferences() {
    return {
      enabled: true,
      messages: true,
      mentions: true,
      calls: true,
      payments: true,
      group_messages: true,
      sound: true,
      vibration: true
    }
  }

  /**
   * Check if notifications are supported
   * @returns {boolean}
   */
  isSupported() {
    return this.supported
  }

  /**
   * Check if notifications are enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.permission === 'granted'
  }

  /**
   * Get current permission status
   * @returns {string}
   */
  getPermission() {
    return this.permission
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService()
export default pushNotificationService
