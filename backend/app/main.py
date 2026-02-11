"""
FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import check_db_connection

app = FastAPI(
    title="Creator Intelligence Engine",
    description="Decision Engine for YouTube Creators — MVP-1",
    version="0.1.0",
)

# ── CORS (allow Next.js frontend in dev) ────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
