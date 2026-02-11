"""
Test endpoints for manual ingestion and quota tracking.

GET /test/ingest/{channel_id} → Fetch channel stats + recent videos, save to DB
GET /test/quota               → Show estimated API quota usage
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Creator, Video
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
