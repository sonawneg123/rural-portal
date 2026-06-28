# 🌿 ग्रामीण समस्या पोर्टल — Rural Problems Portal

AI-powered civic problem reporting platform for rural India.  
**React 18 + Node.js + MySQL · Groq AI (llama3-8b) · AWS Three-Tier Architecture**

---

## 📁 Project Structure

```
rural-portal/
├── schema.sql                     ← MySQL schema (8 tables + views)
├── docker-compose.yml             ← Local three-tier orchestration
├── .gitignore
│
├── frontend/                      ← TIER 1 — React SPA + Nginx
│   ├── Dockerfile                 ← Multi-stage: build + nginx runner
│   ├── nginx.conf                 ← Reverse proxy + SPA fallback + gzip
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js
│       ├── App.js                 ← Routes + AuthProvider
│       ├── context/AuthContext.js ← JWT state management
│       ├── utils/api.js           ← Axios + token interceptor
│       ├── utils/locations.js     ← India states + status/priority maps
│       ├── components/
│       │   ├── Navbar.js
│       │   └── ProblemCard.js     ← Shows Groq AI summary + tags
│       └── pages/
│           ├── Home.js            ← Hero + stats + categories + recent
│           ├── Login.js           ← Login + Register forms
│           ├── Problems.js        ← Filterable problem list
│           ├── ProblemDetail.js   ← Full detail + Groq summary + insight
│           ├── ReportProblem.js   ← 3-step report wizard
│           └── Admin.js           ← Dashboard + Groq insight per problem
│
├── backend/                       ← TIER 2 — Node.js Monolithic API
│   ├── Dockerfile
│   ├── package.json               ← includes groq-sdk
│   ├── .env.example               ← GROQ_API_KEY documented here
│   └── src/
│       ├── server.js              ← Express + middleware + boot
│       ├── config/
│       │   ├── groq.js            ← Groq SDK client + 2 AI functions
│       │   ├── database.js        ← MySQL2 pool (RDS-ready)
│       │   ├── s3.js              ← Multer-S3 photo upload
│       │   └── logger.js          ← Winston structured logging
│       ├── middleware/auth.js     ← JWT authenticate / requireAdmin
│       ├── controllers/
│       │   ├── authController.js  ← register / login / me
│       │   ├── problemController.js ← createProblem calls Groq
│       │   └── adminController.js ← dashboard + getProblemInsight (Groq)
│       └── routes/index.js        ← All 25+ API endpoints
│
└── docs/
    └── AWS-DEPLOYMENT-GUIDE.md    ← Step-by-step AWS setup
```

---

## ⚡ Quick Start (Local Docker — 3 commands)

```bash
# 1. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env — set at minimum:
#   GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx   ← from console.groq.com/keys
#   JWT_SECRET=<run: openssl rand -base64 48>

# 2. Build and start all three tiers
docker-compose up --build

# 3. Open the portal
open http://localhost

# Default admin login:
#   admin@ruralportal.in  /  Admin@1234
```

---

## 🤖 Groq AI Features

Get your free API key at **https://console.groq.com/keys**

| Feature | When | Model | Output |
|---------|------|-------|--------|
| **Problem Summary** | Every submission | llama3-8b-8192 | 2-3 sentence formal summary |
| **AI Tags** | Every submission | llama3-8b-8192 | Up to 4 topic tags |
| **Admin Insight** | Admin clicks button | llama3-8b-8192 | Action suggestion for officials |

The Groq client lives in `backend/src/config/groq.js` and exposes:
- `generateProblemSummary(title, desc, category, location)` → `{ summary, tags }`
- `generateAdminInsight(problem)` → `string`

Both use `json_object` response format for reliable parsing.

---

## 🔌 API Reference

### Auth
```
POST /api/auth/register   Public   Register new citizen
POST /api/auth/login      Public   Login → JWT
GET  /api/auth/me         JWT      Current user info
```

### Problems
```
GET    /api/problems              Public   List + filter (state/district/category/status/search)
GET    /api/problems/my           JWT      User's own reports
GET    /api/problems/:id          Public   Full detail + photos + comments
POST   /api/problems              JWT      Submit report (triggers Groq AI)
POST   /api/problems/:id/upvote   JWT      Upvote
POST   /api/problems/:id/comment  JWT      Add comment
```

### Admin
```
GET    /api/admin/dashboard              Admin   Stats + charts
GET    /api/admin/problems               Admin   All problems (paginated)
PATCH  /api/admin/problems/:id/status   Admin   Update status/priority
GET    /api/admin/problems/:id/insight  Admin   Groq AI action suggestion
GET    /api/admin/users                  Admin   All citizens
PATCH  /api/admin/users/:id/toggle      Admin   Activate/deactivate user
```

---

## 🗄️ Database Tables

| Table            | Purpose |
|------------------|---------|
| `users`          | Citizens + admins with location |
| `categories`     | 10 problem types |
| `problems`       | Reports with `ai_summary` + `ai_tags` columns |
| `problem_photos` | S3 URLs per problem |
| `upvotes`        | Unique vote per user per problem |
| `comments`       | User + official admin comments |
| `status_history` | Audit trail of all status changes |
| `notifications`  | In-app alerts for reporters |

---

## 🏗️ AWS Architecture

See **`docs/AWS-DEPLOYMENT-GUIDE.md`** for full step-by-step including:
- VPC + 8 subnets across 2 AZs
- 6 security groups (least-privilege)
- Bastion host + SSH tunnelling
- RDS MySQL Multi-AZ + schema migration
- S3 photo bucket + IAM user
- ECR repositories + Docker push commands
- External ALB + Internal ALB + Auto Scaling Groups
- Groq API key storage via AWS Secrets Manager
- CloudWatch alarms + monthly cost estimate (~$155/mo)

---

## 🔐 Security

- JWT (7-day, HS256) with auto-refresh
- bcrypt password hashing (12 rounds)
- Rate limiting: 100 req/15min global, 10 req/15min on auth
- Helmet.js headers on all responses
- CORS restricted to `FRONTEND_URL`
- Docker containers run as non-root
- RDS in private subnets, not publicly accessible
- `GROQ_API_KEY` stored in AWS Secrets Manager in production

---

## 👤 Default Admin

| Field    | Value                 |
|----------|-----------------------|
| Email    | admin@ruralportal.in  |
| Password | Admin@1234            |

**⚠️ Change immediately in production.**
