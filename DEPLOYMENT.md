# Dchat Deployment Guide

This guide covers various deployment options for the Dchat application.

## 🚀 Quick Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend)

#### Frontend Deployment on Vercel
1. Fork this repository
2. Connect your GitHub account to [Vercel](https://vercel.com)
3. Import the repository and set the root directory to `frontend`
4. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Deploy!

#### Backend Deployment on Railway
1. Connect your GitHub account to [Railway](https://railway.app)
2. Create a new project and connect your repository
3. Set the root directory to `backend`
4. Add environment variables:
   ```
   SECRET_KEY=your-secret-key-here
   PORT=5000
   ```
5. Deploy!

### Option 2: Netlify (Frontend) + Heroku (Backend)

#### Frontend on Netlify
1. Connect repository to [Netlify](https://netlify.com)
2. Set build directory to `frontend`
3. Build command: `npm run build`
4. Publish directory: `dist`

#### Backend on Heroku
1. Create a new app on [Heroku](https://heroku.com)
2. Connect your GitHub repository
3. Set the app to deploy from the `backend` folder
4. Add a `Procfile` in the backend directory:
   ```
   web: python main.py
   ```

### Option 3: Docker Deployment

#### Build Docker Images

Frontend Dockerfile (`frontend/Dockerfile`):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Backend Dockerfile (`backend/Dockerfile`):
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "main.py"]
```

Docker Compose (`docker-compose.yml`):
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
  
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - SECRET_KEY=your-secret-key-here
```

Run with: `docker-compose up -d`

## 🔧 Environment Configuration

### Frontend Environment Variables

Create `frontend/.env`:
```env
VITE_API_URL=https://your-backend-url.com
VITE_WALLET_CONNECT_PROJECT_ID=your-project-id
```

### Backend Environment Variables

Create `backend/.env`:
```env
SECRET_KEY=your-very-secure-secret-key
DATABASE_URL=sqlite:///dchat.db
CORS_ORIGINS=https://your-frontend-url.com,http://localhost:3000
JWT_SECRET_KEY=your-jwt-secret
```

## 🌐 Custom Domain Setup

### Frontend Domain
1. Add your custom domain in your hosting provider's dashboard
2. Update DNS records to point to your hosting service
3. Enable HTTPS/SSL certificates

### Backend Domain
1. Configure your backend hosting service with your custom domain
2. Update CORS settings to include your frontend domain
3. Update frontend environment variables with new backend URL

## 📊 Monitoring & Analytics

### Recommended Tools
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics or Mixpanel
- **Uptime Monitoring**: UptimeRobot
- **Performance**: New Relic or DataDog

### Setup Instructions
1. Create accounts with your chosen services
2. Add tracking codes to your frontend
3. Configure backend monitoring
4. Set up alerts for downtime or errors

## 🔒 Security Considerations

### SSL/HTTPS
- Always use HTTPS in production
- Configure proper SSL certificates
- Enable HSTS headers

### Environment Security
- Never commit `.env` files
- Use secure secret generation
- Rotate secrets regularly
- Use environment-specific configurations

### Database Security
- Use strong database passwords
- Enable database encryption
- Regular backups
- Access control and monitoring

## 🚀 Performance Optimization

### Frontend Optimization
- Enable gzip compression
- Use CDN for static assets
- Implement lazy loading
- Optimize images and assets

### Backend Optimization
- Use database connection pooling
- Implement caching (Redis)
- Enable API rate limiting
- Monitor and optimize database queries

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancers
- Implement session storage (Redis)
- Database read replicas
- CDN for global distribution

### Vertical Scaling
- Monitor resource usage
- Upgrade server specifications as needed
- Optimize application performance
- Database optimization

## 🔄 CI/CD Pipeline

### GitHub Actions Example

`.github/workflows/deploy.yml`:
```yaml
name: Deploy Dchat
on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install and Build
        run: |
          cd frontend
          npm install
          npm run build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./frontend

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@v1.0.0
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: dchat-backend
```

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check backend CORS configuration
   - Verify frontend URL in CORS origins

2. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed

3. **Database Connection Issues**
   - Verify database URL format
   - Check network connectivity
   - Ensure database server is running

4. **Authentication Issues**
   - Verify JWT secret configuration
   - Check token expiration settings
   - Ensure secure cookie settings

### Getting Help

- Check the [GitHub Issues](https://github.com/everest-an/dchat/issues)
- Review application logs
- Test locally before deploying
- Use browser developer tools for debugging

---

For more detailed deployment assistance, please open an issue in the GitHub repository.

