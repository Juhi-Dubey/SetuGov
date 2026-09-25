# SetuGov

**SetuGov** is a Government Innovation Procurement Lifecycle Platform. It connects Government Departments, Innovation Challenges, Verified Startups, Multi-criteria Evaluations, Milestone-driven Pilots, Continuous KPI Measurement, and Statewide Scaling Decisions — built for **Government of Maharashtra Problem Statement 26136**, a startup-friendly public procurement mechanism.

> AI interprets and assists. Deterministic code calculates and enforces rules. Humans decide and authorize.

## Lifecycle Overview

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

Four roles drive the platform: **GOVERNMENT**, **STARTUP**, **EVALUATOR**, **ADMIN**.

## Architecture

The project is a monorepo with three services plus an E2E test harness:

| Service | Path | Stack | Port |
|---|---|---|---|
| Frontend | `Frontend/` | React 19 + Vite + Tailwind CSS | 5173 |
| Backend API | `Backend/` | Node.js (ESM) + Express 5 + Prisma + PostgreSQL 17/pgvector | 5000 |
| AI Service | `AI/` | Python + FastAPI | 8000 |
| E2E Tests | `tests/` | Playwright | — |

```
setugov/
├── Frontend/        # React SPA (Vite)
├── Backend/         # Express REST API + Prisma ORM
├── AI/              # FastAPI decision-support service ("Six AI Brains")
├── tests/           # Playwright end-to-end specs
├── scripts/         # Standalone workflow / lifecycle test scripts
├── docker-compose.yml
├── docker-compose.prod.yml
└── playwright.config.js
```

### AI Service — Six Brains

| Brain | Endpoint | Purpose |
|---|---|---|
| 1 — Challenge Copilot | `POST /ai/challenge` | Transform problems into measurable challenges |
| 2 — Startup Match | `POST /ai/match` | Explain startup–challenge relevance |
| 3 — Proposal Analysis | `POST /ai/proposal` | Assist evaluators with proposals |
| 4 — Pilot Intelligence | `POST /ai/pilot` | Interpret pilot evidence |
| 5 — Document Assistance | `POST /ai/document` | Generate document drafts |
| 6 — Startup Comparator | `POST /ai/comparator` | Rank candidate startups for one challenge |

Deterministic (non-LLM) components — Readiness Score, Match Score, KPI Status — run alongside the AI brains and are what actually gate decisions.

## Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 17 with the `pgvector` extension (or use the provided Docker service)
- Docker + Docker Compose (recommended for local dev)

## Quick Start — Docker (recommended)

```bash
docker compose up
```

This brings up Postgres (pgvector), the AI service, and the Backend (with hot-reload) together. The Backend container automatically runs `prisma db push` and seeds the database on start.

To also run a local LLM via Ollama instead of a hosted provider:

```bash
docker compose --profile local-llm up
```

The Frontend is **not** included in `docker-compose.yml` — run it separately (see below).

## Manual Setup (without Docker)

### 1. Backend

```bash
cd Backend
npm install
cp .env.example .env   # then fill in the values below
npx prisma generate
npx prisma db push
npm run dev             # http://localhost:5000
```

Key variables in `Backend/.env`:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | required in production; auto-defaulted in dev/test |
| `AI_SERVICE_URL` | defaults to `http://localhost:8000` |
| `EMAIL_PROVIDER` | `smtp` \| `resend` \| `sendgrid` \| `console`. **Must not be `console` in production** — the app throws on startup if it is. In `console` mode, verification/notification emails are only logged, never actually delivered. |
| `EMAIL_SMTP_HOST` / `PORT` / `SECURE` / `USER` / `PASSWORD` | required when `EMAIL_PROVIDER=smtp` (e.g. Gmail SMTP needs a 16-character App Password, not your login password) |
| `EMAIL_API_KEY` | required when `EMAIL_PROVIDER` is `resend` or `sendgrid` |
| `TURNSTILE_ENABLED` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile CAPTCHA — off by default in dev |

`Backend/.env` is git-ignored and **local to each machine** — every developer needs their own copy with working email credentials for auth flows (registration, verification, invites) to actually deliver mail.

### 2. AI Service

```bash
cd AI
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

`ai_provider` and `embedding_provider` default to `mock` (no network calls) so the service runs standalone with no external dependency. Set them to `api_compatible` or `ollama_native` to use a real model.

### 3. Frontend

```bash
cd Frontend
npm install
cp .env.example .env
npm run dev              # http://localhost:5173
```

## Testing

**Backend integration tests** (native Node.js HTTP suite):

```bash
cd Backend
npm test                 # full e2e suite
npm run test:security    # security-focused suite
npm run test:matching    # matching engine
# see Backend/package.json for the full list of test:* scripts
```

**AI service tests** (pytest):

```bash
cd AI
pytest
```

**End-to-end tests** (Playwright, from repo root):

```bash
npm install
npx playwright test
npx playwright test --ui      # interactive mode
npx playwright show-report
```

**Standalone lifecycle scripts** (`scripts/`) exercise full multi-role workflows (procurement, pilots, payments, audit logging, notifications) against a running Backend — useful for manual smoke-testing a deployed environment.

## Production Notes

- Set `NODE_ENV=production` in the Backend — this enforces `EMAIL_PROVIDER` cannot be `console` and requires `JWT_SECRET` to be explicitly set.
- Use `docker-compose.prod.yml` for a production-oriented compose configuration.
- Configure `CORS_ORIGIN`, `TURNSTILE_ENABLED`, and real SMTP/Resend/SendGrid credentials before exposing the platform publicly.

## License

ISC