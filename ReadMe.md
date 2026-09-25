# SetuGov

**SetuGov** is a Government Innovation Procurement Lifecycle Platform that connects Government Departments, Innovation Challenges, Verified Startups, Multi-criteria Evaluations, Milestone-driven Pilots, Continuous KPI Measurement, and Evidence-based Scaling Decisions.

It is designed for **Government of Maharashtra Problem Statement 26136**, focused on enabling a startup-friendly public procurement mechanism through a structured innovation lifecycle.

> **AI interprets and assists. Deterministic code calculates and enforces rules. Humans decide and authorize.**

## Lifecycle Overview

SetuGov manages the complete journey from identifying a government problem to validating an innovation and preparing it for scale or procurement.

```text
Government Department
        ↓
Government Challenge (Draft → Published + AI Assisted Challenge Drafting) 
        ↓
AI-Assisted Startup Discovery & Matching
        ↓
Startup Applications / Participation
        ↓
Government Shortlisting
        ↓
Proposal Submission
        ↓
Independent Evaluator Assignment
        ↓
Proposal Evaluation (AI-Assisted + Human Evaluation)
        ↓
Government Pilot Decision
        ↓
Pilot Planning (Objectives / KPIs / Milestones)
        ↓
Controlled Pilot Execution
        ↓
KPI / Evidence / Risk Monitoring
        ↓
Pilot Validation (AI-Assisted Analysis + Human Validation)
        ↓
Government Decision (Scale / Extend / Stop)
        ↓
Procurement / Scale Readiness
        ↓
Immutable Audit Trail
```

### Core Decision Principle

SetuGov separates **AI assistance, deterministic computation, and human authority**:

- **AI** interprets information and provides recommendations or analysis.
- **Deterministic systems** calculate scores, enforce eligibility, validate rules, and track measurable conditions.
- **Authorized humans** make shortlisting, pilot, validation, scaling, and other consequential decisions.
- **Audit logs** preserve the history of important actions and decisions.

## Roles

Four primary roles drive the platform:

| Role | Primary Responsibility |
|---|---|
| **GOVERNMENT** | Create challenges, review startups, shortlist candidates, initiate pilots, and make final lifecycle decisions |
| **STARTUP** | Discover challenges, participate, submit proposals, and execute approved pilots |
| **EVALUATOR** | Independently evaluate proposals and perform assigned evaluation/validation activities |
| **ADMIN** | Platform governance, access management, user verification, and audit oversight |

Administrative users do not replace Government decision-makers or evaluators.

## Architecture

SetuGov is a monorepo containing three primary services and an end-to-end testing harness.

| Service | Path | Stack | Port |
|---|---|---|---|
| Frontend | `Frontend/` | React 19 + Vite + Tailwind CSS | 5173 |
| Backend API | `Backend/` | Node.js (ESM) + Express 5 + Prisma + PostgreSQL + pgvector | 5000 |
| AI Service | `AI/` | Python + FastAPI | 8000 |
| E2E Tests | `tests/` | Playwright | — |

```text
setugov/
│
├── Frontend/              # React SPA
├── Backend/               # Express REST API + Prisma ORM
├── AI/                    # FastAPI AI decision-support service
├── tests/                 # Playwright end-to-end tests
├── scripts/               # Standalone workflow / lifecycle scripts
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── playwright.config.js
```

## AI Architecture

SetuGov contains **five core AI Brains**, each focused on a different stage of the innovation lifecycle.

In addition, the platform contains an **AI Startup Comparator** as a separate decision-support capability.

The comparator does not replace the authoritative deterministic matching engine or Government decision-making.

### Five Core AI Brains + Comparator

| Capability | Endpoint | Purpose |
|---|---|---|
| **Brain 1 — Challenge Copilot** | `POST /ai/challenge` | Transform government problems into clearer, measurable challenges |
| **Brain 2 — Startup Match Intelligence** | `POST /ai/match` | Explain startup–challenge relevance and matching factors |
| **Brain 3 — Proposal Analysis** | `POST /ai/proposal` | Assist evaluators in analysing startup proposals |
| **Brain 4 — Pilot Intelligence** | `POST /ai/pilot` | Interpret pilot progress, KPIs, evidence, milestones, and risks |
| **Brain 5 — Document Assistance** | `POST /ai/document` | Generate structured drafts, summaries, and governance documents |
| **AI Startup Comparator** | `POST /ai/comparator` | Compare candidate startups and provide decision-support analysis |

### AI Responsibilities

The AI layer can:

- Interpret unstructured information
- Identify relevant information and patterns
- Explain matching factors
- Summarize proposals and pilot evidence
- Identify potential risks or missing information
- Generate document drafts
- Provide comparative decision-support

The AI layer does **not** independently authorize:

- Startup shortlisting
- Proposal approval
- Pilot approval
- Pilot validation
- Scaling
- Procurement decisions

## Deterministic Decision Systems

Alongside the AI capabilities, SetuGov uses deterministic systems for authoritative calculations and rule enforcement.

Examples include:

- Startup eligibility
- Technology compatibility
- Domain compatibility
- Readiness / TRL scoring
- Experience scoring
- Deployment-fit scoring
- Overall Match Score
- KPI status
- Pilot conditions
- Workflow state transitions
- Role and permission enforcement
- Evaluation rules
- Audit logging

For startup matching, the platform combines semantic similarity with deterministic multi-factor scoring.

| Factor | Weight |
|---|---:|
| Technology Match | 30% |
| Domain Match | 25% |
| Readiness | 20% |
| Experience | 15% |
| Deployment Fit | 10% |

The resulting scores support Government review and shortlisting; they do not automatically make the final decision.

## Startup Discovery & Matching

When a Government challenge is published, SetuGov can identify relevant verified startups using semantic similarity and deterministic matching logic.

The process combines:

1. Challenge information
2. Startup profile information
3. Eligibility rules
4. Semantic similarity using `pgvector`
5. Multi-factor deterministic scoring
6. AI-generated explanation

The platform distinguishes between:

- **Discovery** — identifying potentially relevant startups
- **Participation** — startup applications/engagement with the challenge
- **Shortlisting** — Government-controlled decision

This prevents AI discovery from being treated as automatic selection.

## Proposal Evaluation

After Government shortlisting and proposal submission:

1. An independent evaluator can be assigned.
2. The evaluator reviews the proposal.
3. Brain 3 provides advisory proposal analysis.
4. The evaluator performs the actual evaluation.
5. Evaluation criteria and scores are recorded.
6. Conflict-of-interest requirements are enforced.
7. Final evaluation records are preserved.
8. Government makes the applicable decision.

AI analysis is advisory and cannot modify the authoritative evaluator score.

## Controlled Pilot

Selected innovations can proceed to a controlled pilot.

A pilot can contain:

- Objectives
- Scope
- KPIs
- Baselines
- Targets
- Milestones
- Timeline
- Evidence
- Risks
- Issues
- Measurements
- Pilot reports

The platform provides continuous visibility into pilot progress rather than treating the pilot as a single final assessment.

## Pilot Intelligence

Brain 4 assists with interpretation of pilot information.

It can analyse:

- KPI performance
- Milestone progress
- Evidence
- Risks
- Issues
- Operational observations
- Pilot trends
- Potential areas requiring attention

The AI output remains advisory.

Pilot validation and final lifecycle decisions remain with authorized human stakeholders.

## Validation & Scaling

After pilot execution, Government and authorized evaluators can review the collected evidence.

The platform supports decisions such as:

- **Scale**
- **Extend**
- **Stop**

A successful pilot creates an evidence base that can support the next stage of innovation adoption and procurement readiness.

SetuGov focuses on the **innovation lifecycle and readiness process**. It does not claim to replace existing government procurement execution platforms.

## Governance & Accountability

Governance is built into the platform rather than treated as a separate process.

Key mechanisms include:

- Role-based access control
- Government-controlled decisions
- Independent evaluator workflows
- Conflict-of-interest declaration and recusal
- Structured evaluation criteria
- Immutable decision history
- Audit logging
- KPI and evidence tracking
- Workflow state enforcement
- Notifications
- Access and verification controls

The objective is to make important lifecycle actions **traceable, reviewable, and attributable**.

## Data Architecture

The Backend and PostgreSQL database are the authoritative source of business data.

```text
Authoritative Database
        ↓
Backend Business Logic
        ↓
 ┌──────┼─────────┐
 ↓      ↓         ↓
Frontend AI      Reports
```

The platform follows the principle:

> **One entity → One authoritative source → Many consumers**

AI services provide analysis and recommendations but do not become a second source of authoritative business state.

Historical and immutable records remain preserved where required for auditability.

## Technology Stack

### Frontend

- React 19
- Vite
- Tailwind CSS

### Backend

- Node.js 20+
- Express 5
- Prisma
- PostgreSQL 17
- pgvector
- JWT-based authentication

### AI Service

- Python 3.11+
- FastAPI
- Configurable AI provider
- Configurable embedding provider
- Pydantic
- Deterministic decision-support components

### Testing

- Node.js integration tests
- Pytest
- Playwright
- Lifecycle workflow scripts

## Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 17 with `pgvector`
- Docker + Docker Compose

## Quick Start — Docker

```bash
docker compose up
```

This starts:

- PostgreSQL with pgvector
- AI Service
- Backend API

The Backend container automatically runs the required Prisma database setup and seeds the database on startup.

### Optional Local LLM

To use a local LLM through Ollama:

```bash
docker compose --profile local-llm up
```

The Frontend is not included in the default Docker Compose stack and should be run separately.

## Manual Setup

### 1. Backend

```bash
cd Backend

npm install

cp .env.example .env

npx prisma generate

npx prisma db push

npm run dev
```

Backend:

```text
http://localhost:5000
```

### Backend Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret; required in production |
| `AI_SERVICE_URL` | AI service URL; defaults to `http://localhost:8000` |
| `EMAIL_PROVIDER` | `smtp`, `resend`, `sendgrid`, or `console` |
| `EMAIL_SMTP_HOST` | SMTP server |
| `EMAIL_SMTP_PORT` | SMTP port |
| `EMAIL_SMTP_SECURE` | SMTP TLS configuration |
| `EMAIL_SMTP_USER` | SMTP username |
| `EMAIL_SMTP_PASSWORD` | SMTP password |
| `EMAIL_API_KEY` | API key for Resend/SendGrid |
| `TURNSTILE_ENABLED` | Enable Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret |

> `EMAIL_PROVIDER=console` is intended for development/testing only and must not be used in production.

Each developer should maintain their own local `.env` file.

### 2. AI Service

```bash
cd AI

python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env

uvicorn main:app --reload --port 8000
```

The AI service supports configurable AI and embedding providers.

By default, the service can run using mock providers without external model/network dependencies.

Providers can be configured through environment variables.

### 3. Frontend

```bash
cd Frontend

npm install

cp .env.example .env

npm run dev
```

Frontend:

```text
http://localhost:5173
```

## Testing

### Backend

```bash
cd Backend

npm test
```

Security tests:

```bash
npm run test:security
```

Matching tests:

```bash
npm run test:matching
```

See `Backend/package.json` for the complete test command list.

### AI Service

```bash
cd AI

pytest
```

### End-to-End Tests

From the repository root:

```bash
npm install

npx playwright test
```

Interactive mode:

```bash
npx playwright test --ui
```

View the report:

```bash
npx playwright show-report
```

## Lifecycle Testing

The `scripts/` directory contains standalone workflow scripts for exercising complete platform workflows against a running Backend.

These scripts can test areas such as:

- Government challenges
- Startup participation
- Matching
- Proposals
- Evaluations
- Pilots
- Payments
- Notifications
- Audit logging
- Lifecycle transitions

They are useful for integration testing and deployment smoke tests.

## Production Notes

Before exposing SetuGov publicly:

- Set `NODE_ENV=production`
- Configure a strong `JWT_SECRET`
- Configure a real email provider
- Configure `CORS_ORIGIN`
- Configure Cloudflare Turnstile if required
- Configure the production database
- Configure the AI provider
- Configure the embedding provider
- Use `docker-compose.prod.yml`
- Verify database migrations and seed strategy
- Run backend, AI, and E2E test suites

`EMAIL_PROVIDER=console` must not be used in production.

## Design Principles

### 1. AI-Assisted, Not AI-Controlled

AI provides interpretation and recommendations. Humans retain authority over consequential decisions.

### 2. Deterministic Where Rules Matter

Eligibility, scoring, workflow rules, permissions, and measurable conditions are enforced through deterministic systems.

### 3. Evidence Before Scaling

Pilot performance, KPIs, milestones, and evidence provide the basis for progression toward scaling.

### 4. Independent Evaluation

Evaluator workflows provide structured and governed assessment separate from Government's final decision authority.

### 5. One Source of Truth

Business data is maintained authoritatively in the Backend/database rather than duplicated across independent services.

### 6. Full Lifecycle Visibility

SetuGov connects discovery, evaluation, piloting, validation, and scale readiness into one traceable innovation lifecycle.

## Procurement Boundary

SetuGov is focused on the **government innovation lifecycle**, not replacing existing procurement execution platforms.

Its responsibility is to help move an innovation from:

```text
Government Problem
        ↓
Challenge
        ↓
Startup Discovery
        ↓
Evaluation
        ↓
Pilot
        ↓
Evidence
        ↓
Validation
        ↓
Scale / Procurement Readiness
```

The appropriate government procurement mechanism can then be used for actual procurement and deployment.

## License

ISC