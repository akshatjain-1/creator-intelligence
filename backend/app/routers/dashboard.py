"""
Dashboard API endpoints (Phase 2.5 — Multi-Tenant).

All endpoints require Firebase JWT and channel_id query param.
Data is strictly scoped to the authenticated user's channels.

GET  /api/dashboard/stats         → Aggregated channel metrics
GET  /api/videos                  → List of videos with scores
POST /api/videos/{id}/analyze     → Trigger Gemini insight for one video
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, YouTubeChannel, Video, AnalyticsSnapshot
from app.services.scoring_service import score_video, calculate_baseline
from app.services.intelligence import generate_insight
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Helpers ─────────────────────────────────────────


def _get_owned_channel(
    channel_id: str,
    current_user: User,
    db: Session,
) -> YouTubeChannel:
    """Fetch a channel and verify the current user owns it."""
    channel = (
        db.query(YouTubeChannel)
        .filter(
            YouTubeChannel.youtube_channel_id == channel_id,
            YouTubeChannel.user_id == current_user.id,
        )
        .first()
    )
    if not channel:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized access to channel",
        )
    return channel


# ── Endpoints ───────────────────────────────────────


@router.get("/dashboard/stats", summary="Aggregated channel statistics")
def dashboard_stats(
    channel_id: str = Query(..., description="YouTube channel ID to scope stats"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns aggregated stats for videos of a specific channel."""
    channel = _get_owned_channel(channel_id, current_user, db)

    videos = db.query(Video).filter(Video.channel_id == channel.id).all()

    if not videos:
        return {
            "total_views": 0,
            "avg_hook_score": None,
            "avg_velocity": None,
            "video_count": 0,
            "deltas": {"views": None, "hook": None, "velocity": None},
        }

    sorted_videos = sorted(
        videos, key=lambda v: v.published_at or datetime.min, reverse=True
    )

    hook_scores = [v.hook_score for v in videos if v.hook_score is not None]
    velocities = [v.velocity for v in videos if v.velocity is not None]

    total_views = sum(v.view_count or 0 for v in videos)
    avg_hook = round(sum(hook_scores) / len(hook_scores), 1) if hook_scores else None
    avg_velocity = round(sum(velocities) / len(velocities), 2) if velocities else None

    # Deltas: last 5 vs previous 5
    recent_5 = sorted_videos[:5]
    prev_5 = sorted_videos[5:10]

    def get_avg(objs, attr):
        vals = [getattr(o, attr) for o in objs if getattr(o, attr) is not None]
        return sum(vals) / len(vals) if vals else 0

    def calc_delta(curr, prev):
        if not prev:
            return None
        return round(((curr - prev) / prev) * 100, 1)

    return {
        "total_views": total_views,
        "avg_hook_score": avg_hook,
        "avg_velocity": avg_velocity,
        "video_count": len(videos),
        "deltas": {
            "views": calc_delta(get_avg(recent_5, "view_count"), get_avg(prev_5, "view_count")),
            "hook": calc_delta(get_avg(recent_5, "hook_score"), get_avg(prev_5, "hook_score")),
            "velocity": calc_delta(get_avg(recent_5, "velocity"), get_avg(prev_5, "velocity")),
        },
    }


@router.get("/videos", summary="List all videos with calculated scores")
def list_videos(
    channel_id: str = Query(..., description="YouTube channel ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns all videos for a specific channel with derived metrics."""
    channel = _get_owned_channel(channel_id, current_user, db)

    videos = (
        db.query(Video)
        .filter(Video.channel_id == channel.id)
        .order_by(Video.published_at.desc())
        .all()
    )

    result = []
    for video in videos:
        hook_color = None
        if video.hook_score is not None:
            if video.hook_score < 40:
                hook_color = "red"
            elif video.hook_score < 60:
                hook_color = "yellow"
            else:
                hook_color = "green"

        baseline = calculate_baseline(video, db)

        result.append({
            "id": str(video.id),
            "youtube_video_id": video.youtube_video_id,
            "title": video.title,
            "thumbnail_url": video.thumbnail_url,
            "published_at": video.published_at.isoformat() if video.published_at else None,
            "duration_seconds": video.duration_seconds,
            "views": video.view_count,
            "hook_score": video.hook_score,
            "hook_color": hook_color,
            "velocity": video.velocity,
            "hook_delta": baseline.get("hook_delta"),
            "velocity_delta": baseline.get("velocity_delta"),
            "last_analyzed_at": video.last_analyzed_at.isoformat() if video.last_analyzed_at else None,
        })

    return {"videos": result, "count": len(result)}


@router.post("/videos/{video_id}/analyze", summary="Generate AI insight for a video")
def analyze_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Triggers Gemini insight — scoped to videos the user owns."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail=f"Video not found: {video_id}")

    # Verify ownership through the channel
    channel = (
        db.query(YouTubeChannel)
        .filter(
            YouTubeChannel.id == video.channel_id,
            YouTubeChannel.user_id == current_user.id,
        )
        .first()
    )
    if not channel:
        raise HTTPException(status_code=403, detail="Unauthorized access to video")

    score_result = score_video(video, db)

    all_videos = db.query(Video).filter(
        Video.channel_id == video.channel_id,
        Video.hook_score.isnot(None),
    ).all()

    channel_avg_hook = None
    channel_avg_velocity = None

    if all_videos:
        hooks = [v.hook_score for v in all_videos if v.hook_score is not None]
        vels = [v.velocity for v in all_videos if v.velocity is not None]
        channel_avg_hook = round(sum(hooks) / len(hooks), 1) if hooks else None
        channel_avg_velocity = round(sum(vels) / len(vels), 2) if vels else None

    insight = generate_insight(
        video_title=video.title,
        hook_score=video.hook_score,
        channel_avg_hook=channel_avg_hook,
        velocity=video.velocity,
        channel_avg_velocity=channel_avg_velocity,
    )

    video.last_analyzed_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "video_id": str(video.id),
        "title": video.title,
        "hook_score": video.hook_score,
        "velocity": video.velocity,
        "channel_avg_hook": channel_avg_hook,
        "channel_avg_velocity": channel_avg_velocity,
        "insight": insight,
        "analyzed_at": video.last_analyzed_at.isoformat(),
    }
