"""
SetuGov AI Service — FastAPI Application

Entry point for the AI decision-support service.
Routes remain thin — all business logic lives in services/.
"""

import json
import logging
import time
import uuid
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from config import get_settings
from providers.base import AIProvider, EmbeddingDimensionError, EmbeddingProvider, InvalidAIResponseError, ProviderTimeoutError, ProviderUnavailableError
from providers.factory import ProviderConfigurationError, get_embedding_provider, get_provider
from schemas.requests import (
    ChallengeCopilotRequest,
    DecisionInput,
    DocumentAssistanceRequest,
    EmbeddingRequest,
    MatchExplanationRequest,
    PilotIntelligenceRequest,
    ProposalAnalysisRequest,
    RiskAnalysisRequest,
    ScaleRecommendationRequest,
    StartupComparatorRequest,
)
from schemas.responses import APIResponse, EmbeddingResponse, ErrorDetail, ErrorResponse
from services.ai_service import AIService
from services.decision_engine import DecisionEngine
from services.input_sanitizer import sanitize_request

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
_ai_provider: AIProvider | None = None
_ai_service: AIService | None = None
_embedding_provider: EmbeddingProvider | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _ai_provider, _ai_service, _embedding_provider
    _ai_provider = get_provider(settings)
    _ai_service = AIService(ai_provider=_ai_provider)
    _embedding_provider = get_embedding_provider(settings)
    logger.info(
        "AI Service started — provider=%s, model=%s, base_url=%s, "
        "embedding_provider=%s, embedding_model=%s",
        settings.ai_provider,
        settings.ai_model,
        settings.ai_base_url,
        settings.embedding_provider,
        settings.embedding_model,
    )
    yield
    await _ai_provider.close()
    await _embedding_provider.close()
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
    allow_origins=settings.allowed_origins,
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

    # Reject oversized bodies up front (checked via Content-Length; the
    # per-field limits in schemas.requests still apply to whatever gets parsed).
    declared = request.headers.get("content-length", "")
    if declared.isdigit() and int(declared) > settings.max_request_bytes:
        response = _error_response(
            "REQUEST_TOO_LARGE",
            f"Request body exceeds the maximum size of {settings.max_request_bytes} bytes.",
            413,
        )
    else:
        try:
            response = await call_next(request)
        except Exception:  # noqa: BLE001 — last-resort catch-all, see below
            # Full traceback goes to the server log only; the caller gets a
            # generic message so internals are never exposed.
            logger.exception("rid=%s unhandled exception on %s", request_id, request.url.path)
            response = _error_response(
                "INTERNAL_ERROR", "An unexpected error occurred.", 500
            )

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


@app.exception_handler(RequestValidationError)
async def handle_request_validation(request: Request, exc: RequestValidationError):
    """
    Standard error envelope for malformed / oversized requests.

    FastAPI's default 422 body echoes the submitted value back (``input``),
    which for an oversized payload means echoing megabytes. Only ``type``,
    ``loc`` and ``msg`` are returned. The legacy ``detail`` key is kept so
    existing consumers that read it keep working.
    """
    detail = [
        {
            "type": err.get("type"),
            "loc": list(err.get("loc", ())),
            "msg": str(err.get("msg", "")).removeprefix("Value error, "),
        }
        for err in exc.errors()
    ]
    first = detail[0] if detail else {"loc": [], "msg": "Invalid request."}
    where = ".".join(str(part) for part in first["loc"] if part != "body")
    message = f"{where}: {first['msg']}" if where else first["msg"]
    logger.warning("Invalid request on %s: %s", request.url.path, message)
    body = ErrorResponse(
        success=False, error=ErrorDetail(code="INVALID_REQUEST", message=message)
    ).model_dump()
    body["detail"] = detail
    return JSONResponse(
        status_code=422, media_type="application/json; charset=utf-8", content=body
    )


@app.exception_handler(ProviderUnavailableError)
async def handle_provider_unavailable(request: Request, exc: ProviderUnavailableError):
    logger.error("AI provider unavailable: %s", exc)
    return _error_response("PROVIDER_UNAVAILABLE", str(exc), 503)


@app.exception_handler(ProviderTimeoutError)
async def handle_provider_timeout(request: Request, exc: ProviderTimeoutError):
    logger.error("AI provider timeout: %s", exc)
    return _error_response("AI_TIMEOUT", str(exc), 504)


@app.exception_handler(InvalidAIResponseError)
async def handle_invalid_ai_response(request: Request, exc: InvalidAIResponseError):
    logger.error("Invalid AI response: %s", exc)
    return _error_response("INVALID_AI_RESPONSE", str(exc), 502)


@app.exception_handler(EmbeddingDimensionError)
async def handle_embedding_dimension_error(request: Request, exc: EmbeddingDimensionError):
    logger.error("Embedding dimension mismatch: %s", exc)
    return _error_response("EMBEDDING_DIMENSION_MISMATCH", str(exc), 502)


@app.exception_handler(ProviderConfigurationError)
async def handle_provider_configuration_error(request: Request, exc: ProviderConfigurationError):
    logger.error("AI provider misconfigured: %s", exc)
    return _error_response("PROVIDER_CONFIGURATION_ERROR", str(exc), 500)


@app.exception_handler(ValueError)
async def handle_validation_error(request: Request, exc: ValueError):
    logger.error("Validation error: %s", exc)
    return _error_response("AI_SCHEMA_VALIDATION_ERROR", str(exc), 422)


# ---------------------------------------------------------------------------
# Health Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    """Service liveness — always responds even if the AI provider is down."""
    return {"status": "healthy", "service": "setugov-ai", "version": "1.0.0"}


@app.get("/health/ai")
async def health_ai():
    """Check configured AI provider connectivity."""
    if _ai_provider is None:
        raise ProviderUnavailableError("AI service not initialized.")
    try:
        # A cheap, provider-agnostic liveness probe: ask for a trivial
        # generation and confirm we get any text back.
        await _ai_provider.generate("ping", response_format=None)
        return {
            "status": "connected",
            "provider": settings.ai_provider,
            "base_url": settings.ai_base_url,
            "model": settings.ai_model,
        }
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "provider": settings.ai_provider,
                "base_url": settings.ai_base_url,
                "error": str(exc),
            },
        )


@app.get("/health/embeddings")
async def health_embeddings():
    """Check configured embedding provider connectivity."""
    if _embedding_provider is None:
        raise ProviderUnavailableError("Embedding provider not initialized.")
    try:
        await _embedding_provider.embed(["ping"])
        return {
            "status": "connected",
            "provider": settings.embedding_provider,
            "base_url": settings.embedding_base_url,
            "model": settings.embedding_model,
            "dimension": settings.embedding_dimension,
        }
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "provider": settings.embedding_provider,
                "base_url": settings.embedding_base_url,
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
    request, warnings = sanitize_request(request)
    result = await _ai_service.analyze_challenge(request)
    return APIResponse(success=True, data=result.model_dump(), warnings=warnings)


# ---------------------------------------------------------------------------
# Brain 2 — Startup Match Explanation
# ---------------------------------------------------------------------------
@app.post("/ai/match", response_model=APIResponse)
async def match_explanation(request: MatchExplanationRequest):
    """Explain why a startup matches a challenge (scoring is deterministic)."""
    assert _ai_service is not None
    request, warnings = sanitize_request(request)
    result = await _ai_service.explain_match(request)
    return APIResponse(success=True, data=result.model_dump(), warnings=warnings)


# ---------------------------------------------------------------------------
# Brain 3 — Proposal Analysis
# ---------------------------------------------------------------------------
@app.post("/ai/proposal", response_model=APIResponse)
async def proposal_analysis(request: ProposalAnalysisRequest):
    """Assist evaluators in understanding a startup proposal."""
    assert _ai_service is not None
    request, warnings = sanitize_request(request)
    result = await _ai_service.analyze_proposal(request)
    return APIResponse(success=True, data=result.model_dump(), warnings=warnings)


@app.post("/ai/proposal/stream")
async def proposal_analysis_stream(request: ProposalAnalysisRequest):
    """Stream AI proposal analysis in real time using Server-Sent Events."""
    assert _ai_service is not None
    request, _ = sanitize_request(request)

    async def event_generator():
        async for event in _ai_service.analyze_proposal_stream(request):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Brain 4 — Pilot Intelligence
# ---------------------------------------------------------------------------
@app.post("/ai/pilot", response_model=APIResponse)
async def pilot_intelligence(request: PilotIntelligenceRequest):
    """Interpret pilot evidence with deterministic KPI calculations."""
    assert _ai_service is not None
    request, warnings = sanitize_request(request)
    result = await _ai_service.interpret_pilot(request)
    return APIResponse(success=True, data=result.model_dump(), warnings=warnings)


# ---------------------------------------------------------------------------
# Brain 5 — Document Assistance
# ---------------------------------------------------------------------------
@app.post("/ai/document", response_model=APIResponse)
async def document_assistance(request: DocumentAssistanceRequest):
    """Generate document drafts for authorized review."""
    assert _ai_service is not None
    request, warnings = sanitize_request(request)
    result = await _ai_service.assist_document(request)
    return APIResponse(success=True, data=result.model_dump(), warnings=warnings)


# ---------------------------------------------------------------------------
# Decision Engine — deterministic SCALE / EXTEND / STOP recommendation
# ---------------------------------------------------------------------------
@app.post("/ai/decision", response_model=APIResponse)
async def decision_engine_endpoint(request: DecisionInput):
    """
    Run a deterministic SCALE / EXTEND / STOP recommendation.
    No LLM call — pure Python scoring against KPI, milestone, and risk data.
    """
    engine = DecisionEngine()
    result = engine.recommend(request)
    return APIResponse(success=True, data=result.model_dump())


# ---------------------------------------------------------------------------
# Brain 6 — Startup Comparator
# ---------------------------------------------------------------------------
@app.post("/ai/comparator", response_model=APIResponse)
async def startup_comparator_endpoint(request: StartupComparatorRequest):
    """Rank and compare multiple startup candidates for a single challenge."""
    assert _ai_service is not None
    request, warnings = sanitize_request(request)
    result = await _ai_service.compare_startups(request)
    return APIResponse(success=True, data=result.model_dump(), warnings=warnings)


# ---------------------------------------------------------------------------
# Scale Recommendation — thin adapter over DecisionEngine.recommend()
# ---------------------------------------------------------------------------
@app.post("/ai/pilots/{pilot_id}/scale-recommendation", response_model=APIResponse)
async def scale_recommendation_endpoint(pilot_id: str, request: ScaleRecommendationRequest):
    """
    SCALE / EXTEND / STOP recommendation for a pilot.

    No LLM call — reuses the same deterministic composite-score engine as
    /ai/decision. Accepts either pre-aggregated metrics or raw pilot data
    (kpi_results/evidence/risks), which are aggregated into that same
    shape first. ``pilot_id`` identifies the pilot for logging only; all
    pilot data comes from the request body.
    """
    assert _ai_service is not None
    request, warnings = sanitize_request(request)
    result = await _ai_service.recommend_scale(request)
    return APIResponse(success=True, data=result.model_dump(), warnings=warnings)


# ---------------------------------------------------------------------------
# Risk Analysis — open-ended identification, severity counts deterministic
# ---------------------------------------------------------------------------
@app.post("/ai/risks/analyze", response_model=APIResponse)
async def risk_analysis_endpoint(request: RiskAnalysisRequest):
    """Identify risks across 7 standard dimensions for authorized review."""
    assert _ai_service is not None
    request, warnings = sanitize_request(request)
    result = await _ai_service.analyze_risks(request)
    return APIResponse(success=True, data=result.model_dump(), warnings=warnings)


# ---------------------------------------------------------------------------
# Embeddings — provider-agnostic text embedding generation
# ---------------------------------------------------------------------------
@app.post("/ai/embeddings", response_model=APIResponse)
async def embeddings_endpoint(request: EmbeddingRequest):
    """
    Generate embedding vectors for one or more texts.

    Stateless: this service does not persist vectors or compute similarity
    itself — it returns vectors only. The caller (e.g. the Backend, which
    owns the pgvector columns) is responsible for building embedding text,
    persisting vectors, and computing similarity.
    """
    assert _embedding_provider is not None
    request, warnings = sanitize_request(request)
    vectors = await _embedding_provider.embed(request.texts)

    for i, vector in enumerate(vectors):
        if len(vector) != settings.embedding_dimension:
            raise EmbeddingDimensionError(
                f"Embedding provider returned a {len(vector)}-dimensional "
                f"vector at index {i}; EMBEDDING_DIMENSION is configured as "
                f"{settings.embedding_dimension}. If you intentionally "
                "changed the embedding model, update EMBEDDING_DIMENSION "
                "and the corresponding pgvector column in the database."
            )

    response = EmbeddingResponse(
        embeddings=vectors,
        model=settings.embedding_model,
        dimension=settings.embedding_dimension,
    )
    return APIResponse(success=True, data=response.model_dump(), warnings=warnings)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.ai_service_host,
        port=settings.ai_service_port,
        reload=True,
    )
