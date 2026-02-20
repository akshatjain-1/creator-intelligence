"""
Scoring Service — The Math Engine (Phase 2).

Calculates derived metrics from raw analytics data.
This is the "moat" — proprietary signals that transform
raw YouTube data into actionable intelligence.

Formulas implemented strictly from Phase_2_Execution_Plan.md §2.1.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import Video, AnalyticsSnapshot

logger = logging.getLogger(__name__)


def calculate_hook_score(video: Video, db: Session) -> float | None:
    """
    Metric A: Hook Score — "How good is the intro?"

    Formula: (retention_at_30s / retention_at_0s) * 100
    Since retention_at_0s is always 100%, this simplifies to:
        hook_score = retention_at_30s (already 0-100 range)

    Constraints:
    - Cap at 100
    - If no analytics data exists → return None (not 0)
    """
    # Get the latest analytics snapshot for this video
    latest_snapshot = (
        db.query(AnalyticsSnapshot)
        .filter(AnalyticsSnapshot.video_id == video.id)
        .order_by(desc(AnalyticsSnapshot.snapshot_date))
        .first()
    )

    if latest_snapshot is None or latest_snapshot.retention_at_30s is None:
        return None

    # retention_at_30s is averageViewPercentage (0-100)
    # retention_at_0s is always 100 (everyone sees the first frame)
    # Hook Score = (retention_at_30s / 100) * 100 = retention_at_30s
    hook_score = latest_snapshot.retention_at_30s

    # Cap at 100
    return min(hook_score, 100.0)


def calculate_velocity(video: Video, db: Session) -> float | None:
    """
    Metric B: Growth Velocity — "How fast is it moving right now?"

    Formula: current_views / hours_since_publish

    Constraints:
    - If hours_since_publish < 1, use 1 (avoid division by zero)
    - If no analytics data exists → return None (not 0)
    """
    # Get the latest analytics snapshot for this video
    latest_snapshot = (
        db.query(AnalyticsSnapshot)
        .filter(AnalyticsSnapshot.video_id == video.id)
        .order_by(desc(AnalyticsSnapshot.snapshot_date))
        .first()
    )

    if latest_snapshot is None or latest_snapshot.views is None:
        return None

    if video.published_at is None:
        return None

    # Calculate hours since publish
    now = datetime.now(timezone.utc)
    published = video.published_at
    if published.tzinfo is None:
        published = published.replace(tzinfo=timezone.utc)

    hours_since_publish = (now - published).total_seconds() / 3600

    # Constraint: minimum 1 hour to avoid division by zero
    hours_since_publish = max(hours_since_publish, 1.0)

    velocity = latest_snapshot.views / hours_since_publish

    return round(velocity, 2)


def calculate_baseline(
    video: Video, db: Session
) -> dict[str, float | None]:
    """
    Metric C: The Baseline — "Is this video good relative to the channel?"

    Formula:
    - baseline_hook = Average Hook Score of last 10 videos (excluding current)
    - baseline_velocity = Average Velocity of last 10 videos (excluding current)
    - performance_delta = (current_score - baseline_score) / baseline_score

    Returns dict with:
        baseline_hook, baseline_velocity,
        hook_delta, velocity_delta
    """
    # Get last 10 videos for this channel, excluding current video
    recent_videos = (
        db.query(Video)
        .filter(
            Video.channel_id == video.channel_id,
            Video.id != video.id,
            Video.hook_score.isnot(None),
        )
        .order_by(desc(Video.published_at))
        .limit(10)
        .all()
    )

    if not recent_videos:
        return {
            "baseline_hook": None,
            "baseline_velocity": None,
            "hook_delta": None,
            "velocity_delta": None,
        }

    # Calculate averages
    hook_scores = [v.hook_score for v in recent_videos if v.hook_score is not None]
    velocities = [v.velocity for v in recent_videos if v.velocity is not None]

    baseline_hook = sum(hook_scores) / len(hook_scores) if hook_scores else None
    baseline_velocity = sum(velocities) / len(velocities) if velocities else None

    # Calculate deltas
    hook_delta = None
    if baseline_hook and video.hook_score is not None and baseline_hook > 0:
        hook_delta = round(
            (video.hook_score - baseline_hook) / baseline_hook * 100, 2
        )

    velocity_delta = None
    if baseline_velocity and video.velocity is not None and baseline_velocity > 0:
        velocity_delta = round(
            (video.velocity - baseline_velocity) / baseline_velocity * 100, 2
        )

    return {
        "baseline_hook": round(baseline_hook, 2) if baseline_hook else None,
        "baseline_velocity": round(baseline_velocity, 2) if baseline_velocity else None,
        "hook_delta": hook_delta,
        "velocity_delta": velocity_delta,
    }


def score_video(video: Video, db: Session) -> dict:
    """
    Run all scoring formulas for a single video and persist results.

    Returns a summary dict of the computed scores.
    """
    hook = calculate_hook_score(video, db)
    vel = calculate_velocity(video, db)

    # Update video record
    video.hook_score = hook
    video.velocity = vel
    video.last_analyzed_at = datetime.now(timezone.utc)
    db.commit()

    # Calculate baseline (needs updated scores on the video first)
    baseline = calculate_baseline(video, db)

    logger.info(
        "Scored video %s: hook=%.1f, velocity=%.2f",
        video.youtube_video_id,
        hook if hook is not None else 0,
        vel if vel is not None else 0,
    )

    return {
        "youtube_video_id": video.youtube_video_id,
        "title": video.title,
        "hook_score": hook,
        "velocity": vel,
        **baseline,
    }


def score_all_videos(db: Session) -> list[dict]:
    """
    Recalculate scores for ALL videos in the database.
    Used by the backfill script.
    """
    videos = db.query(Video).order_by(Video.published_at).all()
    results = []

    for video in videos:
        result = score_video(video, db)
        results.append(result)

    logger.info("Scored %d videos total", len(results))
    return results
