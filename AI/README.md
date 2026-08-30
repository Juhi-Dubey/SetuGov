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

### Five AI Brains

| Brain | Endpoint | Purpose |
|-------|----------|---------|
| 1 — Challenge Copilot | `POST /ai/challenge` | Transform problems into measurable challenges |
| 2 — Startup Match | `POST /ai/match` | Explain startup-challenge relevance |
| 3 — Proposal Analysis | `POST /ai/proposal` | Assist evaluators with proposals |
| 4 — Pilot Intelligence | `POST /ai/pilot` | Interpret pilot evidence |
| 5 — Document Assistance | `POST /ai/document` | Generate document drafts |

### Deterministic Components

| Component | Responsibility |
|-----------|---------------|
| Readiness Score | Challenge completeness (0–100) |
| Match Score | Weighted 5-dimension startup scoring |
| KPI Status | ON_TARGET / NEAR_TARGET / BELOW_TARGET / INSUFFICIENT_DATA |
| Decision Engine | SCALE / EXTEND / STOP recommendation |

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
│   ├── ollama_client.py    # ONLY module that talks to Ollama
│   ├── ai_service.py       # Brain orchestrator
│   └── decision_engine.py  # Pure deterministic logic
│
└── tests/                  # Full test suite (no Ollama needed)
    ├── test_challenge.py
    ├── test_match.py
    ├── test_proposal.py
    ├── test_pilot.py
    ├── test_document.py
    └── test_decision_engine.py
```

---

## Installation

### Prerequisites
- Python 3.11+
- [Ollama](https://ollama.ai/) installed and running

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

### Ollama Setup

```bash
# Install a model (example)
ollama pull llama3.1:8b

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

---

## Configuration

Copy `.env.example` to `.env` and configure:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT=120
AI_SERVICE_HOST=0.0.0.0
AI_SERVICE_PORT=8000
LOG_LEVEL=INFO
```

The model is fully replaceable by changing `OLLAMA_MODEL`. No model name is hardcoded in the codebase.

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
GET /health              → always responds, even if Ollama is down
GET /health/ollama       → checks Ollama connectivity
```

### AI Brains

```
POST /ai/challenge       → Brain 1: Challenge Copilot
POST /ai/match           → Brain 2: Startup Match Explanation
POST /ai/proposal        → Brain 3: Proposal Analysis
POST /ai/pilot           → Brain 4: Pilot Intelligence
POST /ai/document        → Brain 5: Document Assistance
```

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "OLLAMA_UNAVAILABLE",
    "message": "Cannot connect to Ollama at http://localhost:11434"
  }
}
```

Error codes: `OLLAMA_UNAVAILABLE`, `AI_TIMEOUT`, `INVALID_AI_RESPONSE`, `AI_SCHEMA_VALIDATION_ERROR`

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

All tests run **without Ollama** — the LLM client is mocked.

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
| Ollama unreachable | 503 | `OLLAMA_UNAVAILABLE` |
| Request timeout | 504 | `AI_TIMEOUT` |
| Malformed LLM output | 502 | `INVALID_AI_RESPONSE` |
| Schema validation failure | 422 | `AI_SCHEMA_VALIDATION_ERROR` |

Raw stack traces are never exposed to API consumers.

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
Frontend → Backend → AI Service (this) → Ollama
                                       → Deterministic Engine
```

- The frontend **never** calls Ollama directly
- The AI service is **independently runnable** — no frontend required
- The backend maps its data into the AI service's canonical contracts
- The AI service returns typed, validated responses
