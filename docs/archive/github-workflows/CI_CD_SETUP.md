# CI/CD Setup Guide

This document explains how to set up continuous integration and deployment for dchat.pro.

---

## Overview

The CI/CD pipeline consists of two main workflows:

1. **Backend CI/CD** (`backend-ci.yml`) - Tests, builds, and deploys the Python backend
2. **Frontend CI/CD** (`frontend-ci.yml`) - Tests, builds, and deploys the React frontend

Both workflows run automatically on push and pull requests.

---

## Prerequisites

### Required Accounts

1. **GitHub** - Source code repository
2. **Docker Hub** - Container registry for backend images
3. **Vercel** - Frontend hosting (or Netlify as alternative)
4. **AWS** - Backend hosting (EC2/ECS)
5. **Codecov** (optional) - Code coverage reporting
6. **Snyk** (optional) - Security scanning

### Required Secrets

Configure these secrets in GitHub Settings → Secrets and variables → Actions:

#### Backend Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `DOCKER_USERNAME` | Docker Hub username | Your Docker Hub account |
| `DOCKER_PASSWORD` | Docker Hub password/token | Docker Hub → Account Settings → Security |
| `AWS_ACCESS_KEY_ID` | AWS access key | AWS IAM → Users → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | AWS IAM → Users → Security credentials |

#### Frontend Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `VERCEL_TOKEN` | Vercel API token | Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel organization ID | Vercel → Settings → General |
| `VERCEL_PROJECT_ID` | Vercel project ID | Vercel → Project Settings → General |

#### Optional Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `CODECOV_TOKEN` | Codecov upload token | Codecov.io → Repository Settings |
| `SNYK_TOKEN` | Snyk API token | Snyk → Account Settings → API Token |

---

## Backend CI/CD Pipeline

### Workflow Stages

```
┌─────────────┐
│   Push to   │
│   GitHub    │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌────────────┐  ┌──────────────┐
│    Test    │  │   Security   │
│   Backend  │  │     Scan     │
└──────┬─────┘  └──────────────┘
       │
       ▼
┌────────────┐
│   Build    │
│   Docker   │
│   Image    │
└──────┬─────┘
       │
       ├──────────────┬──────────────┐
       │              │              │
       ▼              ▼              ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│   Deploy   │  │   Deploy   │  │   Deploy   │
│     to     │  │     to     │  │     to     │
│  Staging   │  │ Production │  │   Review   │
└────────────┘  └────────────┘  └────────────┘
```

### Test Stage

**What it does**:
- Runs unit tests with pytest
- Generates code coverage report
- Uploads coverage to Codecov
- Runs linting with flake8

**Triggers**:
- Every push to any branch
- Every pull request

**Requirements**:
- Python 3.11
- Redis service (for integration tests)
- All dependencies in `requirements.txt`

### Security Scan Stage

**What it does**:
- Runs Bandit for Python security issues
- Runs Safety to check for known vulnerabilities
- Generates security reports

**Triggers**:
- Every push to any branch
- Every pull request

### Build Stage

**What it does**:
- Builds Docker image
- Pushes to Docker Hub
- Tags with branch name and commit SHA

**Triggers**:
- Push to `main` or `develop` branch
- Only after tests pass

**Docker Image Tags**:
- `latest` - Latest main branch
- `develop` - Latest develop branch
- `main-<sha>` - Specific commit on main
- `develop-<sha>` - Specific commit on develop

### Deploy Stages

**Staging Deployment**:
- Triggers on push to `develop` branch
- Deploys to `staging-api.dchat.pro`
- Runs smoke tests

**Production Deployment**:
- Triggers on push to `main` branch
- Deploys to `api.dchat.pro`
- Runs comprehensive smoke tests
- Requires manual approval (configured in GitHub Environments)

---

## Frontend CI/CD Pipeline

### Workflow Stages

```
┌─────────────┐
│   Push to   │
│   GitHub    │
└──────┬──────┘
       │
       ├──────────────┬──────────────┐
       │              │              │
       ▼              ▼              ▼
┌────────────┐  ┌──────────────┐  ┌────────────┐
│    Test    │  │  Lighthouse  │  │  Security  │
│  Frontend  │  │    Audit     │  │    Scan    │
└──────┬─────┘  └──────────────┘  └────────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
       ▼              ▼              ▼              ▼
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│   Deploy   │  │   Deploy   │  │   Deploy   │  │   Deploy   │
│     to     │  │     to     │  │     to     │  │     to     │
│  Preview   │  │  Staging   │  │ Production │  │   Vercel   │
└────────────┘  └────────────┘  └────────────┘  └────────────┘
```

### Test Stage

**What it does**:
- Installs dependencies with npm
- Runs linting (ESLint)
- Runs type checking (TypeScript)
- Runs unit tests (if configured)
- Builds the application
- Tests on multiple Node.js versions (18.x, 20.x)

**Triggers**:
- Every push to any branch
- Every pull request

### Lighthouse Audit

**What it does**:
- Builds the application
- Runs Lighthouse performance audit
- Checks performance, accessibility, best practices, SEO
- Uploads results as artifacts

**Triggers**:
- Every push to any branch
- Every pull request

**Metrics Checked**:
- Performance score
- Accessibility score
- Best practices score
- SEO score
- First Contentful Paint (FCP)
- Time to Interactive (TTI)
- Cumulative Layout Shift (CLS)

### Security Scan

**What it does**:
- Runs `npm audit` to check for vulnerabilities
- Runs Snyk security scan (if token provided)
- Generates security reports

**Triggers**:
- Every push to any branch
- Every pull request

### Deploy Stages

**Preview Deployment** (Pull Requests):
- Triggers on every pull request
- Deploys to temporary Vercel preview URL
- Comments on PR with preview link
- Automatically deleted when PR is closed

**Staging Deployment**:
- Triggers on push to `develop` branch
- Deploys to `staging.dchat.pro`
- Runs smoke tests

**Production Deployment**:
- Triggers on push to `main` branch
- Deploys to `dchat.pro` and `www.dchat.pro`
- Runs comprehensive smoke tests
- Creates GitHub release
- Requires manual approval (configured in GitHub Environments)

---

## Setting Up GitHub Environments

GitHub Environments provide protection rules and secrets for deployments.

### 1. Create Environments

Go to GitHub → Settings → Environments → New environment

Create three environments:
- `staging`
- `production`
- `preview` (optional)

### 2. Configure Protection Rules

**For Production Environment**:
1. Enable "Required reviewers"
2. Add yourself or team members as reviewers
3. Enable "Wait timer" (optional, e.g., 5 minutes)
4. Restrict deployment branches to `main` only

**For Staging Environment**:
1. No required reviewers (auto-deploy)
2. Restrict deployment branches to `develop` only

### 3. Add Environment-Specific Secrets

Each environment can have its own secrets:

**Staging**:
- `AWS_ACCESS_KEY_ID` (staging AWS account)
- `VERCEL_TOKEN` (staging Vercel project)

**Production**:
- `AWS_ACCESS_KEY_ID` (production AWS account)
- `VERCEL_TOKEN` (production Vercel project)

---

## AWS Setup for Backend Deployment

### 1. Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name dchat-production
aws ecs create-cluster --cluster-name dchat-staging
```

### 2. Create Task Definition

Create `task-definition.json`:

```json
{
  "family": "dchat-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "dchat-backend",
      "image": "your-dockerhub-username/dchat-backend:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "your-database-url"
        },
        {
          "name": "REDIS_HOST",
          "value": "your-redis-host"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/dchat-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register the task definition:

```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### 3. Create ECS Service

```bash
aws ecs create-service \
  --cluster dchat-production \
  --service-name dchat-backend-production \
  --task-definition dchat-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=dchat-backend,containerPort=5000"
```

### 4. Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name dchat-backend-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target group
aws elbv2 create-target-group \
  --name dchat-backend-tg \
  --protocol HTTP \
  --port 5000 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /health

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

---

## Vercel Setup for Frontend Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Link Project

```bash
cd frontend
vercel link
```

Follow the prompts to link your project.

### 3. Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

**Production**:
- `VITE_API_URL` = `https://api.dchat.pro`
- `VITE_SOCKET_URL` = `https://api.dchat.pro`
- `VITE_PINATA_GATEWAY` = `https://gateway.pinata.cloud`
- `VITE_PINATA_JWT` = `your-pinata-jwt`

**Staging**:
- `VITE_API_URL` = `https://staging-api.dchat.pro`
- `VITE_SOCKET_URL` = `https://staging-api.dchat.pro`
- (same for other variables)

### 4. Configure Domains

In Vercel Dashboard → Project Settings → Domains:

**Production**:
- Add `dchat.pro`
- Add `www.dchat.pro`

**Staging**:
- Add `staging.dchat.pro`

---

## Monitoring and Alerts

### 1. Set Up Sentry

Already configured in the backend. Just need to add `SENTRY_DSN` to environment variables.

### 2. Set Up CloudWatch Alarms

```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name dchat-backend-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Memory utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name dchat-backend-high-memory \
  --alarm-description "Alert when memory exceeds 80%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### 3. Set Up Vercel Monitoring

Vercel provides built-in monitoring:
- Analytics (page views, performance)
- Web Vitals (LCP, FID, CLS)
- Deployment logs

Access via Vercel Dashboard → Project → Analytics

---

## Troubleshooting

### Backend Deployment Fails

**Issue**: Docker build fails

**Solution**:
1. Check `backend/Dockerfile` for syntax errors
2. Verify all dependencies are in `requirements.txt`
3. Check Docker Hub credentials in GitHub Secrets

**Issue**: ECS service won't start

**Solution**:
1. Check CloudWatch logs: `/ecs/dchat-backend`
2. Verify environment variables in task definition
3. Check security groups allow traffic on port 5000
4. Verify database and Redis are accessible

### Frontend Deployment Fails

**Issue**: Vercel build fails

**Solution**:
1. Check build logs in Vercel Dashboard
2. Verify environment variables are set
3. Test build locally: `npm run build`
4. Check for TypeScript errors

**Issue**: Frontend can't connect to backend

**Solution**:
1. Verify `VITE_API_URL` is correct
2. Check CORS configuration in backend
3. Verify backend is running: `curl https://api.dchat.pro/health`
4. Check browser console for errors

### Tests Failing in CI

**Issue**: Tests pass locally but fail in CI

**Solution**:
1. Check if all dependencies are installed
2. Verify environment variables are set in workflow
3. Check if Redis service is running (for backend)
4. Look at test logs in GitHub Actions

---

## Best Practices

### 1. Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes for production

### 2. Commit Messages

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 3. Pull Requests

- Always create PR for changes
- Request review from team members
- Ensure all checks pass before merging
- Squash commits when merging

### 4. Deployment

- Never deploy directly to production
- Always test in staging first
- Use feature flags for risky changes
- Have a rollback plan

### 5. Monitoring

- Check Sentry for errors daily
- Review CloudWatch metrics weekly
- Set up alerts for critical issues
- Monitor deployment success rate

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Vercel Documentation](https://vercel.com/docs)
- [Sentry Documentation](https://docs.sentry.io/)

---

**Last Updated**: 2024-11-05  
**Author**: Manus AI  
**Version**: 1.0
