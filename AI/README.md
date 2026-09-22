# SetuGov AI Service

AI decision-support layer for **Government of Maharashtra Problem Statement 26136** — a startup-friendly public procurement mechanism.

> **AI interprets and assists. Deterministic code calculates and enforces rules. Humans decide and authorize.**

---

## Architecture

```
                 SETUGOV AI SERVICE
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
      Challenge       Startup        Proposal
      Copilot         Match          Analysis
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                  Pilot Intelligence
                         │
                         ▼
                 Evidence + Validation
                         │
                         ▼
                 Deterministic Rules
                         │
                         ▼
                SCALE / EXTEND / STOP
                         │
                         ▼
                 Human Authority

       Document Assistance
              ↕
     Available throughout
        the lifecycle
```

### Six AI Brains

| Brain | Endpoint | Purpose |
|-------|----------|---------|
| 1 — Challenge Copilot | `POST /ai/challenge` | Transform problems into measurable challenges |
| 2 — Startup Match | `POST /ai/match` | Explain startup-challenge relevance |
| 3 — Proposal Analysis | `POST /ai/proposal` | Assist evaluators with proposals |
| 4 — Pilot Intelligence | `POST /ai/pilot` | Interpret pilot evidence |
| 5 — Document Assistance | `POST /ai/document` | Generate document drafts |
| 6 — Startup Comparator | `POST /ai/comparator` | Rank multiple startup candidates for one challenge |

### Deterministic Components (no LLM call)

| Component | Endpoint | Responsibility |
|-----------|----------|---------------|
| Readiness Score | (used within Brain 1) | Challenge completeness (0–100) |
| Match Score | (used within Brain 2/6) | Weighted 5-dimension startup scoring |
| KPI Status | (used within Brain 4) | ON_TARGET / NEAR_TARGET / BELOW_TARGET / INSUFFICIENT_DATA |
| Decision Engine | `POST /ai/decision` | SCALE / EXTEND / STOP composite-score recommendation |
| Scale Recommendation | `POST /ai/pilots/{pilot_id}/scale-recommendation` | Thin adapter over the Decision Engine — accepts either pre-aggregated metrics or raw pilot data (KPIs/evidence/risks), which are aggregated first |
| Embeddings | `POST /ai/embeddings` | Provider-agnostic vector generation (no persistence, no similarity calc — see Configuration) |

### Advisory Risk Identification (LLM identifies, Python counts)

| Component | Endpoint | Responsibility |
|-----------|----------|---------------|
| Risk Analysis | `POST /ai/risks/analyze` | LLM identifies risks across 7 dimensions; Python recomputes severity counts and the overall score from that list — never trusted from the LLM directly |

**The LLM interprets. Python calculates. Humans decide.**

---

## Folder Structure

```
AI/
├── .env                    # Local config (gitignored)
├── .env.example            # Config template
├── .gitignore
├── requirements.txt
├── README.md
├── main.py                 # FastAPI application
├── config.py               # pydantic-settings configuration
│
├── prompts/                # Prompt builders per brain
│   ├── challenge_copilot.py
│   ├── match_explanation.py
│   ├── proposal_analysis.py
│   ├── pilot_intelligence.py
│   └── document_assistance.py
│
├── schemas/                # Pydantic request/response models
│   ├── requests.py
│   └── responses.py
│
├── services/               # Business logic
│   ├── ai_service.py       # Brain orchestrator (depends only on AIProvider)
│   └── decision_engine.py  # Pure deterministic logic
│
├── providers/              # Provider-agnostic AI transport layer
│   ├── base.py             # AIProvider interface, shared exceptions, JSON repair
│   ├── factory.py          # get_provider() — the ONLY place that branches on AI_PROVIDER
│   ├── mock_provider.py    # No network calls; safe default for dev/tests
│   ├── api_provider.py     # Generic chat-completions-compatible adapter
│   └── ollama_provider.py  # Ollama-native (/api/generate) adapter
│
└── tests/                  # Full test suite (no real AI provider needed)
    ├── test_challenge.py
    ├── test_match.py
    ├── test_proposal.py
    ├── test_pilot.py
    ├── test_document.py
    ├── test_decision_engine.py
    └── test_input_hardening.py   # sanitizer, size limits, error envelopes
```

---

## Installation

### Prerequisites
- Python 3.11+
- An AI backend to point the service at — any of:
  - Nothing at all (default `AI_PROVIDER=mock`, no network calls, useful for exploring the API shape)
  - [Ollama](https://ollama.ai/) installed and running locally
  - Any cloud/managed endpoint that speaks the OpenAI-compatible chat-completions convention

### Setup

```bash
cd AI

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### (Optional) Ollama Setup

Only needed if you want to point the service at a local Ollama install.

```bash
# Install a model (example — any model works, none is hardcoded)
ollama pull llama3.2:3b

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

---

## Configuration

Copy `.env.example` to `.env` and configure. **No AI vendor, provider, or
model is hardcoded anywhere in the codebase** — `AI_PROVIDER` selects the
*adapter*, and `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` point it at
whatever backend you choose:

```env
# AI_PROVIDER: "mock" (default, no network calls) | "api_compatible"
# (any chat-completions-shaped endpoint) | "ollama_native" (Ollama's
# native /api/generate)
AI_PROVIDER=mock
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
AI_TIMEOUT=120

AI_SERVICE_HOST=0.0.0.0
AI_SERVICE_PORT=8000
LOG_LEVEL=INFO

# Request limits (defaults shown)
MAX_INPUT_CHARS=20000        # longest single text field
MAX_LIST_ITEMS=200           # longest list field
MAX_REQUEST_BYTES=1000000    # largest request body
```

Three concrete configurations:

```env
# 1) Local Ollama via its native API
AI_PROVIDER=ollama_native
AI_BASE_URL=http://localhost:11434
AI_MODEL=llama3.2:3b

# 2) Local Ollama via its OpenAI-compatible API (same server, different route)
AI_PROVIDER=api_compatible
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.2:3b

# 3) A cloud / managed OpenAI-compatible endpoint
AI_PROVIDER=api_compatible
AI_BASE_URL=https://your-provider-endpoint.example.com/v1
AI_MODEL=your-model-name
AI_API_KEY=your-api-key
```

Switching between any of these — or to a different model within the same
adapter — is a `.env` change only. `services/ai_service.py`, the prompt
builders, the parsers, and every route stay untouched; they depend on the
`AIProvider` interface (`providers/base.py`), never on a concrete vendor.
Adding support for a wire format not covered by `api_compatible` or
`ollama_native` means adding one new class in `providers/` plus one branch
in `providers/factory.py::get_provider()` — nothing else changes.

---

## Running the Service

```bash
uvicorn main:app --reload --port 8000
```

Or:

```bash
python main.py
```

The service is available at `http://localhost:8000`.

API documentation: `http://localhost:8000/docs`

---

## API Endpoints

### Health

```
GET /health              → always responds, even if the AI provider is down
GET /health/ai            → checks configured chat/generation provider connectivity
GET /health/embeddings    → checks configured embedding provider connectivity
```

### AI Brains

```
POST /ai/challenge        → Brain 1: Challenge Copilot
POST /ai/match             → Brain 2: Startup Match Explanation
POST /ai/proposal          → Brain 3: Proposal Analysis
POST /ai/pilot             → Brain 4: Pilot Intelligence
POST /ai/document          → Brain 5: Document Assistance
POST /ai/comparator        → Brain 6: Startup Comparator (rank multiple candidates)
```

### Deterministic / Advisory Endpoints

```
POST /ai/decision                                 → SCALE/EXTEND/STOP from pre-aggregated metrics (no LLM)
POST /ai/pilots/{pilot_id}/scale-recommendation   → SCALE/EXTEND/STOP from raw or pre-aggregated pilot data (no LLM)
POST /ai/risks/analyze                            → 7-dimension risk identification (LLM identifies, Python counts/scores)
POST /ai/embeddings                               → Provider-agnostic embedding vectors (stateless — no persistence, no similarity calc)
```

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "warnings": []
}
```

`warnings` lists input fields whose text was filtered by the prompt-injection
sanitizer (field path and match count only — the offending text is never
echoed). It is empty for clean input.

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Cannot connect to AI provider at http://localhost:11434/v1"
  }
}
```

Error codes: `PROVIDER_UNAVAILABLE`, `AI_TIMEOUT`, `INVALID_AI_RESPONSE`, `PROVIDER_CONFIGURATION_ERROR`, `AI_SCHEMA_VALIDATION_ERROR`, `INVALID_REQUEST`, `REQUEST_TOO_LARGE`, `INTERNAL_ERROR`

---

## Sample Requests

### Brain 1 — Challenge Copilot

```bash
curl -X POST http://localhost:8000/ai/challenge \
  -H "Content-Type: application/json" \
  -d '{
    "problem": {
      "title": "Long patient waiting times in government hospitals",
      "description": "Patients in government hospitals experience waiting times averaging 90 minutes before receiving service.",
      "current_process": "Manual token-based queue system",
      "baseline": "Average waiting time: 90 minutes",
      "location": "Maharashtra, India"
    },
    "outcome": {
      "desired_outcome": "Reduce patient waiting time significantly",
      "success_definition": "Measurable reduction in average waiting time"
    },
    "measurement": {
      "kpis": [{
        "name": "Average Waiting Time",
        "unit": "minutes",
        "baseline": 90,
        "target": 60,
        "direction": "decrease",
        "measurement_method": "Digital timestamp tracking",
        "weight": 50
      }]
    },
    "pilot": {
      "duration": "60 days",
      "sites": ["District Hospital A", "District Hospital B"],
      "budget": "₹4,00,000"
    }
  }'
```

### Brain 2 — Startup Match

```bash
curl -X POST http://localhost:8000/ai/match \
  -H "Content-Type: application/json" \
  -d '{
    "challenge": {
      "title": "Reduce hospital waiting times",
      "description": "Long patient waiting times in government hospitals.",
      "domain": "Healthcare",
      "technology_categories": ["queue management", "workflow automation"]
    },
    "startup": {
      "name": "MediFlow AI",
      "description": "AI-powered queue management for hospitals.",
      "technologies": ["queue management", "predictive analytics"],
      "domain": "Healthcare",
      "experience": "3 government hospital deployments",
      "deployments": ["District Hospital Pune"],
      "team_size": 15
    }
  }'
```

### Brain 4 — Pilot Intelligence

```bash
curl -X POST http://localhost:8000/ai/pilot \
  -H "Content-Type: application/json" \
  -d '{
    "challenge_title": "Reduce hospital waiting times",
    "startup_name": "MediFlow AI",
    "pilot_duration": "60 days",
    "kpi_results": [{
      "name": "Average Waiting Time",
      "unit": "minutes",
      "baseline": 90,
      "target": 60,
      "actual": 54,
      "direction": "decrease"
    }],
    "milestones": [
      {"name": "Setup", "status": "completed"},
      {"name": "Go-live", "status": "completed"}
    ]
  }'
```

---

## Testing

All tests run **without any real AI provider** — the `AIProvider` interface is mocked.

```bash
# Run all tests
pytest -v

# Run specific brain
pytest tests/test_challenge.py -v
pytest tests/test_decision_engine.py -v
```

---

## Error Handling

| Error | HTTP | Code |
|-------|------|------|
| AI provider unreachable | 503 | `PROVIDER_UNAVAILABLE` |
| Request timeout | 504 | `AI_TIMEOUT` |
| Malformed LLM output | 502 | `INVALID_AI_RESPONSE` |
| AI provider misconfigured (missing base URL / model) | 500 | `PROVIDER_CONFIGURATION_ERROR` |
| Schema validation failure | 422 | `AI_SCHEMA_VALIDATION_ERROR` |
| Malformed / oversized field in the request | 422 | `INVALID_REQUEST` |
| Request body over `MAX_REQUEST_BYTES` | 413 | `REQUEST_TOO_LARGE` |
| Any other unexpected error | 500 | `INTERNAL_ERROR` |

Raw stack traces are never exposed to API consumers.

---

## Input Hardening

Every LLM-backed route (`/ai/challenge`, `/match`, `/proposal`, `/pilot`,
`/document`) runs the request through `sanitize_request()` **before** any
prompt is built, so the model and the deterministic engine only ever see
cleaned text.

- **Prompt-injection filtering** — instruction-override phrases, chat-template
  delimiters (`<|im_start|>`, `[INST]`, …) and role-spoofing lines
  (`system: you must …`) are replaced with `[security filtered: …]`. Ordinary
  text such as `System: manual queue` or `### System Architecture` is left alone.
- **Unicode hygiene** — NFKC normalisation; invisible control characters
  (zero-width space, bidi overrides, …) are stripped. Zero-width joiner/non-joiner
  are kept because Devanagari (Marathi/Hindi) text needs them.
- **Size limits** — per-field character limit, per-list item limit, and a
  request-body limit (see Configuration). Oversized input gets a small
  `422`/`413` error, never an echo of the payload.
- **Regression guard** — `tests/test_input_hardening.py` fails if an `/ai/*`
  route is added without sanitization.

Injection filtering is pattern-based, not a guarantee; it is one layer alongside
the prompt-level "treat supplied fields as data" rules and the deterministic
post-processing in the parsers. The body-size check relies on the
`Content-Length` header.

---

## AI Authority Limitations

This service is a **decision-support tool**. It explicitly does NOT:

- Make procurement decisions
- Declare legal compliance or eligibility
- Select or rank startups with final authority
- Invent baselines, evidence, or credentials
- Generate legally binding documents
- Claim procurement or legal authority

All outputs require authorized human review.

---

## Integration Architecture

```
Frontend → Backend → AI Service (this) → AIProvider (configured adapter)
                                       → Deterministic Engine
```

- The frontend **never** calls the AI provider directly
- The AI service is **independently runnable** — no frontend required
- The backend maps its data into the AI service's canonical contracts
- The AI service returns typed, validated responses
- Which AI provider/model sits behind `AIProvider` is a deployment-time
  configuration choice (see **Configuration** above), not a code dependency
