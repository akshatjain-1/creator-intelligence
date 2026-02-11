"""
Application configuration — loads from .env via Pydantic BaseSettings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the Creator Intelligence backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Database ────────────────────────────────────
    DATABASE_URL: str = "postgresql://creator:creator_secret@localhost:5432/creator_intelligence"

    # ── Redis ───────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Google OAuth ────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/callback"

    # ── Encryption (Fernet key for token storage) ───
    FERNET_KEY: str = ""

    # ── OAuth Scopes ────────────────────────────────
    GOOGLE_SCOPES: list[str] = [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
    ]


# Singleton instance — import this everywhere
settings = Settings()
