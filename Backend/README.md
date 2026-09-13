# SetuGov Backend API

**SetuGov** is a Government Innovation Procurement Lifecycle Platform connecting Government Departments, Innovation Challenges, Verified Startups, Multi-criteria Evaluations, Milestone-driven Pilots, Continuous KPI Measurement, and Statewide Scaling Decisions.

---

## 🏛️ Procurement Lifecycle Overview

```
Government Departments
        ↓
Government Challenge (Draft → Published)
        ↓
Startup Discovery (pgvector semantic similarity & 5-factor scoring)
        ↓
Startup Applications (Submitted → Shortlisted)
        ↓
Evaluations (5-factor weighted scoring across evaluators)
        ↓
Startup Selection
        ↓
Pilot Project (Planned → Running → Validation)
        ↓
Milestones / KPIs / Evidence / Risks / Simulated Payments
        ↓
Validation & Advisory AI Performance Analysis
        ↓
Government Scale / Extend / Stop Decision
        ↓
Full Immutable Audit Trail
```

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (v24 / ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL 17 + `pgvector`
- **ORM**: Prisma ORM v6.4.1
- **Authentication**: JWT (JSON Web Tokens) + `bcrypt`
- **Validation**: Zod Schemas
- **Security**: Helmet, CORS, Express Rate Limiter
- **Testing**: Native Node.js HTTP integration test suite

---

## 📁 Folder Structure

```
Backend/
├── src/
│   ├── server.js              # Server entry point with graceful shutdown
│   ├── app.js                 # Express application setup
│   ├── config/
│   │   ├── env.js             # Environment variables loader
│   │   └── prisma.js          # Prisma client singleton
│   ├── middleware/
│   │   ├── auth.js            # JWT verification & user attachment
│   │   ├── rbac.js            # Role-based access control
│   │   ├── validate.js        # Zod request validation middleware
│   │   ├── rateLimiter.js     # Auth endpoint rate limiter
│   │   └── errorHandler.js    # Uniform error response handler
│   ├── routes/
│   │   ├── index.js           # API v1 central router
│   │   ├── authRoutes.js      # /auth
│   │   ├── userRoutes.js      # /users
│   │   ├── departmentRoutes.js# /departments
│   │   ├── challengeRoutes.js # /challenges & matching
│   │   ├── startupRoutes.js   # /startups & documents
│   │   ├── applicationRoutes.js # /applications & evaluations
│   │   ├── evaluationRoutes.js  # /evaluations
│   │   ├── pilotRoutes.js     # /pilots & dashboard
│   │   ├── kpiRoutes.js       # /kpis
│   │   ├── milestoneRoutes.js # /milestones
│   │   ├── evidenceRoutes.js  # /evidence
│   │   ├── riskRoutes.js      # /risks
│   │   ├── validationRoutes.js# /validations
│   │   ├── paymentRoutes.js   # /payments
│   │   ├── notificationRoutes.js # /notifications
│   │   ├── auditLogRoutes.js  # /audit-logs
│   │   ├── adminRoutes.js     # /admin
│   │   └── aiRoutes.js        # /ai
│   ├── controllers/           # Modular request/response handlers
│   ├── services/              # Pure business logic & database transactions
│   ├── schemas/               # Zod validation schemas
│   ├── utils/
│   │   ├── response.js        # Standardized response formatters
│   │   ├── lifecycle.js       # Finite state machine validator
│   │   ├── vector.js          # Cosine similarity & vector generator
│   │   └── logger.js          # Application logger
│   └── tests/                 # Automated test runners
├── prisma/
│   ├── schema.prisma          # 19 database models & relations
│   └── seed.js                # Realistic demo scenario seed script
├── package.json
└── .env.example
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in the `Backend/` directory:

```ini
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/setugov_db?schema=public"
JWT_SECRET="setugov_super_secret_jwt_key_2026"
JWT_EXPIRES_IN="7d"
AI_SERVICE_URL="http://localhost:8000"
AI_MOCK_MODE=true
NODE_ENV="development"
```

---

## 🚀 Quickstart & Setup

### Option A: Run with Docker Compose (Recommended for Team & Judges)
From the root directory:
```bash
# Starts PostgreSQL (with pgvector) & Backend API, syncs DB & seeds data
docker compose up --build
```
The API is live at `http://localhost:5000/api/v1` and DB on port `5432`.

---

### Option B: Run Locally (Without Docker)

#### 1. Install Dependencies
```bash
cd Backend
npm install
```

#### 2. Database Setup & Sync
```bash
# Push Prisma schema to PostgreSQL
npm run prisma:push

# Generate Prisma client
npm run prisma:generate

# Seed realistic demo scenario data
npm run prisma:seed
```

#### 3. Run Development Server
```bash
npm run dev
```

API Server will start on `http://localhost:5000` with base URL `http://localhost:5000/api/v1`.

### 4. Run Automated Tests
```bash
# Run complete End-to-End lifecycle test suite
npm test

# Run individual test suites
npm run test:health
npm run test:phase2
npm run test:phase3
npm run test:phase4_5
npm run test:phase6
npm run test:e2e
```

---

## 👥 Seed Demo Accounts

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@setugov.in` | `Password123!` | State Innovation Officer |
| **GOVERNMENT** | `ramesh.kumar@health.gov.in` | `Password123!` | Director, Dept of Health & Family Welfare |
| **GOVERNMENT** | `suresh.patil@transport.gov.in` | `Password123!` | Joint Director, Urban Mobility |
| **EVALUATOR** | `anita.desai@evaluators.setugov.in` | `Password123!` | Healthcare Systems Specialist |
| **EVALUATOR** | `rajesh.iyer@evaluators.setugov.in` | `Password123!` | AI & Computer Vision Expert (IISc) |
| **EVALUATOR** | `sunita.rao@evaluators.setugov.in` | `Password123!` | Procurement & Finance Analyst |
| **STARTUP** | `vikas@mediqueue.ai` | `Password123!` | MediQueue AI Technologies (Selected) |
| **STARTUP** | `ananya@cliniflow.io` | `Password123!` | CliniFlow Health Systems |

---

## 📡 Core API Endpoints

### 🔐 Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Authenticate and receive JWT token
- `GET /api/v1/auth/me` - Get current user profile
- `POST /api/v1/auth/logout` - Logout

### 🏢 Departments
- `POST /api/v1/departments` - Create department (Admin / Government)
- `GET /api/v1/departments` - List departments
- `GET /api/v1/departments/:department_id` - Get department by ID
- `PATCH /api/v1/departments/:department_id` - Update department

### 🎯 Challenges & Matching
- `POST /api/v1/challenges` - Create challenge in DRAFT status (Government only)
- `GET /api/v1/challenges` - List challenges (supports `status`, `department_id`, `search`)
- `GET /api/v1/challenges/:challenge_id` - Get challenge details
- `PATCH /api/v1/challenges/:challenge_id` - Update challenge
- `POST /api/v1/challenges/:challenge_id/publish` - Publish challenge (DRAFT → PUBLISHED)
- `POST /api/v1/challenges/:challenge_id/close` - Close challenge
- `POST /api/v1/challenges/:challenge_id/match` - Run pgvector + 5-factor matching algorithm
- `GET /api/v1/challenges/:challenge_id/matches` - Get ranked startup capability matches
- `GET /api/v1/challenges/:challenge_id/evaluation-summary` - Get aggregated evaluation summary

### 🚀 Startups
- `POST /api/v1/startups` - Create startup capability profile
- `GET /api/v1/startups` - List startups
- `GET /api/v1/startups/:startup_id` - Get startup details
- `PATCH /api/v1/startups/:startup_id` - Update profile
- `POST /api/v1/startups/:startup_id/documents` - Upload DPIIT / Verification documents
- `GET /api/v1/startups/:startup_id/documents` - List documents
- `PATCH /api/v1/startups/:startup_id/verification` - Verify startup (Government / Admin)

### 📝 Applications
- `POST /api/v1/challenges/:challenge_id/applications` - Submit proposal (Startup only)
- `GET /api/v1/applications/:application_id` - Get application details
- `PATCH /api/v1/applications/:application_id` - Edit DRAFT application
- `PATCH /api/v1/applications/:application_id/status` - Transition status (`SUBMITTED → SHORTLISTED → SELECTED / REJECTED`)

### ⚖️ Evaluations
- `POST /api/v1/applications/:application_id/evaluations` - Submit evaluation (Evaluator only)
- `GET /api/v1/applications/:application_id/evaluations` - Get evaluations for application
- `PATCH /api/v1/evaluations/:evaluation_id` - Edit evaluation score sheet

### 🧪 Pilots & Pilot Dashboard
- `POST /api/v1/pilots` - Create pilot for SELECTED startup (Government only)
- `GET /api/v1/pilots` - List pilots
- `GET /api/v1/pilots/:pilot_id` - Get pilot details
- `POST /api/v1/pilots/:pilot_id/start` - Start pilot (PLANNED → RUNNING)
- `POST /api/v1/pilots/:pilot_id/complete` - Complete pilot (VALIDATION → COMPLETED)
- `GET /api/v1/pilots/:pilot_id/dashboard` - Complete Pilot Dashboard (KPIs, time-series, milestones, evidence, risks, validations, payments, AI recommendation)

### 📊 KPIs & Measurements
- `POST /api/v1/pilots/:pilot_id/kpis` - Add KPI
- `GET /api/v1/pilots/:pilot_id/kpis` - List KPIs
- `POST /api/v1/pilots/:pilot_id/measurements` - Record actual measurement (updates KPI actual_value)
- `GET /api/v1/pilots/:pilot_id/measurements` - List measurement time-series

### 🏁 Milestones & Evidence
- `POST /api/v1/pilots/:pilot_id/milestones` - Add milestone
- `GET /api/v1/pilots/:pilot_id/milestones` - List milestones
- `POST /api/v1/pilots/:pilot_id/evidence` - Upload evidence item
- `GET /api/v1/pilots/:pilot_id/evidence` - List evidence items

### ⚠️ Risks & Validations
- `POST /api/v1/pilots/:pilot_id/risks` - Log risk (TECHNICAL, CYBERSECURITY, DATA, etc.)
- `GET /api/v1/pilots/:pilot_id/risks` - List risks
- `POST /api/v1/pilots/:pilot_id/validation` - Submit formal validation report

### 💳 Simulated Payments
- `POST /api/v1/pilots/:pilot_id/payments` - Schedule payment milestone
- `GET /api/v1/pilots/:pilot_id/payments` - List payments
- `PATCH /api/v1/payments/:payment_id/status` - Update payment status (`UPCOMING → PENDING → PAID / REJECTED`)

### 📈 Scale Decisions
- `POST /api/v1/pilots/:pilot_id/scale-decision` - Finalize SCALE / EXTEND / STOP decision (Government only)
- `GET /api/v1/pilots/:pilot_id/scale-decision` - Get scale decision

### 🤖 AI Service Integration
- `POST /api/v1/ai/challenges/generate` - AI challenge proposal generation
- `POST /api/v1/ai/challenges/:challenge_id/analyze` - AI challenge readiness analysis
- `POST /api/v1/ai/pilots/:pilot_id/analyze` - AI pilot performance evaluation & scale recommendation

### 🔔 Notifications & Audit Logs
- `GET /api/v1/notifications` - Get user notifications
- `PATCH /api/v1/notifications/:notification_id/read` - Mark notification read
- `PATCH /api/v1/notifications/read-all` - Mark all read
- `GET /api/v1/audit-logs` - Query immutable audit trail (Admin only)
- `GET /api/v1/admin/dashboard` - Admin aggregate dashboard (Admin only)

---

## 🛡️ Response Formats

### Standard Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Detailed error description",
    "details": [ ... ]
  }
}
```
