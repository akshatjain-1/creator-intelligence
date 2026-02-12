"""
Dashboard API endpoints (Phase 2).

GET  /api/dashboard/stats         → Aggregated channel metrics
GET  /api/videos                  → List of videos with scores
POST /api/videos/{id}/analyze     → Trigger Gemini insight for one video
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc

from app.database import get_db
from app.models import Creator, Video, AnalyticsSnapshot
from app.services.scoring_service import score_video, calculate_baseline
from app.services.intelligence import generate_insight

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/dashboard/stats", summary="Aggregated channel statistics")
def dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns aggregated stats across all videos for the dashboard header.

    - Total views (sum of latest snapshots)
    - Average Hook Score
    - Average Velocity
    - Total video count
    """
    # Get all videos that have scores
    videos = db.query(Video).all()

    if not videos:
        return {
            "total_views": 0,
            "avg_hook_score": None,
            "avg_velocity": None,
            "video_count": 0,
        }

    # Aggregate stats
    hook_scores = [v.hook_score for v in videos if v.hook_score is not None]
    velocities = [v.velocity for v in videos if v.velocity is not None]

    # Total views from latest analytics snapshots
    total_views = 0
    for video in videos:
        latest = (
            db.query(AnalyticsSnapshot)
            .filter(AnalyticsSnapshot.video_id == video.id)
            .order_by(AnalyticsSnapshot.snapshot_date.desc())
            .first()
        )
        if latest and latest.views:
            total_views += latest.views

    avg_hook = round(sum(hook_scores) / len(hook_scores), 1) if hook_scores else None
    avg_velocity = round(sum(velocities) / len(velocities), 2) if velocities else None

    return {
        "total_views": total_views,
        "avg_hook_score": avg_hook,
        "avg_velocity": avg_velocity,
        "video_count": len(videos),
    }


@router.get("/videos", summary="List all videos with calculated scores")
def list_videos(db: Session = Depends(get_db)):
    """
    Returns all videos with their derived metrics.
    Includes Hook Score color coding thresholds:
      Red < 40, Yellow < 60, Green >= 60
    """
    videos = db.query(Video).order_by(Video.published_at.desc()).all()

    result = []
    for video in videos:
        # Use view_count from Video model (from Data API, always fresh)
        views = video.view_count

        # Color code the hook score
        hook_color = None
        if video.hook_score is not None:
            if video.hook_score < 40:
                hook_color = "red"
            elif video.hook_score < 60:
                hook_color = "yellow"
            else:
                hook_color = "green"

        # Get baseline delta
        baseline = calculate_baseline(video, db)

        result.append({
            "id": str(video.id),
            "youtube_video_id": video.youtube_video_id,
            "title": video.title,
            "thumbnail_url": video.thumbnail_url,
            "published_at": video.published_at.isoformat() if video.published_at else None,
            "duration_seconds": video.duration_seconds,
            "views": views,
            "hook_score": video.hook_score,
            "hook_color": hook_color,
            "velocity": video.velocity,
            "hook_delta": baseline.get("hook_delta"),
            "velocity_delta": baseline.get("velocity_delta"),
            "last_analyzed_at": video.last_analyzed_at.isoformat() if video.last_analyzed_at else None,
        })

    return {"videos": result, "count": len(result)}


@router.post("/videos/{video_id}/analyze", summary="Generate AI insight for a video")
def analyze_video(video_id: str, db: Session = Depends(get_db)):
    """
    Triggers the Gemini intelligence service for a specific video.

    1. Recalculate scores (ensure fresh data)
    2. Build context payload with channel averages
    3. Call Gemini for actionable insight
    """
    # Find the video
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail=f"Video not found: {video_id}")

    # Recalculate scores to ensure freshness
    score_result = score_video(video, db)

    # Get channel averages for context
    all_videos = db.query(Video).filter(
        Video.creator_id == video.creator_id,
        Video.hook_score.isnot(None),
    ).all()

    channel_avg_hook = None
    channel_avg_velocity = None

    if all_videos:
        hooks = [v.hook_score for v in all_videos if v.hook_score is not None]
        vels = [v.velocity for v in all_videos if v.velocity is not None]
        channel_avg_hook = round(sum(hooks) / len(hooks), 1) if hooks else None
        channel_avg_velocity = round(sum(vels) / len(vels), 2) if vels else None

    # Generate AI insight
    insight = generate_insight(
        video_title=video.title,
        hook_score=video.hook_score,
        channel_avg_hook=channel_avg_hook,
        velocity=video.velocity,
        channel_avg_velocity=channel_avg_velocity,
    )

    # Update last_analyzed_at
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
