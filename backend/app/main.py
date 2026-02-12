"""
FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import check_db_connection
from app.routers.auth import router as auth_router
from app.routers.ingest import router as ingest_router
from app.routers.dashboard import router as dashboard_router

app = FastAPI(
    title="Creator Intelligence Engine",
    description="Decision Engine for YouTube Creators — Phase 2",
    version="0.2.0",
)

# ── CORS (allow Next.js frontend in dev) ────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(ingest_router, prefix="/test", tags=["Test"])
app.include_router(dashboard_router, prefix="/api", tags=["Dashboard"])


# ── Health check ────────────────────────────────────
@app.get("/health", tags=["System"])
def health_check():
    """Ping the database and return overall service health."""
    db_ok = check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "db": "connected" if db_ok else "unreachable",
    }


@app.get("/", tags=["System"])
def root():
    """Landing redirect — points to Swagger docs."""
    return {"message": "Creator Intelligence Engine API", "docs": "/docs"}

