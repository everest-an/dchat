# Deployment Guide

This document explains how to deploy the dchat backend to Vercel.

## Prerequisites

1. **Vercel Account**: Create an account at [vercel.com](https://vercel.com)
2. **GitHub Account**: Your code must be pushed to GitHub
3. **Vercel Token**: Generate a token from Vercel settings
4. **Organization ID**: Get your Vercel organization ID
5. **Project ID**: Get your Vercel project ID

## Setup Instructions

### Step 1: Get Vercel Credentials

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Tokens**
3. Create a new token and copy it (this is your `VERCEL_TOKEN`)
4. Get your **Organization ID** from **Settings** → **General**
5. Get your **Project ID** from your project settings

### Step 2: Set Environment Variables

Set the following environment variables in your system or CI/CD platform:

```bash
export VERCEL_TOKEN="your_vercel_token_here"
export VERCEL_ORG_ID="your_org_id_here"
export VERCEL_PROJECT_ID="your_project_id_here"
export GITHUB_TOKEN="your_github_token_here"  # Optional, for GitHub Actions
```

### Step 3: Configure GitHub Actions (Recommended)

GitHub Actions will automatically deploy your code when you push to the `vercel-beta` or `main` branch.

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

The workflow file is already configured at `.github/workflows/deploy.yml`.

### Step 4: Deploy

#### Option A: Automatic Deployment (Recommended)

Simply push your code to the `vercel-beta` or `main` branch:

```bash
git push origin vercel-beta
```

GitHub Actions will automatically trigger the deployment.

#### Option B: Manual Deployment via Script

Use the provided Python script to manually trigger a deployment:

```bash
# Preview deployment
python3 scripts/trigger_deployment.py preview

# Production deployment
python3 scripts/trigger_deployment.py production
```

Or use the Bash script:

```bash
# Preview deployment
bash scripts/trigger_deployment.sh preview

# Production deployment
bash scripts/trigger_deployment.sh production
```

#### Option C: Manual Deployment via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod  # For production
vercel         # For preview
```

## Deployment Branches

- **`vercel-beta`**: Preview deployments (for testing)
- **`main`**: Production deployments (for live)

## Monitoring Deployments

### Via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Deployments** tab
4. View deployment status and logs

### Via GitHub Actions

1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. View workflow runs and deployment logs

## Troubleshooting

### Deployment Fails with "FUNCTION_INVOCATION_FAILED"

This usually means there's a Python syntax error or missing dependency.

**Solution:**
1. Check the deployment logs in Vercel
2. Fix any syntax errors in the Python files
3. Ensure all dependencies are listed in `requirements.txt`
4. Re-deploy

### Deployment Fails with Authentication Error

This means the Vercel Token is invalid or expired.

**Solution:**
1. Generate a new Vercel Token
2. Update the environment variable
3. Re-deploy

### Deployment Fails with "Module Not Found"

This means a required Python module is missing.

**Solution:**
1. Add the module to `requirements.txt`
2. Run `pip install -r requirements.txt` locally to verify
3. Commit and push the changes
4. Re-deploy

## Environment Variables

Set these environment variables in Vercel project settings:

```
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
POLKADOT_NODE_URL=wss://rpc.polkadot.io
CORS_ORIGINS=*
```

## Performance Optimization

1. **Use serverless functions**: Vercel automatically scales your API
2. **Optimize database queries**: Use indexes and connection pooling
3. **Cache responses**: Use Redis or Vercel's built-in caching
4. **Monitor performance**: Use Vercel Analytics

## Security Best Practices

1. **Never commit secrets**: Use environment variables
2. **Use HTTPS**: Vercel provides free SSL/TLS
3. **Enable authentication**: Protect sensitive endpoints
4. **Rate limiting**: Implement rate limiting for APIs
5. **Input validation**: Validate all user inputs

## Support

For issues or questions:

1. Check Vercel documentation: https://vercel.com/docs
2. Check GitHub Actions documentation: https://docs.github.com/en/actions
3. Contact Vercel support: https://vercel.com/support
