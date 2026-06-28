# ============================================================
# RURAL PROBLEMS PORTAL — AWS Three-Tier Deployment Guide
# Groq AI + React + Node.js + MySQL RDS on AWS
# ============================================================

## ARCHITECTURE

```
Internet
   │
   ▼
┌──────────────────────────────────┐
│  EXTERNAL ALB (Public Subnets)   │  ← HTTPS termination (ACM)
└──────────────┬───────────────────┘
               │
   ┌───────────▼──────────┐
   │   TIER 1 — FRONTEND  │  Private Subnets
   │   EC2 ASG            │  Nginx + React SPA
   │   Port 80            │  Calls Groq via backend /api
   └───────────┬──────────┘
               │  /api/* proxied by Nginx
   ┌───────────▼──────────┐
   │   INTERNAL ALB        │  Private — not internet-facing
   └───────────┬──────────┘
               │
   ┌───────────▼──────────┐
   │   TIER 2 — BACKEND   │  Private Subnets
   │   EC2 ASG            │  Node.js + groq-sdk
   │   Port 5000          │  Calls api.groq.com externally
   └───────────┬──────────┘
               │
   ┌───────────▼──────────┐
   │   TIER 3 — DATABASE  │  Private DB Subnets
   │   RDS MySQL Multi-AZ │  Port 3306
   └──────────────────────┘
               +
   ┌─────────────┐  ┌──────────────┐
   │  S3 Bucket  │  │  Bastion EC2 │
   │  (Photos)   │  │  (Public SN) │
   └─────────────┘  └──────────────┘
```

---

## STEP 1 — VPC & NETWORKING

```bash
# Create VPC (10.0.0.0/16)
aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=rural-vpc}]'

# Enable DNS
aws ec2 modify-vpc-attribute --vpc-id <VPC_ID> --enable-dns-hostnames '{"Value":true}'
aws ec2 modify-vpc-attribute --vpc-id <VPC_ID> --enable-dns-support   '{"Value":true}'
```

### Subnets

| Name                  | CIDR         | AZ          | Type    |
|-----------------------|--------------|-------------|---------|
| public-1a             | 10.0.1.0/24  | ap-south-1a | Public  |
| public-1b             | 10.0.2.0/24  | ap-south-1b | Public  |
| private-frontend-1a   | 10.0.11.0/24 | ap-south-1a | Private |
| private-frontend-1b   | 10.0.12.0/24 | ap-south-1b | Private |
| private-backend-1a    | 10.0.21.0/24 | ap-south-1a | Private |
| private-backend-1b    | 10.0.22.0/24 | ap-south-1b | Private |
| private-db-1a         | 10.0.31.0/24 | ap-south-1a | Private |
| private-db-1b         | 10.0.32.0/24 | ap-south-1b | Private |

```bash
# IGW + public route table
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=rural-igw}]'
aws ec2 attach-internet-gateway --internet-gateway-id <IGW_ID> --vpc-id <VPC_ID>

# NAT Gateway (for backend to reach api.groq.com)
aws ec2 allocate-address --domain vpc
aws ec2 create-nat-gateway --subnet-id <PUBLIC_1A> --allocation-id <EIP_ID> \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=rural-nat}]'
```

---

## STEP 2 — SECURITY GROUPS

```
sg-ext-alb   ← 0.0.0.0/0        : 80, 443
sg-bastion   ← <your-ip>/32      : 22
sg-frontend  ← sg-ext-alb        : 80  | sg-bastion : 22
sg-int-alb   ← sg-frontend       : 5000
sg-backend   ← sg-int-alb        : 5000 | sg-bastion : 22
             ← 0.0.0.0/0 EGRESS  : 443  (to reach api.groq.com)
sg-database  ← sg-backend        : 3306
```

```bash
# External ALB
aws ec2 create-security-group --group-name sg-ext-alb \
  --description "External ALB" --vpc-id <VPC_ID>
aws ec2 authorize-security-group-ingress --group-id <SG_EXT_ALB> --protocol tcp --port 80  --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id <SG_EXT_ALB> --protocol tcp --port 443 --cidr 0.0.0.0/0

# Backend (IMPORTANT: needs outbound 443 for Groq API calls)
aws ec2 create-security-group --group-name sg-backend \
  --description "Backend EC2 — needs outbound for Groq" --vpc-id <VPC_ID>
aws ec2 authorize-security-group-ingress --group-id <SG_BACKEND> --protocol tcp --port 5000 --source-group <SG_INT_ALB>
aws ec2 authorize-security-group-ingress --group-id <SG_BACKEND> --protocol tcp --port 22   --source-group <SG_BASTION>
# Egress to Groq API (api.groq.com) via NAT Gateway is allowed by default AWS egress rule

# Database
aws ec2 create-security-group --group-name sg-database \
  --description "RDS MySQL" --vpc-id <VPC_ID>
aws ec2 authorize-security-group-ingress --group-id <SG_DATABASE> --protocol tcp --port 3306 --source-group <SG_BACKEND>
```

---

## STEP 3 — BASTION HOST

```bash
aws ec2 run-instances \
  --image-id ami-0f58b397bc5c1f2e8 \
  --instance-type t3.micro \
  --key-name rural-key \
  --subnet-id <PUBLIC_1A> \
  --security-group-ids <SG_BASTION> \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=rural-bastion}]'

# Connect
ssh -i rural-key.pem ec2-user@<BASTION_PUBLIC_IP>
# Hop to private EC2
ssh -i rural-key.pem ec2-user@<BACKEND_PRIVATE_IP>
```

---

## STEP 4 — RDS MySQL (Tier 3)

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name rural-db-subnets \
  --db-subnet-group-description "Rural Portal DB" \
  --subnet-ids <PRIVATE_DB_1A> <PRIVATE_DB_1B>

aws rds create-db-instance \
  --db-instance-identifier rural-db \
  --db-instance-class      db.t3.medium \
  --engine mysql --engine-version 8.0.35 \
  --master-username admin \
  --master-user-password "YourStrongPass123!" \
  --allocated-storage 20 --max-allocated-storage 100 \
  --db-name rural_portal \
  --db-subnet-group-name rural-db-subnets \
  --vpc-security-group-ids <SG_DATABASE> \
  --multi-az --backup-retention-period 7 \
  --deletion-protection --no-publicly-accessible

# Apply schema via bastion
mysql -h <RDS_ENDPOINT> -u admin -p rural_portal < schema.sql
```

---

## STEP 5 — S3 BUCKET

```bash
aws s3 mb s3://rural-portal-photos --region ap-south-1

# IAM user for backend
aws iam create-user --user-name rural-backend-s3
aws iam attach-user-policy --user-name rural-backend-s3 \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam create-access-key --user-name rural-backend-s3
# → Put AccessKeyId + SecretAccessKey in backend/.env
```

---

## STEP 6 — ECR + BUILD + PUSH

```bash
# Create ECR repos
aws ecr create-repository --repository-name rural-frontend --region ap-south-1
aws ecr create-repository --repository-name rural-backend  --region ap-south-1

# ECR login
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS \
  --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

# Backend — fill backend/.env first (including GROQ_API_KEY)
cd backend
docker build -t rural-backend .
docker tag rural-backend:latest \
  <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/rural-backend:latest
docker push \
  <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/rural-backend:latest

# Frontend
cd ../frontend
docker build --build-arg REACT_APP_API_URL=/api -t rural-frontend .
docker tag rural-frontend:latest \
  <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/rural-frontend:latest
docker push \
  <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/rural-frontend:latest
```

---

## STEP 7 — BACKEND EC2 + INTERNAL ALB (Tier 2)

```bash
# Internal ALB
aws elbv2 create-load-balancer \
  --name rural-internal-alb --type application --scheme internal \
  --subnets <PRIVATE_BACKEND_1A> <PRIVATE_BACKEND_1B> \
  --security-groups <SG_INT_ALB>

# Backend target group
aws elbv2 create-target-group \
  --name rural-backend-tg --protocol HTTP --port 5000 \
  --vpc-id <VPC_ID> --health-check-path /api/health

# Listener
aws elbv2 create-listener \
  --load-balancer-arn <INT_ALB_ARN> --protocol HTTP --port 5000 \
  --default-actions Type=forward,TargetGroupArn=<BACKEND_TG_ARN>

# Backend Launch Template (user-data pulls ECR image + runs with .env)
# Then create Auto Scaling Group:
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name rural-backend-asg \
  --launch-template LaunchTemplateName=rural-backend-lt,Version='$Latest' \
  --min-size 1 --max-size 4 --desired-capacity 2 \
  --vpc-zone-identifier "<PRIVATE_BACKEND_1A>,<PRIVATE_BACKEND_1B>" \
  --target-group-arns <BACKEND_TG_ARN> \
  --health-check-type ELB --health-check-grace-period 120
```

---

## STEP 8 — FRONTEND EC2 + EXTERNAL ALB (Tier 1)

```bash
# External ALB
aws elbv2 create-load-balancer \
  --name rural-external-alb --type application --scheme internet-facing \
  --subnets <PUBLIC_1A> <PUBLIC_1B> \
  --security-groups <SG_EXT_ALB>

# Frontend target group
aws elbv2 create-target-group \
  --name rural-frontend-tg --protocol HTTP --port 80 \
  --vpc-id <VPC_ID> --health-check-path /health

# Listener
aws elbv2 create-listener \
  --load-balancer-arn <EXT_ALB_ARN> --protocol HTTP --port 80 \
  --default-actions Type=forward,TargetGroupArn=<FRONTEND_TG_ARN>

# Frontend ASG in private subnets
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name rural-frontend-asg \
  --launch-template LaunchTemplateName=rural-frontend-lt,Version='$Latest' \
  --min-size 1 --max-size 3 --desired-capacity 2 \
  --vpc-zone-identifier "<PRIVATE_FRONTEND_1A>,<PRIVATE_FRONTEND_1B>" \
  --target-group-arns <FRONTEND_TG_ARN> \
  --health-check-type ELB --health-check-grace-period 90
```

---

## STEP 9 — GROQ API KEY IN PRODUCTION

The `GROQ_API_KEY` must be available to the backend EC2 instances.

**Option A — AWS Secrets Manager (recommended)**
```bash
aws secretsmanager create-secret \
  --name rural-portal/groq-api-key \
  --secret-string "gsk_xxxxxxxxxxxxxxxxxxxx"

# In backend user-data script:
export GROQ_API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id rural-portal/groq-api-key \
  --query SecretString --output text)
```

**Option B — Systems Manager Parameter Store**
```bash
aws ssm put-parameter \
  --name /rural-portal/GROQ_API_KEY \
  --value "gsk_xxxxxxxxxxxxxxxxxxxx" \
  --type SecureString

# In backend user-data:
export GROQ_API_KEY=$(aws ssm get-parameter \
  --name /rural-portal/GROQ_API_KEY \
  --with-decryption --query Parameter.Value --output text)
```

**Option C — .env file in S3 (simple)**
```bash
aws s3 cp backend/.env s3://rural-portal-config/backend.env
# User-data: aws s3 cp s3://rural-portal-config/backend.env /home/ec2-user/.env
```

---

## ENVIRONMENT VARIABLES REFERENCE

### backend/.env

| Variable              | Description                                  | Example                         |
|-----------------------|----------------------------------------------|---------------------------------|
| `GROQ_API_KEY`        | Groq API key — get at console.groq.com/keys  | `gsk_xxxxxxxxxxxxxxxxxxxx`      |
| `GROQ_MODEL`          | Groq model ID                                | `llama3-8b-8192`                |
| `NODE_ENV`            | Runtime environment                          | `production`                    |
| `PORT`                | API port                                     | `5000`                          |
| `DB_HOST`             | RDS endpoint                                 | `rural-db.xxx.rds.amazonaws.com`|
| `DB_NAME`             | Database name                                | `rural_portal`                  |
| `DB_USER`             | MySQL user                                   | `admin`                         |
| `DB_PASSWORD`         | MySQL password                               | `StrongPass123!`                |
| `JWT_SECRET`          | 48+ char random string                       | `openssl rand -base64 48`       |
| `JWT_EXPIRES_IN`      | Token expiry                                 | `7d`                            |
| `AWS_REGION`          | AWS region                                   | `ap-south-1`                    |
| `AWS_ACCESS_KEY_ID`   | S3 IAM access key                            | `AKIA…`                         |
| `AWS_SECRET_ACCESS_KEY`| S3 IAM secret                               | `xxxxx`                         |
| `S3_BUCKET_NAME`      | Photo bucket                                 | `rural-portal-photos`           |
| `FRONTEND_URL`        | CORS origin                                  | `https://ruralportal.in`        |

### frontend/.env

| Variable              | Value                                        |
|-----------------------|----------------------------------------------|
| `REACT_APP_API_URL`   | `/api` (Nginx proxies to backend internally) |

---

## GROQ AI FEATURES SUMMARY

| Feature                   | Trigger              | Model          | Output                        |
|---------------------------|----------------------|----------------|-------------------------------|
| Problem summary           | Every new submission | llama3-8b-8192 | 2-3 sentence formal summary   |
| AI tags                   | Every new submission | llama3-8b-8192 | Up to 4 topic tags            |
| Admin action insight      | Admin clicks button  | llama3-8b-8192 | 1-2 sentence action suggestion|

All three calls use `response_format: { type: 'json_object' }` for summary/tags
and plain text completion for insights.

---

## QUICK LOCAL START

```bash
cd rural-portal

# 1. Configure backend
cp backend/.env.example backend/.env
# Edit: add GROQ_API_KEY=gsk_xxx  JWT_SECRET=<48chars>

# 2. Start
docker-compose up --build

# 3. Open  http://localhost
# Admin:  admin@ruralportal.in / Admin@1234
```

---

## MONTHLY AWS COST ESTIMATE (ap-south-1)

| Service             | Spec                   | ~Cost/mo |
|---------------------|------------------------|----------|
| EC2 Frontend ×2     | t3.small               | $15      |
| EC2 Backend ×2      | t3.small               | $15      |
| EC2 Bastion ×1      | t3.micro               | $8       |
| External ALB        | ~1M req                | $18      |
| Internal ALB        | ~1M req                | $18      |
| RDS MySQL Multi-AZ  | db.t3.medium           | $60      |
| NAT Gateway         | ~10 GB                 | $15      |
| S3 (photos)         | 50 GB                  | $1       |
| Groq API            | Free tier / pay-as-use | $0-5     |
| **Total**           |                        | **~$155**|

---

## SECURITY CHECKLIST

- [ ] `GROQ_API_KEY` stored in AWS Secrets Manager, not hardcoded
- [ ] No EC2 has a public IP (except Bastion)
- [ ] RDS not publicly accessible
- [ ] Security group egress on backend allows 443 outbound (for Groq API)
- [ ] `.env` files excluded from Git
- [ ] Admin password changed after first login
- [ ] HTTPS on External ALB via ACM
- [ ] JWT secret is 48+ random characters
- [ ] Rate limiting on `/api/auth/*` endpoints
- [ ] Docker containers run as non-root user
- [ ] RDS automated backups enabled (7 days)
- [ ] CloudWatch alarms on 5xx errors and CPU
