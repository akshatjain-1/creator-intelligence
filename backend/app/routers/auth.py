"""
OAuth 2.0 authentication endpoints.

GET /auth/login    → Redirect to Google consent screen
GET /auth/callback → Exchange code for tokens, store encrypted in DB
"""

import os
from datetime import datetime, timedelta, timezone

# Google always adds `openid` scope to responses that include userinfo.email.
# Without this, oauthlib rejects the token because the scopes "changed".
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

from app.config import settings
from app.database import get_db
from app.models import Creator
from app.encryption import encrypt_token

router = APIRouter()

# ── Helpers ─────────────────────────────────────────

def _build_flow() -> Flow:
    """Create a Google OAuth Flow from our client secret file."""
    flow = Flow.from_client_config(
        client_config={
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
            }
        },
        scopes=settings.GOOGLE_SCOPES,
    )
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    return flow


# ── Endpoints ───────────────────────────────────────

@router.get("/login", summary="Redirect to Google OAuth consent screen")
def auth_login():
    """
    Build the Google OAuth authorization URL and redirect the user
    to the consent screen. Requests offline access so we get a
    refresh_token for long-lived API access.
    """
    flow = _build_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",       # gives us a refresh_token
        prompt="consent",            # always show consent to guarantee refresh_token
        include_granted_scopes="true",
    )
    return RedirectResponse(url=auth_url)


@router.get("/callback", summary="Handle OAuth callback from Google")
def auth_callback(code: str, db: Session = Depends(get_db)):
    """
    Google redirects here with ?code=... after user consents.

    Steps:
    1. Exchange the authorization code for access + refresh tokens
    2. Fetch the user's YouTube channel info
    3. Fetch the user's email
    4. Encrypt tokens and upsert into the creators table
    """
    # ── Step 1: Exchange code for tokens ────────────
    flow = _build_flow()
    try:
        flow.fetch_token(code=code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e}")

    credentials = flow.credentials

    if not credentials.refresh_token:
        raise HTTPException(
            status_code=400,
            detail=(
                "No refresh_token received. This usually means consent was "
                "not prompted. Try revoking app access at "
                "https://myaccount.google.com/permissions and retry."
            ),
        )

    # ── Step 2: Fetch YouTube channel info ──────────
    youtube = build("youtube", "v3", credentials=credentials)
    try:
        channel_resp = youtube.channels().list(part="snippet", mine=True).execute()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"YouTube API error: {e}")

    channels = channel_resp.get("items", [])
    if not channels:
        raise HTTPException(status_code=404, detail="No YouTube channel found for this account.")

    channel = channels[0]
    channel_id = channel["id"]
    channel_title = channel["snippet"]["title"]

    # ── Step 3: Fetch email from userinfo ───────────
    from googleapiclient.discovery import build as build_service
    oauth2 = build_service("oauth2", "v2", credentials=credentials)
    try:
        user_info = oauth2.userinfo().get().execute()
    except Exception:
        user_info = {}
    email = user_info.get("email", "")

    # ── Step 4: Encrypt tokens & upsert creator ─────
    encrypted_access = encrypt_token(credentials.token)
    encrypted_refresh = encrypt_token(credentials.refresh_token)
    token_expiry = credentials.expiry.replace(tzinfo=timezone.utc) if credentials.expiry else None

    # Check if creator already exists (by channel_id)
    existing = db.query(Creator).filter(Creator.channel_id == channel_id).first()

    if existing:
        existing.access_token = encrypted_access
        existing.refresh_token = encrypted_refresh
        existing.token_expiry = token_expiry
        existing.email = email
        existing.channel_title = channel_title
        creator = existing
    else:
        creator = Creator(
            channel_id=channel_id,
            channel_title=channel_title,
            email=email,
            access_token=encrypted_access,
            refresh_token=encrypted_refresh,
            token_expiry=token_expiry,
        )
        db.add(creator)

    db.commit()
    db.refresh(creator)

    return {
        "message": "Authentication successful!",
        "creator_id": str(creator.id),
        "channel_id": channel_id,
        "channel_title": channel_title,
        "email": email,
        "token_expiry": token_expiry.isoformat() if token_expiry else None,
    }
