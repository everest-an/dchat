---

# dchat.pro Operations Manual

**Version**: 1.0  
**Last Updated**: 2024-11-05  
**Author**: Manus AI

---

## Introduction

This manual provides comprehensive instructions for deploying, managing, and maintaining the dchat.pro application. It is intended for DevOps engineers, system administrators, and developers responsible for the production environment.

---

## Table of Contents

1.  [**Architecture Overview**](#1-architecture-overview)
    1.1. [System Components](#11-system-components)
    1.2. [Technology Stack](#12-technology-stack)
    1.3. [Network Diagram](#13-network-diagram)

2.  [**Deployment**](#2-deployment)
    2.1. [Prerequisites](#21-prerequisites)
    2.2. [Smart Contract Deployment](#22-smart-contract-deployment)
    2.3. [Backend Deployment (AWS ECS)](#23-backend-deployment-aws-ecs)
    2.4. [Frontend Deployment (Vercel)](#24-frontend-deployment-vercel)
    2.5. [CI/CD Pipeline](#25-cicd-pipeline)

3.  [**Configuration**](#3-configuration)
    3.1. [Environment Variables](#31-environment-variables)
    3.2. [Secrets Management](#32-secrets-management)

4.  [**Monitoring & Alerting**](#4-monitoring--alerting)
    4.1. [Application Performance Monitoring (APM)](#41-application-performance-monitoring-apm)
    4.2. [Logging](#42-logging)
    4.3. [Metrics & Dashboards](#43-metrics--dashboards)
    4.4. [Alerting](#44-alerting)

5.  [**Maintenance**](#5-maintenance)
    5.1. [Regular Tasks](#51-regular-tasks)
    5.2. [Database Maintenance](#52-database-maintenance)
    5.3. [Dependency Updates](#53-dependency-updates)

6.  [**Backup & Recovery**](#6-backup--recovery)
    6.1. [Database Backup](#61-database-backup)
    6.2. [File Storage Backup](#62-file-storage-backup)
    6.3. [Disaster Recovery Plan](#63-disaster-recovery-plan)

7.  [**Troubleshooting**](#7-troubleshooting)
    7.1. [Common Issues](#71-common-issues)
    7.2. [Debugging Guide](#72-debugging-guide)

8.  [**Security**](#8-security)
    8.1. [Security Best Practices](#81-security-best-practices)
    8.2. [Incident Response](#82-incident-response)

---

## 1. Architecture Overview

### 1.1. System Components

-   **Frontend**: React-based single-page application (SPA) providing the user interface.
-   **Backend**: Python Flask application serving the API and business logic.
-   **Smart Contracts**: Solidity contracts on the Sepolia testnet for Web3 features.
-   **Database**: PostgreSQL for storing user data, messages, and application state.
-   **Cache**: Redis for session management, caching, and rate limiting.
-   **File Storage**: IPFS (via Pinata) for decentralized file storage.
-   **Real-time Engine**: Socket.IO for real-time messaging and notifications.

### 1.2. Technology Stack

| Component         | Technology                                      |
| ----------------- | ----------------------------------------------- |
| **Frontend**      | React, Vite, ethers.js, Tailwind CSS            |
| **Backend**       | Python, Flask, SQLAlchemy, Gunicorn             |
| **Smart Contracts** | Solidity, Hardhat, OpenZeppelin                 |
| **Database**      | PostgreSQL (AWS RDS)                            |
| **Cache**         | Redis (AWS ElastiCache)                         |
| **File Storage**  | IPFS (Pinata)                                   |
| **Real-time**     | Socket.IO                                       |
| **Deployment**    | Docker, AWS ECS, Vercel, GitHub Actions         |
| **Monitoring**    | Sentry, Prometheus, Grafana, AWS CloudWatch     |
| **Testing**       | Pytest (backend), Vitest (frontend), Locust, Playwright |

### 1.3. Network Diagram

```
(User) --> (Vercel/CloudFront) --> [Frontend]
   |                                  |
   |                                  v
   +-----> (AWS API Gateway) --> (AWS ECS) --> [Backend API]
                                     |   ^
                                     v   |
      +------------------------------+---+
      |                              |
      v                              v
(AWS RDS - PostgreSQL)         (AWS ElastiCache - Redis)
      |
      v
(Sepolia Testnet) <-- [Smart Contracts]
      |
      v
(IPFS - Pinata)
```

---

## 2. Deployment

Refer to the following documents for detailed deployment instructions:

-   **Smart Contracts**: `contracts/DEPLOYMENT_GUIDE.md`
-   **Backend**: `AWS_DEPLOYMENT_GUIDE.md`
-   **Frontend**: `frontend/DEPLOYMENT.md`

### 2.1. Prerequisites

-   AWS Account
-   Vercel Account
-   GitHub Account
-   Domain Name
-   Node.js, Python, Docker installed locally

### 2.2. Smart Contract Deployment

1.  Configure `.env` in the `contracts` directory with `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, and `ETHERSCAN_API_KEY`.
2.  Run `npx hardhat run scripts/deploy-group-contracts.js --network sepolia`.
3.  Verify contracts on Etherscan.
4.  Update contract addresses in backend and frontend configurations.

### 2.3. Backend Deployment (AWS ECS)

1.  **Build Docker Image**: The CI/CD pipeline builds and pushes the Docker image to AWS ECR.
2.  **Set up AWS RDS**: Create a PostgreSQL instance.
3.  **Set up AWS ElastiCache**: Create a Redis instance.
4.  **Set up AWS ECS**: Create a task definition and service for the backend container.
5.  **Configure Load Balancer**: Set up an Application Load Balancer to route traffic to the ECS service.
6.  **Configure Environment**: Set environment variables in the ECS task definition using AWS Secrets Manager.

### 2.4. Frontend Deployment (Vercel)

1.  Connect your GitHub repository to Vercel.
2.  Configure the build command: `npm run build`.
3.  Set environment variables in the Vercel project settings (e.g., `VITE_API_URL`).
4.  Vercel will automatically deploy on every push to the `main` branch.

### 2.5. CI/CD Pipeline

-   **Provider**: GitHub Actions
-   **Workflows**: `.github/workflows/`
    -   `backend-ci.yml`: Runs tests, builds Docker image, pushes to ECR.
    -   `frontend-ci.yml`: Runs tests, builds frontend, deploys to Vercel.

---

## 3. Configuration

### 3.1. Environment Variables

Refer to `.env.example` files in the `backend` and `frontend` directories for a full list of required environment variables.

**Key Backend Variables**:
-   `DATABASE_URL`
-   `REDIS_URL`
-   `SECRET_KEY`
-   `JWT_SECRET_KEY`
-   `ALCHEMY_API_KEY`
-   `PINATA_JWT`
-   `SENTRY_DSN`

**Key Frontend Variables**:
-   `VITE_API_URL`
-   `VITE_SOCKET_URL`
-   `VITE_ALCHEMY_API_KEY`
-   `VITE_SENTRY_DSN`

### 3.2. Secrets Management

-   **Production**: Use AWS Secrets Manager to store all sensitive credentials.
-   **Development**: Use `.env` files (do not commit to Git).

---

## 4. Monitoring & Alerting

Refer to `MONITORING_AND_LOGGING.md` for details.

### 4.1. Application Performance Monitoring (APM)

-   **Tool**: Sentry
-   **Setup**: Configure `SENTRY_DSN` in both backend and frontend.
-   **Features**: Error tracking, performance monitoring, release health.

### 4.2. Logging

-   **Backend**: Structured JSON logs are sent to stdout and collected by AWS CloudWatch Logs.
-   **Frontend**: Logs are sent to the browser console and Sentry.

### 4.3. Metrics & Dashboards

-   **Tool**: AWS CloudWatch
-   **Key Metrics**:
    -   CPU/Memory Utilization (ECS)
    -   Request Count, Error Rate, Response Time (ALB)
    -   Database Connections, CPU (RDS)
    -   Cache Hits/Misses (ElastiCache)
-   **Dashboards**: Create a CloudWatch dashboard to visualize key metrics.

### 4.4. Alerting

-   **Tool**: AWS CloudWatch Alarms
-   **Key Alerts**:
    -   High CPU/Memory usage
    -   High API error rate (> 1%)
    -   High API latency (> 500ms)
    -   Database connection failures

---

## 5. Maintenance

### 5.1. Regular Tasks

-   **Weekly**: Review security advisories and update dependencies.
-   **Monthly**: Review logs and performance metrics for anomalies.
-   **Quarterly**: Perform a full security audit and test the disaster recovery plan.

### 5.2. Database Maintenance

-   **Vacuuming**: AWS RDS handles vacuuming automatically.
-   **Indexing**: Review slow query logs and add new indexes as needed.

### 5.3. Dependency Updates

-   **Backend**: Use `pip-tools` to manage dependencies. Run `pip-compile` and `pip-sync`.
-   **Frontend**: Use `npm outdated` and `npm update`.
-   Run tests after every update.

---

## 6. Backup & Recovery

### 6.1. Database Backup

-   **Strategy**: Use AWS RDS automated snapshots.
-   **Frequency**: Daily
-   **Retention**: 7 days
-   **Recovery**: Restore from a snapshot to a new RDS instance.

### 6.2. File Storage Backup

-   IPFS provides data persistence and redundancy. For critical data, consider a secondary backup to AWS S3.

### 6.3. Disaster Recovery Plan

1.  **Declare Disaster**: If the primary region is down.
2.  **Promote Replica**: Promote a cross-region read replica of the database to primary.
3.  **Deploy Backend**: Deploy the backend service to the secondary region.
4.  **Update DNS**: Update DNS records to point to the new load balancer.
5.  **Time to Recovery**: Target < 1 hour.

---

## 7. Troubleshooting

### 7.1. Common Issues

-   **5xx Errors**: Check backend logs in CloudWatch and Sentry for stack traces.
-   **Authentication Failures**: Verify JWT secret key, check for expired tokens, and ensure nonce validation is working.
-   **Slow Performance**: Check database query performance, cache hit rates, and for resource bottlenecks.
-   **WebSocket Disconnects**: Check Socket.IO server logs and for network issues.

### 7.2. Debugging Guide

1.  **Reproduce the issue** in a staging environment.
2.  **Check logs** in Sentry and CloudWatch.
3.  **Inspect database** state.
4.  **Use a debugger** to step through the code.
5.  **Consult documentation** (`SECURITY.md`, `PERFORMANCE.md`, etc.).

---

## 8. Security

Refer to `SECURITY.md` for a comprehensive security guide.

### 8.1. Security Best Practices

-   Principle of least privilege.
-   Regularly update dependencies.
-   Use strong, unique secrets.
-   Enforce HTTPS.
-   Validate and sanitize all user input.

### 8.2. Incident Response

1.  **Detect**: Identify the incident via alerts or reports.
2.  **Contain**: Isolate the affected system, block malicious IPs.
3.  **Eradicate**: Patch the vulnerability, remove malicious code.
4.  **Recover**: Restore service, verify system integrity.
5.  **Post-Mortem**: Analyze the root cause and improve defenses.

---
