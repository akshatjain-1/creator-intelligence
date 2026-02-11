"""
Test endpoints for manual ingestion and quota tracking.

GET /test/ingest/{channel_id}     → Fetch channel stats + recent videos, save to DB
GET /test/analytics/{channel_id}  → Fetch per-video analytics, save to analytics_snapshots
GET /test/quota                   → Show estimated API quota usage
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Creator, Video, AnalyticsSnapshot
from app.youtube_client import YouTubeClient, get_quota_used

router = APIRouter()


@router.get("/ingest/{channel_id}", summary="Trigger manual ingestion for a channel")
def test_ingest(channel_id: str, db: Session = Depends(get_db)):
    """
    Manually triggers the data ingestion pipeline for a specific channel.

    Steps:
    1. Look up the Creator in the database
    2. Fetch channel statistics
    3. Fetch latest 5 videos and upsert into the videos table
    """
    # ── Find the creator ────────────────────────────
    creator = db.query(Creator).filter(Creator.channel_id == channel_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail=f"No creator found with channel_id={channel_id}")

    client = YouTubeClient(creator, db)

    # ── Fetch channel stats ─────────────────────────
    channel_stats = client.fetch_channel_stats()

    # ── Fetch recent videos ─────────────────────────
    recent_videos = client.fetch_recent_videos(max_results=5)

    # ── Upsert videos into DB ───────────────────────
    ingested = []
    for video_data in recent_videos:
        existing = db.query(Video).filter(
            Video.youtube_video_id == video_data["youtube_video_id"]
        ).first()

        if existing:
            # Update existing row (MVP-1 "Duplicate Test" — no new rows)
            existing.title = video_data["title"]
            existing.published_at = video_data["published_at"]
            existing.duration_seconds = video_data["duration_seconds"]
            existing.thumbnail_url = video_data["thumbnail_url"]
            ingested.append({"video_id": video_data["youtube_video_id"], "action": "updated"})
        else:
            # Insert new row
            new_video = Video(
                creator_id=creator.id,
                youtube_video_id=video_data["youtube_video_id"],
                title=video_data["title"],
                published_at=video_data["published_at"],
                duration_seconds=video_data["duration_seconds"],
                thumbnail_url=video_data["thumbnail_url"],
            )
            db.add(new_video)
            ingested.append({"video_id": video_data["youtube_video_id"], "action": "created"})

    db.commit()

    return {
        "message": f"Ingestion complete for channel {channel_id}",
        "channel_stats": channel_stats,
        "videos_processed": len(ingested),
        "details": ingested,
        "quota_used": get_quota_used(),
    }


@router.get("/analytics/{channel_id}", summary="Fetch analytics for all videos of a channel")
def test_analytics(channel_id: str, db: Session = Depends(get_db)):
    """
    Fetch per-video analytics from the YouTube Analytics API and store
    in the analytics_snapshots hypertable.

    For each video belonging to this channel:
    1. Call fetch_video_analytics() (with day-delay fallback)
    2. Upsert into analytics_snapshots (unique on video_id + snapshot_date)
    """
    # ── Find the creator ────────────────────────────
    creator = db.query(Creator).filter(Creator.channel_id == channel_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail=f"No creator found with channel_id={channel_id}")

    # ── Get all videos for this channel ─────────────
    videos = db.query(Video).filter(Video.creator_id == creator.id).all()
    if not videos:
        return {
            "message": f"No videos found for channel {channel_id}. Run /test/ingest first.",
            "analytics_processed": 0,
            "quota_used": get_quota_used(),
        }

    client = YouTubeClient(creator, db)

    # ── Fetch analytics for each video ──────────────
    results = []
    for video in videos:
        analytics = client.fetch_video_analytics(video.youtube_video_id)

        if analytics is None:
            results.append({
                "youtube_video_id": video.youtube_video_id,
                "title": video.title,
                "action": "no_data",
            })
            continue

        # Upsert: check if snapshot already exists for this video + date
        existing = db.query(AnalyticsSnapshot).filter(
            AnalyticsSnapshot.video_id == video.id,
            AnalyticsSnapshot.snapshot_date == analytics["snapshot_date"],
        ).first()

        if existing:
            existing.views = analytics["views"]
            existing.watch_time_minutes = analytics["watch_time_minutes"]
            existing.average_view_duration = analytics["average_view_duration"]
            existing.retention_at_30s = analytics["retention_at_30s"]
            existing.ctr = analytics["ctr"]
            action = "updated"
        else:
            snapshot = AnalyticsSnapshot(
                video_id=video.id,
                snapshot_date=analytics["snapshot_date"],
                views=analytics["views"],
                watch_time_minutes=analytics["watch_time_minutes"],
                average_view_duration=analytics["average_view_duration"],
                retention_at_30s=analytics["retention_at_30s"],
                ctr=analytics["ctr"],
            )
            db.add(snapshot)
            action = "created"

        results.append({
            "youtube_video_id": video.youtube_video_id,
            "title": video.title,
            "snapshot_date": analytics["snapshot_date"].isoformat(),
            "views": analytics["views"],
            "action": action,
        })

    db.commit()

    return {
        "message": f"Analytics complete for channel {channel_id}",
        "analytics_processed": len([r for r in results if r["action"] != "no_data"]),
        "total_videos": len(videos),
        "details": results,
        "quota_used": get_quota_used(),
    }


@router.get("/quota", summary="Check estimated API quota usage")
def test_quota():
    """Return the estimated YouTube API quota usage for this session."""
    daily_limit = 10_000
    used = get_quota_used()
    return {
        "quota_used": used,
        "quota_limit": daily_limit,
        "quota_remaining": daily_limit - used,
        "quota_percent": round((used / daily_limit) * 100, 2),
    }

