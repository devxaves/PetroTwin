from fastapi import APIRouter, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

router = APIRouter(tags=["metrics"])

# Prometheus Metrics
REQUEST_COUNT = Counter(
    "petrotwin_http_requests_total",
    "Total HTTP requests processed by PetroTwin API",
    ["method", "endpoint", "status"],
)

RECOMMENDATIONS_GENERATED = Counter(
    "petrotwin_recommendations_generated_total",
    "Total coupled CSS+SRP digital twin recommendations generated",
    ["well_id"],
)

APPROVALS_RECORDED = Counter(
    "petrotwin_operator_approvals_total",
    "Total operator approvals logged in audit trail",
    ["decision"],
)

REQUEST_LATENCY = Histogram(
    "petrotwin_request_duration_seconds",
    "HTTP request latency in seconds",
    ["endpoint"],
)


@router.get("/metrics", summary="Prometheus format metrics scrape endpoint")
def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
