/**
 * LinkedIn OAuth Routes
 * Express routes for LinkedIn authentication
 */

const express = require('express');
const router = express.Router();
const LinkedInOAuthService = require('../linkedin_oauth_service');

const linkedInService = new LinkedInOAuthService();

/**
 * GET /api/auth/linkedin
 * Initiate LinkedIn OAuth flow
 */
router.get('/linkedin', (req, res) => {
  try {
    // Validate configuration
    const configValidation = linkedInService.validateConfig();
    if (!configValidation.valid) {
      return res.status(500).json({
        success: false,
        error: 'LinkedIn OAuth is not properly configured',
        details: configValidation.errors
      });
    }

    // Generate authorization URL
    const { authUrl, state } = linkedInService.getAuthorizationUrl();

    // Store state in session (optional, for additional security)
    req.session = req.session || {};
    req.session.linkedinOAuthState = state;

    res.json({
      success: true,
      authUrl,
      state
    });
  } catch (error) {
    console.error('Error initiating LinkedIn OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate LinkedIn authentication'
    });
  }
});

/**
 * GET /api/auth/linkedin/callback
 * Handle LinkedIn OAuth callback
 */
router.get('/linkedin/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      return res.redirect(
        `/auth/linkedin/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(error_description || '')}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return res.redirect('/auth/linkedin/error?error=invalid_request');
    }

    // Verify state token (CSRF protection)
    if (!linkedInService.verifyState(state)) {
      return res.redirect('/auth/linkedin/error?error=invalid_state');
    }

    // Exchange code for access token
    const tokenResult = await linkedInService.exchangeCodeForToken(code);
    
    if (!tokenResult.success) {
      return res.redirect(
        `/auth/linkedin/error?error=token_exchange_failed&description=${encodeURIComponent(tokenResult.error)}`
      );
    }

    // Get user profile
    const profileResult = await linkedInService.getUserProfile(tokenResult.data.accessToken);
    
    if (!profileResult.success) {
      return res.redirect(
        `/auth/linkedin/error?error=profile_fetch_failed&description=${encodeURIComponent(profileResult.error)}`
      );
    }

    // Store tokens and profile in session/database
    // In production, save to database associated with user account
    req.session = req.session || {};
    req.session.linkedinAuth = {
      accessToken: tokenResult.data.accessToken,
      refreshToken: tokenResult.data.refreshToken,
      expiresAt: Date.now() + (tokenResult.data.expiresIn * 1000),
      profile: profileResult.data
    };

    // Redirect to success page
    res.redirect('/auth/linkedin/success');
  } catch (error) {
    console.error('Error in LinkedIn callback:', error);
    res.redirect('/auth/linkedin/error?error=internal_error');
  }
});

/**
 * GET /api/auth/linkedin/profile
 * Get current LinkedIn profile
 */
router.get('/linkedin/profile', async (req, res) => {
  try {
    const session = req.session?.linkedinAuth;

    if (!session || !session.accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with LinkedIn'
      });
    }

    // Check if token is expired
    if (Date.now() >= session.expiresAt) {
      // Try to refresh token
      if (session.refreshToken) {
        const refreshResult = await linkedInService.refreshAccessToken(session.refreshToken);
        
        if (refreshResult.success) {
          // Update session with new token
          req.session.linkedinAuth.accessToken = refreshResult.data.accessToken;
          req.session.linkedinAuth.refreshToken = refreshResult.data.refreshToken;
          req.session.linkedinAuth.expiresAt = Date.now() + (refreshResult.data.expiresIn * 1000);
        } else {
          return res.status(401).json({
            success: false,
            error: 'Token expired and refresh failed',
            requiresReauth: true
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          requiresReauth: true
        });
      }
    }

    // Return cached profile
    res.json({
      success: true,
      profile: session.profile
    });
  } catch (error) {
    console.error('Error getting LinkedIn profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get LinkedIn profile'
    });
  }
});

/**
 * GET /api/auth/linkedin/connections
 * Get LinkedIn connections
 */
router.get('/linkedin/connections', async (req, res) => {
  try {
    const session = req.session?.linkedinAuth;

    if (!session || !session.accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with LinkedIn'
      });
    }

    // Get connections
    const connectionsResult = await linkedInService.getConnections(session.accessToken);

    if (!connectionsResult.success) {
      return res.status(connectionsResult.requiresApproval ? 403 : 500).json(connectionsResult);
    }

    res.json(connectionsResult);
  } catch (error) {
    console.error('Error getting LinkedIn connections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get LinkedIn connections'
    });
  }
});

/**
 * POST /api/auth/linkedin/share
 * Share content on LinkedIn
 */
router.post('/linkedin/share', async (req, res) => {
  try {
    const session = req.session?.linkedinAuth;

    if (!session || !session.accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with LinkedIn'
      });
    }

    const { text, media } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required'
      });
    }

    // Share content
    const shareResult = await linkedInService.shareContent(session.accessToken, {
      authorId: session.profile.id,
      text,
      media
    });

    res.json(shareResult);
  } catch (error) {
    console.error('Error sharing on LinkedIn:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share content on LinkedIn'
    });
  }
});

/**
 * POST /api/auth/linkedin/disconnect
 * Disconnect LinkedIn account
 */
router.post('/linkedin/disconnect', (req, res) => {
  try {
    // Clear LinkedIn session data
    if (req.session?.linkedinAuth) {
      delete req.session.linkedinAuth;
    }

    res.json({
      success: true,
      message: 'LinkedIn account disconnected'
    });
  } catch (error) {
    console.error('Error disconnecting LinkedIn:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect LinkedIn account'
    });
  }
});

/**
 * GET /api/auth/linkedin/status
 * Check LinkedIn connection status
 */
router.get('/linkedin/status', (req, res) => {
  const session = req.session?.linkedinAuth;

  if (!session || !session.accessToken) {
    return res.json({
      connected: false
    });
  }

  // Check if token is expired
  const isExpired = Date.now() >= session.expiresAt;

  res.json({
    connected: !isExpired,
    profile: isExpired ? null : {
      name: session.profile.name,
      email: session.profile.email,
      picture: session.profile.picture
    },
    expiresAt: session.expiresAt,
    requiresRefresh: isExpired && !!session.refreshToken
  });
});

module.exports = router;
