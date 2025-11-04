# AWS Deployment Guide for dchat.pro

## Architecture Overview

```
┌─────────────────┐
│   CloudFront    │  (CDN for frontend)
└────────┬────────┘
         │
┌────────▼────────┐
│   S3 Bucket     │  (Frontend static files)
└─────────────────┘

┌─────────────────┐
│  Route 53 DNS   │  (dchat.pro domain)
└────────┬────────┘
         │
┌────────▼────────┐
│  Load Balancer  │  (ALB)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│ EC2  │  │ EC2  │  (Backend API + Socket.IO)
└───┬──┘  └──┬───┘
    │        │
    └────┬───┘
         │
┌────────▼────────┐
│  ElastiCache    │  (Redis)
│   (Redis 7.x)   │
└─────────────────┘

┌─────────────────┐
│   RDS/TiDB      │  (PostgreSQL/TiDB)
└─────────────────┘

┌─────────────────┐
│  Pinata IPFS    │  (File storage)
└─────────────────┘
```

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. Domain name (dchat.pro) configured in Route 53
4. SSH key pair (protocol-bank-key.pem)

## Step 1: Create VPC and Security Groups

### VPC Configuration
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=dchat-vpc}]'

# Create subnets (public and private)
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.1.0/24 --availability-zone us-east-1a --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=dchat-public-1a}]'
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.2.0/24 --availability-zone us-east-1b --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=dchat-public-1b}]'
```

### Security Groups

**Backend Security Group**
```bash
aws ec2 create-security-group \
  --group-name dchat-backend-sg \
  --description "Security group for dchat backend" \
  --vpc-id <VPC_ID>

# Allow SSH (22)
aws ec2 authorize-security-group-ingress \
  --group-id <SG_ID> \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Allow HTTP (8000 - API)
aws ec2 authorize-security-group-ingress \
  --group-id <SG_ID> \
  --protocol tcp \
  --port 8000 \
  --cidr 0.0.0.0/0

# Allow Socket.IO (3002)
aws ec2 authorize-security-group-ingress \
  --group-id <SG_ID> \
  --protocol tcp \
  --port 3002 \
  --cidr 0.0.0.0/0

# Allow HTTPS (443)
aws ec2 authorize-security-group-ingress \
  --group-id <SG_ID> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

**Redis Security Group**
```bash
aws ec2 create-security-group \
  --group-name dchat-redis-sg \
  --description "Security group for dchat Redis" \
  --vpc-id <VPC_ID>

# Allow Redis (6379) from backend SG only
aws ec2 authorize-security-group-ingress \
  --group-id <REDIS_SG_ID> \
  --protocol tcp \
  --port 6379 \
  --source-group <BACKEND_SG_ID>
```

## Step 2: Launch EC2 Instances

### EC2 Instance Specifications
- **Instance Type**: t3.medium (2 vCPU, 4 GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Storage**: 30 GB gp3 SSD
- **Key Pair**: protocol-bank-key.pem

### Launch Command
```bash
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.medium \
  --key-name protocol-bank-key \
  --security-group-ids <BACKEND_SG_ID> \
  --subnet-id <PUBLIC_SUBNET_ID> \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=dchat-backend-1}]' \
  --user-data file://user-data.sh
```

### User Data Script (user-data.sh)
```bash
#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Python 3.11
apt-get install -y python3.11 python3.11-venv python3-pip

# Install Git
apt-get install -y git

# Install Docker (for future use)
apt-get install -y docker.io
systemctl enable docker
systemctl start docker

# Install PM2 globally
npm install -g pm2

# Create application user
useradd -m -s /bin/bash dchat
usermod -aG sudo dchat

# Clone repository
cd /home/dchat
sudo -u dchat git clone https://github.com/everest-an/dchat.git
cd dchat

# Setup backend
cd backend
sudo -u dchat python3.11 -m venv venv
sudo -u dchat ./venv/bin/pip install -r requirements.txt

# Setup environment variables (will be configured later)
sudo -u dchat cp .env.example .env

# Install frontend dependencies (for build)
cd ../frontend
sudo -u dchat npm install

echo "Setup complete!"
```

## Step 3: Create ElastiCache Redis Cluster

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id dchat-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name dchat-redis-subnet-group \
  --security-group-ids <REDIS_SG_ID> \
  --tags Key=Name,Value=dchat-redis
```

### Get Redis Endpoint
```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id dchat-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text
```

## Step 4: Configure Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name dchat-alb \
  --subnets <SUBNET_1> <SUBNET_2> \
  --security-groups <ALB_SG_ID> \
  --tags Key=Name,Value=dchat-alb

# Create target group for backend
aws elbv2 create-target-group \
  --name dchat-backend-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id <VPC_ID> \
  --health-check-path /health \
  --health-check-interval-seconds 30

# Register EC2 instances
aws elbv2 register-targets \
  --target-group-arn <TG_ARN> \
  --targets Id=<INSTANCE_ID_1> Id=<INSTANCE_ID_2>

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<ACM_CERT_ARN> \
  --default-actions Type=forward,TargetGroupArn=<TG_ARN>
```

## Step 5: Deploy Application

### SSH into EC2
```bash
chmod 400 protocol-bank-key.pem
ssh -i protocol-bank-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### Configure Environment Variables
```bash
cd /home/dchat/dchat/backend
sudo nano .env
```

Add the following:
```env
# Database Configuration (TiDB)
DB_HOST=gateway01.eu-central-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=3weSfx6NGnayDMr.root
DB_PASSWORD=<YOUR_PASSWORD>
DB_NAME=test

# JWT Secret
JWT_SECRET=<GENERATE_STRONG_SECRET>

# Pinata IPFS
PINATA_JWT=<YOUR_PINATA_JWT>
PINATA_API_KEY=p650Qa8dd0e3c8f2a03Q
PINATA_SECRET_API_KEY=bca8e0dbc67c7da8d4ee3feb187eeb0c548cc8f58cc019718ed3b
PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/

# Redis (ElastiCache endpoint)
REDIS_URL=redis://<REDIS_ENDPOINT>:6379

# Web3
WEB3_PROVIDER_URL=https://sepolia.infura.io/v3/<YOUR_INFURA_KEY>
CONTRACT_USER_IDENTITY=0x6BCF16f82F8d3A37b7b6fd59DeE9adf95B1BA5a1
CONTRACT_MESSAGE_STORAGE=0x906626694a065bEECf51F2C776f272bDB67Ce174

# Frontend URL
FRONTEND_URL=https://dchat.pro

# Socket.IO
SOCKET_IO_PORT=3002
SOCKET_IO_CORS_ORIGIN=https://dchat.pro
```

### Start Backend with PM2
```bash
cd /home/dchat/dchat/backend

# Start Python backend
pm2 start src/main.py --name dchat-api --interpreter python3.11

# Start Socket.IO server
pm2 start src/socket_app.py --name dchat-socket --interpreter python3.11

# Save PM2 configuration
pm2 save
pm2 startup
```

### Build and Deploy Frontend
```bash
cd /home/dchat/dchat/frontend

# Update API endpoint
nano .env.production
```

Add:
```env
REACT_APP_API_URL=https://api.dchat.pro
REACT_APP_SOCKET_URL=https://socket.dchat.pro
REACT_APP_WEB3_PROVIDER=https://sepolia.infura.io/v3/<YOUR_INFURA_KEY>
```

```bash
# Build frontend
npm run build

# Upload to S3
aws s3 sync build/ s3://dchat-frontend-bucket/ --delete
aws s3 website s3://dchat-frontend-bucket/ --index-document index.html --error-document index.html
```

## Step 6: Configure CloudFront

```bash
aws cloudfront create-distribution \
  --origin-domain-name dchat-frontend-bucket.s3.amazonaws.com \
  --default-root-object index.html \
  --aliases dchat.pro www.dchat.pro
```

## Step 7: Update Route 53 DNS

```bash
# Point dchat.pro to CloudFront
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch file://dns-changes.json
```

## Monitoring and Logging

### CloudWatch Logs
```bash
# Install CloudWatch agent on EC2
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure log groups
aws logs create-log-group --log-group-name /dchat/backend
aws logs create-log-group --log-group-name /dchat/socket
```

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
```

## Backup and Disaster Recovery

### Database Backups
- TiDB Cloud handles automatic backups
- Configure retention period in TiDB console

### Redis Backups
```bash
aws elasticache create-snapshot \
  --cache-cluster-id dchat-redis \
  --snapshot-name dchat-redis-backup-$(date +%Y%m%d)
```

## Cost Estimation

| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| EC2 (t3.medium × 2) | 2 vCPU, 4GB RAM | ~$60 |
| ElastiCache (t3.micro) | Redis 7.x | ~$15 |
| ALB | Application Load Balancer | ~$20 |
| S3 + CloudFront | Frontend hosting | ~$5 |
| Data Transfer | ~100GB/month | ~$10 |
| **Total** | | **~$110/month** |

## Security Checklist

- [ ] Enable AWS WAF on ALB
- [ ] Configure SSL/TLS certificates (ACM)
- [ ] Enable VPC Flow Logs
- [ ] Set up CloudTrail for audit logging
- [ ] Configure IAM roles with least privilege
- [ ] Enable MFA for AWS root account
- [ ] Rotate secrets regularly (use AWS Secrets Manager)
- [ ] Enable encryption at rest for EBS volumes
- [ ] Configure security groups with minimal access
- [ ] Set up automated security scanning

## Troubleshooting

### Check Backend Status
```bash
pm2 status
pm2 logs dchat-api --lines 100
```

### Check Redis Connection
```bash
redis-cli -h <REDIS_ENDPOINT> ping
```

### Check Database Connection
```bash
psql -h gateway01.eu-central-1.prod.aws.tidbcloud.com -p 4000 -U 3weSfx6NGnayDMr.root -d test
```

### Check Load Balancer Health
```bash
aws elbv2 describe-target-health --target-group-arn <TG_ARN>
```

## Next Steps

1. Set up CI/CD pipeline with GitHub Actions
2. Configure auto-scaling for EC2 instances
3. Implement blue-green deployment
4. Set up Sentry for error tracking
5. Configure Prometheus + Grafana for metrics
6. Implement rate limiting with AWS WAF
7. Set up automated backups
8. Configure alerting with SNS

## Support

For deployment issues, contact: everest9812@gmail.com
