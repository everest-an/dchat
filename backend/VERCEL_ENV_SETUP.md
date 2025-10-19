# Vercel Environment Variables Setup

## Required Environment Variables

Please add the following environment variables in Vercel Dashboard:

**Project**: backend  
**URL**: https://vercel.com/everest-ans-projects/backend/settings/environment-variables

### Database Configuration

```
DB_HOST=gateway01.eu-central-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=3weSfx6NGnayDMr.root
DB_PASSWORD=1eHwbTda0idf7B3P
DB_NAME=test
```

### JWT Secret

```
JWT_SECRET=dchat_jwt_secret_2025_change_this_in_production_12345
```

### Email Service (Optional - for sending verification codes)

```
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### Frontend URL (for CORS)

```
FRONTEND_URL=https://dechat.com
```

### Node Environment

```
NODE_ENV=production
```

## Steps to Add Environment Variables

1. Go to https://vercel.com/everest-ans-projects/backend/settings/environment-variables
2. Click "Add New" button
3. Enter variable name (e.g., `DB_HOST`)
4. Enter variable value
5. Select environments: Production, Preview, Development (check all)
6. Click "Save"
7. Repeat for all variables above
8. Redeploy the project after adding all variables

## After Adding Variables

Run the following command to redeploy:

```bash
cd /home/ubuntu/dchat/backend
vercel deploy --prod --yes
```

## API Endpoints

Once deployed and configured, the following endpoints will be available:

- `POST /api/auth/send-code` - Send verification code (email/phone)
- `POST /api/auth/verify-login` - Verify code and login
- `POST /api/auth/wallet-login` - Login with Web3 wallet
- `POST /api/auth/alipay-login` - Login with Alipay
- `GET /api/auth/me` - Get current user info (requires auth token)
- `GET /health` - Health check endpoint

## Testing

Test the health endpoint:

```bash
curl https://backend-7gozyg02n-everest-ans-projects.vercel.app/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2025-10-19T...",
  "uptime": 123.456
}
```

