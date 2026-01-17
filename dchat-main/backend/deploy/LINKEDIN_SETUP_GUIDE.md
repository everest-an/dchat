# LinkedIn OAuth Integration Setup Guide

This guide will help you configure LinkedIn OAuth integration for Dchat.

---

## Prerequisites

- LinkedIn account
- Access to LinkedIn Developer Portal
- Dchat backend server running
- Domain name (for production) or localhost (for development)

---

## Step 1: Create LinkedIn App

### 1.1 Access Developer Portal

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Sign in with your LinkedIn account
3. Click "Create app" button

### 1.2 Fill App Information

**Required fields**:
- **App name**: Dchat (or your preferred name)
- **LinkedIn Page**: Your company LinkedIn page (or create one)
- **App logo**: Upload Dchat logo (at least 300x300 pixels)
- **Legal agreement**: Check the box to agree to LinkedIn API Terms of Use

Click "Create app" to continue.

### 1.3 Verify App

LinkedIn may require you to verify your app:
1. Check your email for verification link
2. Click the link to verify
3. Return to the app settings page

---

## Step 2: Configure OAuth Settings

### 2.1 Navigate to Auth Tab

1. In your app dashboard, click the "Auth" tab
2. You'll see OAuth 2.0 settings

### 2.2 Add Redirect URLs

Add the following redirect URLs based on your environment:

**Development**:
```
http://localhost:3000/auth/linkedin/callback
```

**Production**:
```
https://dchat.pro/auth/linkedin/callback
https://www.dchat.pro/auth/linkedin/callback
```

Click "Update" to save.

### 2.3 Note Your Credentials

Copy and save the following credentials (you'll need them later):
- **Client ID**: `xxxxxxxxxxxxxxxx`
- **Client Secret**: Click "Show" and copy the secret

⚠️ **Important**: Keep your Client Secret secure and never commit it to version control.

---

## Step 3: Request API Products

### 3.1 Navigate to Products Tab

1. Click the "Products" tab in your app dashboard
2. You'll see available API products

### 3.2 Request Required Products

Request access to the following products:

#### Sign In with LinkedIn using OpenID Connect (Required)
- **Purpose**: User authentication
- **Scopes**: `openid`, `profile`, `email`
- **Status**: Usually auto-approved

Click "Request access" and wait for approval (usually instant).

#### Share on LinkedIn (Optional)
- **Purpose**: Post content to LinkedIn
- **Scopes**: `w_member_social`
- **Status**: Usually auto-approved

Click "Request access" if you want sharing features.

#### Connections API (Advanced - Requires Partnership)
- **Purpose**: Access user's connections
- **Scopes**: `r_basicprofile`, `r_1st_connections_size`
- **Status**: Requires LinkedIn partnership approval

⚠️ **Note**: Connections API is restricted and requires special approval. Most apps won't need this.

---

## Step 4: Configure Environment Variables

### 4.1 Backend Configuration

Add the following environment variables to your backend `.env` file:

```bash
# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback

# For production
# LINKEDIN_REDIRECT_URI=https://dchat.pro/auth/linkedin/callback
```

### 4.2 Frontend Configuration

Add the following to your frontend `.env` file:

```bash
# API URL
REACT_APP_API_URL=http://localhost:5000

# For production
# REACT_APP_API_URL=https://api.dchat.pro
```

---

## Step 5: Update Backend Server

### 5.1 Install Dependencies

```bash
cd backend
npm install axios express-session
```

### 5.2 Add LinkedIn Routes

In your `backend/src/server.js`, add:

```javascript
const linkedInAuthRoutes = require('./routes/linkedin_auth');
const session = require('express-session');

// Session middleware (required for OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// LinkedIn OAuth routes
app.use('/api/auth', linkedInAuthRoutes);
```

### 5.3 Restart Backend Server

```bash
npm run dev
# or
node src/server.js
```

---

## Step 6: Test Integration

### 6.1 Access LinkedIn Integration Page

1. Start your frontend development server
2. Navigate to the LinkedIn integration page in your app
3. Click "Connect LinkedIn" button

### 6.2 Authorize App

1. You'll be redirected to LinkedIn authorization page
2. Review the permissions requested
3. Click "Allow" to authorize

### 6.3 Verify Connection

After authorization:
- You should be redirected back to your app
- Your LinkedIn profile should be displayed
- Connection status should show as "Connected"

---

## Step 7: Production Deployment

### 7.1 Update Redirect URLs

In LinkedIn app settings:
1. Add production redirect URL
2. Remove or keep development URL

### 7.2 Update Environment Variables

On your production server:

```bash
# Set production environment variables
export LINKEDIN_CLIENT_ID=your_client_id
export LINKEDIN_CLIENT_SECRET=your_client_secret
export LINKEDIN_REDIRECT_URI=https://dchat.pro/auth/linkedin/callback
export SESSION_SECRET=generate-a-strong-random-secret
```

### 7.3 Enable HTTPS

LinkedIn OAuth requires HTTPS in production:
1. Configure SSL certificate (Let's Encrypt recommended)
2. Update Nginx configuration to handle HTTPS
3. Ensure redirect URI uses `https://`

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI in your request doesn't match the configured URI in LinkedIn app.

**Solution**:
1. Check that `LINKEDIN_REDIRECT_URI` matches exactly with LinkedIn app settings
2. Ensure protocol (http/https) matches
3. Check for trailing slashes

### Error: "invalid_client"

**Cause**: Client ID or Client Secret is incorrect.

**Solution**:
1. Verify `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are correct
2. Check for extra spaces or hidden characters
3. Regenerate Client Secret if needed

### Error: "access_denied"

**Cause**: User denied authorization or app doesn't have required permissions.

**Solution**:
1. Ensure user clicks "Allow" on authorization page
2. Check that required API products are approved
3. Verify scopes in authorization request

### Popup Blocked

**Cause**: Browser blocked the OAuth popup window.

**Solution**:
1. Allow popups for your domain
2. Add site to popup exceptions in browser settings

### Session Not Persisting

**Cause**: Session middleware not configured or cookies not working.

**Solution**:
1. Verify `express-session` is installed and configured
2. Check cookie settings (secure, httpOnly, sameSite)
3. Ensure frontend sends credentials: `credentials: 'include'`

---

## API Scopes Reference

### Available Scopes

| Scope | Description | Required Product |
|-------|-------------|------------------|
| `openid` | OpenID Connect authentication | Sign In with LinkedIn |
| `profile` | Basic profile information | Sign In with LinkedIn |
| `email` | Email address | Sign In with LinkedIn |
| `w_member_social` | Share content on LinkedIn | Share on LinkedIn |
| `r_basicprofile` | Read basic profile | Connections API (restricted) |
| `r_1st_connections_size` | Read connections count | Connections API (restricted) |

### Requesting Scopes

In `linkedin_oauth_service.js`, scopes are configured in the constructor:

```javascript
this.scopes = [
  'openid',
  'profile',
  'email',
  'w_member_social'  // Add only if approved
];
```

---

## Security Best Practices

### 1. Protect Client Secret

- Never commit Client Secret to version control
- Use environment variables
- Rotate secrets periodically

### 2. Validate State Parameter

- Always verify state parameter in callback
- Use cryptographically random state values
- Implement CSRF protection

### 3. Secure Session Storage

- Use secure session storage (Redis in production)
- Set appropriate cookie flags (secure, httpOnly, sameSite)
- Implement session expiration

### 4. HTTPS Only

- Always use HTTPS in production
- Redirect HTTP to HTTPS
- Use HSTS headers

### 5. Token Management

- Store tokens securely (encrypted database)
- Implement token refresh logic
- Clear tokens on logout

---

## Rate Limits

LinkedIn API has rate limits:

- **User-level**: 500 requests per user per day
- **App-level**: Varies by product

**Best practices**:
- Implement caching
- Use batch requests when possible
- Handle rate limit errors gracefully

---

## Support

### LinkedIn Developer Support

- **Documentation**: https://docs.microsoft.com/en-us/linkedin/
- **Forum**: https://www.linkedin.com/developers/support
- **Status**: https://www.linkedin-apistatus.com/

### Dchat Support

- **GitHub Issues**: https://github.com/everest-an/dchat/issues
- **Documentation**: See project README.md

---

## Next Steps

After successful integration:

1. **Test all features**: Authentication, profile fetch, sharing
2. **Implement error handling**: Handle API errors gracefully
3. **Add analytics**: Track OAuth success/failure rates
4. **Monitor usage**: Watch for rate limit issues
5. **User feedback**: Collect feedback on integration UX

---

## Appendix: Quick Reference

### Environment Variables

```bash
# Required
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=

# Optional
SESSION_SECRET=
NODE_ENV=production
```

### API Endpoints

```
GET  /api/auth/linkedin                 - Initiate OAuth
GET  /api/auth/linkedin/callback        - OAuth callback
GET  /api/auth/linkedin/profile         - Get profile
GET  /api/auth/linkedin/connections     - Get connections
POST /api/auth/linkedin/share           - Share content
POST /api/auth/linkedin/disconnect      - Disconnect account
GET  /api/auth/linkedin/status          - Check status
```

### Frontend Routes

```
/auth/linkedin/callback                 - OAuth callback page
```

---

**Last Updated**: November 2, 2024  
**Version**: 1.0.0
