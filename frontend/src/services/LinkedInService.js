/**
 * LinkedIn Service
 * Frontend service for LinkedIn OAuth integration
 * Enhanced version with full OAuth 2.0 support
 */

class LinkedInService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    this.authWindow = null;
  }

  /**
   * Initiate LinkedIn OAuth flow
   * @returns {Promise<Object>} Authentication result
   */
  async initiateAuth() {
    try {
      // Get authorization URL from backend
      const response = await fetch(`${this.baseUrl}/api/auth/linkedin`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to initiate LinkedIn authentication');
      }

      // Open popup window for OAuth
      return this.openAuthPopup(data.authUrl, data.state);
    } catch (error) {
      console.error('Error initiating LinkedIn auth:', error);
      throw error;
    }
  }

  /**
   * Open OAuth popup window
   * @param {string} authUrl - Authorization URL
   * @param {string} state - State token
   * @returns {Promise<Object>} Authentication result
   */
  openAuthPopup(authUrl, state) {
    return new Promise((resolve, reject) => {
      // Calculate popup position
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      // Open popup
      this.authWindow = window.open(
        authUrl,
        'LinkedIn OAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
      );

      if (!this.authWindow) {
        reject(new Error('Failed to open popup window. Please allow popups for this site.'));
        return;
      }

      // Poll for popup close or message
      const pollTimer = setInterval(() => {
        try {
          if (this.authWindow.closed) {
            clearInterval(pollTimer);
            reject(new Error('Authentication window was closed'));
          }
        } catch (error) {
          // Ignore cross-origin errors
        }
      }, 500);

      // Listen for message from callback page
      const messageHandler = (event) => {
        // Verify origin
        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data.type === 'LINKEDIN_AUTH_SUCCESS') {
          clearInterval(pollTimer);
          window.removeEventListener('message', messageHandler);
          
          if (this.authWindow) {
            this.authWindow.close();
          }

          resolve({
            success: true,
            profile: event.data.profile
          });
        } else if (event.data.type === 'LINKEDIN_AUTH_ERROR') {
          clearInterval(pollTimer);
          window.removeEventListener('message', messageHandler);
          
          if (this.authWindow) {
            this.authWindow.close();
          }

          reject(new Error(event.data.error || 'Authentication failed'));
        }
      };

      window.addEventListener('message', messageHandler);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollTimer);
        window.removeEventListener('message', messageHandler);
        
        if (this.authWindow && !this.authWindow.closed) {
          this.authWindow.close();
        }

        reject(new Error('Authentication timeout'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Get LinkedIn profile
   * @returns {Promise<Object>} Profile data
   */
  async getProfile() {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/linkedin/profile`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get LinkedIn profile');
      }

      return data.profile;
    } catch (error) {
      console.error('Error getting LinkedIn profile:', error);
      throw error;
    }
  }

  /**
   * Get LinkedIn connections
   * @returns {Promise<Array>} Connections list
   */
  async getConnections() {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/linkedin/connections`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      if (!data.success) {
        if (data.requiresApproval) {
          throw new Error('LinkedIn Connections API requires partnership approval. Please contact LinkedIn.');
        }
        throw new Error(data.error || 'Failed to get LinkedIn connections');
      }

      return data.data.connections;
    } catch (error) {
      console.error('Error getting LinkedIn connections:', error);
      throw error;
    }
  }

  /**
   * Share content on LinkedIn
   * @param {string} text - Text content
   * @param {Object} media - Media object (optional)
   * @returns {Promise<Object>} Share result
   */
  async shareContent(text, media = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/linkedin/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ text, media })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to share on LinkedIn');
      }

      return data.data;
    } catch (error) {
      console.error('Error sharing on LinkedIn:', error);
      throw error;
    }
  }

  /**
   * Disconnect LinkedIn account
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/linkedin/disconnect`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to disconnect LinkedIn');
      }
    } catch (error) {
      console.error('Error disconnecting LinkedIn:', error);
      throw error;
    }
  }

  /**
   * Check LinkedIn connection status
   * @returns {Promise<Object>} Connection status
   */
  async getStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/linkedin/status`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting LinkedIn status:', error);
      return { connected: false };
    }
  }

  /**
   * Import connections to Dchat
   * @param {Array} connections - LinkedIn connections
   * @returns {Array} Imported contacts
   */
  importConnectionsToContacts(connections) {
    return connections.map(conn => ({
      id: `linkedin_${conn.id}`,
      name: `${conn.firstName} ${conn.lastName}`.trim(),
      firstName: conn.firstName,
      lastName: conn.lastName,
      headline: conn.headline,
      avatar: conn.profilePicture,
      source: 'linkedin',
      linkedinId: conn.id,
      importedAt: new Date().toISOString()
    }));
  }

  /**
   * Verify company email domain
   * @param {string} email - Company email
   * @returns {Object} Verification result
   */
  verifyCompanyEmail(email) {
    try {
      // Extract domain
      const domain = email.split('@')[1];
      
      if (!domain) {
        throw new Error('Invalid email address');
      }
      
      // Validate format
      const isValid = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain);
      
      return {
        valid: isValid,
        domain: domain,
        company: domain.split('.')[0] // Simplified company name extraction
      };
    } catch (error) {
      console.error('Error verifying company email:', error);
      throw error;
    }
  }
}

export default new LinkedInService();
