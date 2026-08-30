"""
SetuGov AI Service — FastAPI Application

Entry point for the AI decision-support service.
Routes remain thin — all business logic lives in services/.
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from schemas.requests import (
    ChallengeCopilotRequest,
    DocumentAssistanceRequest,
    MatchExplanationRequest,
    PilotIntelligenceRequest,
    ProposalAnalysisRequest,
)
from schemas.responses import APIResponse, ErrorDetail, ErrorResponse
from services.ai_service import AIService
from services.ollama_client import (
    InvalidAIResponseError,
    OllamaClient,
    OllamaTimeoutError,
    OllamaUnavailableError,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("setugov.ai")

# ---------------------------------------------------------------------------
# Lifespan — create shared httpx client
# ---------------------------------------------------------------------------
_ollama_client: OllamaClient | None = None
_ai_service: AIService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _ollama_client, _ai_service
    _ollama_client = OllamaClient(
        base_url=settings.ollama_base_url,
        model=settings.ollama_model,
        timeout=settings.ollama_timeout,
    )
    _ai_service = AIService(ollama_client=_ollama_client)
    logger.info(
        "AI Service started — model=%s, ollama=%s",
        settings.ollama_model,
        settings.ollama_base_url,
    )
    yield
    await _ollama_client.close()
    logger.info("AI Service shut down")


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SetuGov AI Service",
    description="AI decision-support layer for Government of Maharashtra startup procurement.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Middleware — request logging
# ---------------------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000)
    logger.info(
        "rid=%s method=%s path=%s status=%s duration=%dms",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type and "charset" not in content_type:
        response.headers["content-type"] = "application/json; charset=utf-8"
    return response


# ---------------------------------------------------------------------------
# Error Handlers
# ---------------------------------------------------------------------------
def _error_response(code: str, message: str, status: int = 500) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        media_type="application/json; charset=utf-8",
        content=ErrorResponse(
            success=False,
            error=ErrorDetail(code=code, message=message),
        ).model_dump(),
    )


@app.exception_handler(OllamaUnavailableError)
async def handle_ollama_unavailable(request: Request, exc: OllamaUnavailableError):
    logger.error("Ollama unavailable: %s", exc)
    return _error_response("OLLAMA_UNAVAILABLE", str(exc), 503)


@app.exception_handler(OllamaTimeoutError)
async def handle_ollama_timeout(request: Request, exc: OllamaTimeoutError):
    logger.error("Ollama timeout: %s", exc)
    return _error_response("AI_TIMEOUT", str(exc), 504)


@app.exception_handler(InvalidAIResponseError)
async def handle_invalid_ai_response(request: Request, exc: InvalidAIResponseError):
    logger.error("Invalid AI response: %s", exc)
    return _error_response("INVALID_AI_RESPONSE", str(exc), 502)


@app.exception_handler(ValueError)
async def handle_validation_error(request: Request, exc: ValueError):
    logger.error("Validation error: %s", exc)
    return _error_response("AI_SCHEMA_VALIDATION_ERROR", str(exc), 422)


# ---------------------------------------------------------------------------
# Health Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    """Service liveness — always responds even if Ollama is down."""
    return {"status": "healthy", "service": "setugov-ai", "version": "1.0.0"}


@app.get("/health/ollama")
async def health_ollama():
    """Check Ollama connectivity."""
    assert _ollama_client is not None
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            resp.raise_for_status()
            return {
                "status": "connected",
                "ollama_url": settings.ollama_base_url,
                "model": settings.ollama_model,
            }
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "ollama_url": settings.ollama_base_url,
                "error": str(exc),
            },
        )


# ---------------------------------------------------------------------------
# Brain 1 — Challenge Copilot
# ---------------------------------------------------------------------------
@app.post("/ai/challenge", response_model=APIResponse)
async def challenge_copilot(request: ChallengeCopilotRequest):
    """Transform a government problem into a measurable innovation challenge."""
    assert _ai_service is not None
    result = await _ai_service.analyze_challenge(request)
    return APIResponse(success=True, data=result.model_dump())


# ---------------------------------------------------------------------------
# Brain 2 — Startup Match Explanation
# ---------------------------------------------------------------------------
@app.post("/ai/match", response_model=APIResponse)
async def match_explanation(request: MatchExplanationRequest):
    """Explain why a startup matches a challenge (scoring is deterministic)."""
    assert _ai_service is not None
    result = await _ai_service.explain_match(request)
    return APIResponse(success=True, data=result.model_dump())


# ---------------------------------------------------------------------------
# Brain 3 — Proposal Analysis
# ---------------------------------------------------------------------------
@app.post("/ai/proposal", response_model=APIResponse)
async def proposal_analysis(request: ProposalAnalysisRequest):
    """Assist evaluators in understanding a startup proposal."""
    assert _ai_service is not None
    result = await _ai_service.analyze_proposal(request)
    return APIResponse(success=True, data=result.model_dump())


# ---------------------------------------------------------------------------
# Brain 4 — Pilot Intelligence
# ---------------------------------------------------------------------------
@app.post("/ai/pilot", response_model=APIResponse)
async def pilot_intelligence(request: PilotIntelligenceRequest):
    """Interpret pilot evidence with deterministic KPI calculations."""
    assert _ai_service is not None
    result = await _ai_service.interpret_pilot(request)
    return APIResponse(success=True, data=result.model_dump())


# ---------------------------------------------------------------------------
# Brain 5 — Document Assistance
# ---------------------------------------------------------------------------
@app.post("/ai/document", response_model=APIResponse)
async def document_assistance(request: DocumentAssistanceRequest):
    """Generate document drafts for authorized review."""
    assert _ai_service is not None
    result = await _ai_service.assist_document(request)
    return APIResponse(success=True, data=result.model_dump())


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.ai_service_host,
        port=settings.ai_service_port,
        reload=True,
    )
