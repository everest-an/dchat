/**
 * LinkedIn OAuth Service
 * Handles LinkedIn OAuth 2.0 authentication flow
 */

const axios = require('axios');
const crypto = require('crypto');

class LinkedInOAuthService {
  constructor() {
    // LinkedIn OAuth endpoints
    this.AUTHORIZATION_URL = 'https://www.linkedin.com/oauth/v2/authorization';
    this.TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
    this.USER_INFO_URL = 'https://api.linkedin.com/v2/userinfo';
    this.PROFILE_URL = 'https://api.linkedin.com/v2/me';
    this.EMAIL_URL = 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))';
    this.CONNECTIONS_URL = 'https://api.linkedin.com/v2/connections';

    // Configuration from environment variables
    this.clientId = process.env.LINKEDIN_CLIENT_ID || '';
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
    this.redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/auth/linkedin/callback';

    // Scopes required
    this.scopes = [
      'openid',
      'profile',
      'email',
      'w_member_social'
    ];

    // Store state tokens (in production, use Redis)
    this.stateStore = new Map();
  }

  /**
   * Generate authorization URL for LinkedIn OAuth
   * @returns {Object} Authorization URL and state token
   */
  getAuthorizationUrl() {
    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state with timestamp (expires in 10 minutes)
    this.stateStore.set(state, {
      timestamp: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Clean up expired states
    this.cleanExpiredStates();

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state,
      scope: this.scopes.join(' ')
    });

    const authUrl = `${this.AUTHORIZATION_URL}?${params.toString()}`;

    return {
      authUrl,
      state
    };
  }

  /**
   * Verify state token
   * @param {string} state - State token to verify
   * @returns {boolean} True if valid
   */
  verifyState(state) {
    const stateData = this.stateStore.get(state);
    
    if (!stateData) {
      return false;
    }

    // Check if expired
    if (Date.now() > stateData.expiresAt) {
      this.stateStore.delete(state);
      return false;
    }

    // Delete after verification (one-time use)
    this.stateStore.delete(state);
    return true;
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code
   * @returns {Promise<Object>} Token data
   */
  async exchangeCodeForToken(code) {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri
      });

      const response = await axios.post(this.TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        success: true,
        data: {
          accessToken: response.data.access_token,
          expiresIn: response.data.expires_in,
          refreshToken: response.data.refresh_token,
          scope: response.data.scope,
          tokenType: response.data.token_type
        }
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error_description || 'Failed to exchange code for token'
      };
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New token data
   */
  async refreshAccessToken(refreshToken) {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      const response = await axios.post(this.TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        success: true,
        data: {
          accessToken: response.data.access_token,
          expiresIn: response.data.expires_in,
          refreshToken: response.data.refresh_token,
          scope: response.data.scope,
          tokenType: response.data.token_type
        }
      };
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error_description || 'Failed to refresh token'
      };
    }
  }

  /**
   * Get user profile information
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile(accessToken) {
    try {
      // Get basic profile
      const profileResponse = await axios.get(this.USER_INFO_URL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const profile = profileResponse.data;

      return {
        success: true,
        data: {
          id: profile.sub,
          firstName: profile.given_name,
          lastName: profile.family_name,
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
          locale: profile.locale,
          emailVerified: profile.email_verified
        }
      };
    } catch (error) {
      console.error('Error getting user profile:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get user profile'
      };
    }
  }

  /**
   * Get user's LinkedIn connections
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} Connections data
   */
  async getConnections(accessToken) {
    try {
      const response = await axios.get(this.CONNECTIONS_URL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        },
        params: {
          q: 'viewer',
          start: 0,
          count: 100
        }
      });

      const connections = response.data.elements || [];

      return {
        success: true,
        data: {
          total: response.data.paging?.total || connections.length,
          connections: connections.map(conn => ({
            id: conn.id,
            firstName: conn.firstName?.localized?.en_US || '',
            lastName: conn.lastName?.localized?.en_US || '',
            headline: conn.headline?.localized?.en_US || '',
            profilePicture: conn.profilePicture?.displayImage || null
          }))
        }
      };
    } catch (error) {
      console.error('Error getting connections:', error.response?.data || error.message);
      
      // Note: Connections API requires special partnership approval
      if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Connections API requires LinkedIn partnership approval',
          requiresApproval: true
        };
      }

      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get connections'
      };
    }
  }

  /**
   * Share content on LinkedIn
   * @param {string} accessToken - Access token
   * @param {Object} content - Content to share
   * @returns {Promise<Object>} Share result
   */
  async shareContent(accessToken, content) {
    try {
      const shareData = {
        author: `urn:li:person:${content.authorId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.text
            },
            shareMediaCategory: content.media ? 'IMAGE' : 'NONE',
            ...(content.media && {
              media: [{
                status: 'READY',
                description: {
                  text: content.media.description || ''
                },
                media: content.media.url,
                title: {
                  text: content.media.title || ''
                }
              }]
            })
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        shareData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return {
        success: true,
        data: {
          id: response.data.id,
          url: `https://www.linkedin.com/feed/update/${response.data.id}`
        }
      };
    } catch (error) {
      console.error('Error sharing content:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to share content'
      };
    }
  }

  /**
   * Clean up expired state tokens
   * @private
   */
  cleanExpiredStates() {
    const now = Date.now();
    for (const [state, data] of this.stateStore.entries()) {
      if (now > data.expiresAt) {
        this.stateStore.delete(state);
      }
    }
  }

  /**
   * Validate configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    const errors = [];

    if (!this.clientId) {
      errors.push('LINKEDIN_CLIENT_ID is not configured');
    }

    if (!this.clientSecret) {
      errors.push('LINKEDIN_CLIENT_SECRET is not configured');
    }

    if (!this.redirectUri) {
      errors.push('LINKEDIN_REDIRECT_URI is not configured');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = LinkedInOAuthService;
