# Frontend Deployment Guide

This guide explains how to deploy the dchat.pro frontend to production.

---

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the recommended platform for deploying the frontend because:
- Automatic deployments from GitHub
- Built-in CDN and edge caching
- Zero-config SSL certificates
- Preview deployments for pull requests
- Excellent performance
- Free tier available

### Option 2: Netlify

Netlify is a good alternative with similar features:
- Automatic deployments from GitHub
- Built-in CDN
- Free SSL certificates
- Preview deployments
- Free tier available

### Option 3: AWS CloudFront + S3

For full control and integration with existing AWS infrastructure:
- Host static files on S3
- Distribute via CloudFront CDN
- More configuration required
- Pay-as-you-go pricing

---

## Vercel Deployment

### Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository** - Code must be in GitHub
3. **Environment Variables** - Prepare API keys and configuration

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Link Project

```bash
cd frontend
vercel link
```

Follow the prompts:
- Set up and deploy: Yes
- Which scope: Your account or team
- Link to existing project: No (first time) or Yes (if exists)
- Project name: dchat
- Directory: ./

### Step 4: Configure Environment Variables

#### Via Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add the following variables:

**Production Environment**:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_API_URL` | `https://api.dchat.pro` | Production |
| `VITE_SOCKET_URL` | `https://api.dchat.pro` | Production |
| `VITE_PINATA_GATEWAY` | `https://gateway.pinata.cloud` | Production |
| `VITE_PINATA_JWT` | `your_pinata_jwt` | Production |
| `VITE_ALCHEMY_API_KEY` | `your_alchemy_key` | Production |
| `VITE_ETHERSCAN_API_KEY` | `your_etherscan_key` | Production |
| `VITE_CHAIN_ID` | `11155111` | Production |
| `VITE_NETWORK_NAME` | `sepolia` | Production |

**Staging Environment** (optional):

Same variables but with staging values:
- `VITE_API_URL` = `https://staging-api.dchat.pro`
- etc.

#### Via Vercel CLI

```bash
# Add production environment variable
vercel env add VITE_API_URL production
# Enter value: https://api.dchat.pro

# Add to all environments
vercel env add VITE_PINATA_GATEWAY
# Select: Production, Preview, Development
# Enter value: https://gateway.pinata.cloud
```

### Step 5: Deploy to Production

#### Manual Deployment

```bash
cd frontend
vercel --prod
```

This will:
1. Build the application
2. Upload to Vercel
3. Deploy to production
4. Return the deployment URL

#### Automatic Deployment (Recommended)

Set up automatic deployments:

1. Go to Vercel Dashboard → Project Settings → Git
2. Connect your GitHub repository
3. Configure:
   - Production Branch: `main`
   - Preview Branches: `develop`, `feature/*`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install --legacy-peer-deps`

Now every push to `main` will automatically deploy to production!

### Step 6: Configure Custom Domain

1. Go to Vercel Dashboard → Project Settings → Domains
2. Add your domain: `dchat.pro`
3. Add www subdomain: `www.dchat.pro`
4. Follow DNS configuration instructions:

**For dchat.pro**:
- Type: A
- Name: @
- Value: 76.76.21.21

**For www.dchat.pro**:
- Type: CNAME
- Name: www
- Value: cname.vercel-dns.com

5. Wait for DNS propagation (can take up to 48 hours, usually much faster)
6. Vercel will automatically provision SSL certificates

### Step 7: Verify Deployment

1. Visit https://dchat.pro
2. Check that the site loads correctly
3. Test wallet connection
4. Test API connectivity
5. Check browser console for errors

---

## Netlify Deployment

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify

```bash
netlify login
```

### Step 3: Initialize Site

```bash
cd frontend
netlify init
```

Follow the prompts:
- Create & configure a new site
- Team: Your team
- Site name: dchat
- Build command: `npm run build`
- Directory to deploy: `dist`

### Step 4: Configure Environment Variables

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

Add environment variables via Netlify Dashboard:
1. Go to Site settings → Build & deploy → Environment
2. Add the same variables as Vercel

### Step 5: Deploy

```bash
netlify deploy --prod
```

---

## AWS CloudFront + S3 Deployment

### Step 1: Create S3 Bucket

```bash
aws s3 mb s3://dchat-frontend --region us-east-1
```

### Step 2: Configure S3 for Static Website Hosting

```bash
aws s3 website s3://dchat-frontend \
  --index-document index.html \
  --error-document index.html
```

### Step 3: Build Application

```bash
cd frontend
npm run build
```

### Step 4: Upload to S3

```bash
aws s3 sync dist/ s3://dchat-frontend \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.map"

# Upload index.html with no cache
aws s3 cp dist/index.html s3://dchat-frontend/index.html \
  --cache-control "no-cache, no-store, must-revalidate"
```

### Step 5: Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
  --origin-domain-name dchat-frontend.s3.amazonaws.com \
  --default-root-object index.html
```

### Step 6: Configure Custom Domain

1. Request SSL certificate in ACM (us-east-1)
2. Add domain to CloudFront distribution
3. Update Route 53 DNS records

---

## Environment-Specific Configuration

### Development

```bash
# .env.development
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### Staging

```bash
# .env.staging
VITE_API_URL=https://staging-api.dchat.pro
VITE_SOCKET_URL=https://staging-api.dchat.pro
```

### Production

```bash
# .env.production
VITE_API_URL=https://api.dchat.pro
VITE_SOCKET_URL=https://api.dchat.pro
```

---

## Build Optimization

### 1. Code Splitting

Vite automatically splits code by route. No configuration needed.

### 2. Image Optimization

Use WebP format for images:

```bash
# Install imagemin
npm install -D vite-plugin-imagemin

# Add to vite.config.js
import viteImagemin from 'vite-plugin-imagemin'

export default {
  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      webp: { quality: 80 }
    })
  ]
}
```

### 3. Bundle Analysis

```bash
# Install plugin
npm install -D rollup-plugin-visualizer

# Add to vite.config.js
import { visualizer } from 'rollup-plugin-visualizer'

export default {
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ]
}
```

### 4. Compression

Vercel and Netlify automatically compress assets with Brotli and Gzip.

For AWS, enable compression in CloudFront:
- Automatic compression: Yes
- Supported compression formats: Brotli, Gzip

---

## Performance Monitoring

### 1. Lighthouse CI

Already configured in `.github/workflows/frontend-ci.yml`.

Run locally:

```bash
npm install -g @lhci/cli
lhci autorun
```

### 2. Web Vitals

Add to `src/main.jsx`:

```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

function sendToAnalytics(metric) {
  console.log(metric)
  // Send to your analytics service
}

getCLS(sendToAnalytics)
getFID(sendToAnalytics)
getFCP(sendToAnalytics)
getLCP(sendToAnalytics)
getTTFB(sendToAnalytics)
```

### 3. Vercel Analytics

Enable in Vercel Dashboard → Project → Analytics.

Provides:
- Page views
- Unique visitors
- Top pages
- Top referrers
- Real User Monitoring (RUM)
- Web Vitals

---

## Rollback Procedure

### Vercel

1. Go to Vercel Dashboard → Deployments
2. Find the previous successful deployment
3. Click "..." → "Promote to Production"

Or via CLI:

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### Netlify

1. Go to Netlify Dashboard → Deploys
2. Find the previous deployment
3. Click "Publish deploy"

### AWS

```bash
# Restore from S3 versioning
aws s3api list-object-versions \
  --bucket dchat-frontend \
  --prefix index.html

aws s3api get-object \
  --bucket dchat-frontend \
  --key index.html \
  --version-id [version-id] \
  index.html

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id [distribution-id] \
  --paths "/*"
```

---

## Troubleshooting

### Build Fails

**Issue**: `npm run build` fails

**Solutions**:
1. Check Node.js version: `node --version` (should be 18.x or 20.x)
2. Clear cache: `rm -rf node_modules package-lock.json && npm install`
3. Check for TypeScript errors: `npm run type-check`
4. Check environment variables are set

### Blank Page After Deployment

**Issue**: Site shows blank page

**Solutions**:
1. Check browser console for errors
2. Verify API URL is correct
3. Check CORS configuration on backend
4. Verify all environment variables are set
5. Check network tab for failed requests

### Slow Loading

**Issue**: Site loads slowly

**Solutions**:
1. Run Lighthouse audit
2. Check bundle size: `npm run build -- --report`
3. Optimize images
4. Enable code splitting
5. Use CDN for static assets

### SSL Certificate Issues

**Issue**: SSL certificate not working

**Solutions**:
1. Wait for DNS propagation (up to 48 hours)
2. Verify DNS records are correct
3. Check certificate status in Vercel/Netlify dashboard
4. Try clearing browser cache

---

## Security Checklist

Before deploying to production:

- [ ] All API keys are in environment variables (not hardcoded)
- [ ] HTTPS is enabled
- [ ] Security headers are configured
- [ ] CORS is properly configured
- [ ] Content Security Policy (CSP) is set
- [ ] Dependencies are up to date (`npm audit`)
- [ ] No console.log statements in production code
- [ ] Error messages don't expose sensitive information
- [ ] Rate limiting is enabled on backend

---

## Post-Deployment Checklist

After deploying:

- [ ] Site loads correctly
- [ ] All pages are accessible
- [ ] Wallet connection works
- [ ] API calls succeed
- [ ] Images load correctly
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Performance score > 80 (Lighthouse)
- [ ] Accessibility score > 90 (Lighthouse)
- [ ] SEO score > 90 (Lighthouse)

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Vite Documentation](https://vitejs.dev)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

**Last Updated**: 2024-11-05  
**Author**: Manus AI  
**Version**: 1.0
