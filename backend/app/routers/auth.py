"""
OAuth 2.0 authentication endpoints — Phase 2.5.

GET  /auth/login     → Redirect to Google consent screen (requires Firebase JWT)
GET  /auth/callback  → Exchange code for tokens, upsert into youtube_channels
GET  /auth/channels  → List channels owned by the current user
"""

import os
from datetime import timezone

os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.config import settings
from app.database import get_db
from app.models import User, YouTubeChannel
from app.encryption import encrypt_token
from app.dependencies import get_current_user

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
def auth_login(current_user: User = Depends(get_current_user)):
    """
    Requires Firebase JWT. Stores user's firebase_uid in OAuth state
    so the callback can link the channel to the correct user.
    """
    flow = _build_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
        state=current_user.firebase_uid,  # Pass user identity through OAuth state
    )
    return RedirectResponse(url=auth_url)


@router.get("/callback", summary="Handle OAuth callback from Google")
def auth_callback(code: str, state: str = "", db: Session = Depends(get_db)):
    """
    Google redirects here with ?code=...&state=firebase_uid.

    1. Exchange code for tokens.
    2. Fetch YouTube channel info.
    3. Resolve user from state (firebase_uid).
    4. Upsert into youtube_channels linked to the user.
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
                "No refresh_token received. Try revoking app access at "
                "https://myaccount.google.com/permissions and retry."
            ),
        )

    # ── Step 2: Fetch YouTube channel info ──────────
    youtube = build("youtube", "v3", credentials=credentials)
    try:
        channel_resp = youtube.channels().list(
            part="snippet", mine=True
        ).execute()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"YouTube API error: {e}")

    channels = channel_resp.get("items", [])
    if not channels:
        raise HTTPException(
            status_code=404,
            detail="No YouTube channel found for this account.",
        )

    yt_channel = channels[0]
    yt_channel_id = yt_channel["id"]
    channel_name = yt_channel["snippet"]["title"]
    channel_avatar = yt_channel["snippet"]["thumbnails"]["default"]["url"]

    # ── Step 3: Resolve user from state ─────────────
    if not state:
        raise HTTPException(status_code=400, detail="Missing state (firebase_uid)")

    user = db.query(User).filter(User.firebase_uid == state).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found for this Firebase UID")

    # ── Step 4: Encrypt tokens & upsert channel ─────
    encrypted_access = encrypt_token(credentials.token)
    encrypted_refresh = encrypt_token(credentials.refresh_token)
    token_expiry = (
        credentials.expiry.replace(tzinfo=timezone.utc) if credentials.expiry else None
    )

    existing = (
        db.query(YouTubeChannel)
        .filter(YouTubeChannel.youtube_channel_id == yt_channel_id)
        .first()
    )

    if existing:
        # Verify ownership — prevent hijacking
        if existing.user_id != user.id:
            raise HTTPException(
                status_code=409,
                detail="This channel is already linked to a different account.",
            )
        existing.access_token = encrypted_access
        existing.refresh_token = encrypted_refresh
        existing.token_expiry = token_expiry
        existing.channel_name = channel_name
        existing.channel_avatar_url = channel_avatar
        channel_obj = existing
    else:
        channel_obj = YouTubeChannel(
            user_id=user.id,
            youtube_channel_id=yt_channel_id,
            channel_name=channel_name,
            channel_avatar_url=channel_avatar,
            access_token=encrypted_access,
            refresh_token=encrypted_refresh,
            token_expiry=token_expiry,
        )
        db.add(channel_obj)

    db.commit()
    db.refresh(channel_obj)

    # Redirect to frontend dashboard after successful connection
    return RedirectResponse(url="http://localhost:3000/dashboard")


@router.get("/channels", summary="List YouTube channels for the current user")
def list_channels(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all YouTube channels owned by the authenticated user."""
    channels = (
        db.query(YouTubeChannel)
        .filter(YouTubeChannel.user_id == current_user.id)
        .all()
    )
    return [
        {
            "id": str(ch.id),
            "youtube_channel_id": ch.youtube_channel_id,
            "channel_name": ch.channel_name,
            "channel_avatar_url": ch.channel_avatar_url,
            "is_active": ch.is_active,
        }
        for ch in channels
    ]
