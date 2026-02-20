"""
Ingestion and sync endpoints (Phase 2.5 — Multi-Tenant).

POST /api/ingest/sync    → Sync all channels for the current user
GET  /api/ingest/quota   → Show estimated API quota usage
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, YouTubeChannel, Video, AnalyticsSnapshot
from app.youtube_client import YouTubeClient, get_quota_used
from app.dependencies import get_current_user

router = APIRouter()


@router.post("/sync", summary="Trigger full data sync for current user's channels")
def sync_all_channels(
    channel_id: str = Query(None, description="Optional: sync a specific channel only"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sync YouTube data for channels owned by the authenticated user.
    If channel_id is provided, only that channel is synced.
    """
    try:
        query = db.query(YouTubeChannel).filter(
            YouTubeChannel.user_id == current_user.id,
            YouTubeChannel.is_active == True,
        )
        if channel_id:
            query = query.filter(YouTubeChannel.youtube_channel_id == channel_id)

        channels = query.all()

        if not channels:
            return {"message": "No channels found", "channels_processed": 0, "details": []}

        results = []
        for channel in channels:
            res = _sync_channel(channel, db)
            results.append(res)

        return {
            "message": "Sync complete",
            "channels_processed": len(results),
            "details": results,
        }
    except Exception as e:
        import traceback
        return {"critical_error": str(e), "traceback": traceback.format_exc()}


def _sync_channel(channel: YouTubeChannel, db: Session):
    """Sync a single channel: stats → videos → analytics → scores."""
    try:
        from app.services.scoring_service import score_video

        client = YouTubeClient(channel, db)

        # 1. Channel Stats
        stats = client.fetch_channel_stats()

        # 2. Videos
        recent_videos = client.fetch_recent_videos(max_results=0)
        video_updates = 0
        new_videos = 0

        for video_data in recent_videos:
            existing = db.query(Video).filter(
                Video.youtube_video_id == video_data["youtube_video_id"]
            ).first()

            if existing:
                existing.title = video_data["title"]
                existing.published_at = video_data["published_at"]
                existing.duration_seconds = video_data["duration_seconds"]
                existing.thumbnail_url = video_data["thumbnail_url"]
                existing.view_count = video_data.get("view_count")
                video_updates += 1
                video_obj = existing
            else:
                new_video = Video(
                    channel_id=channel.id,
                    youtube_video_id=video_data["youtube_video_id"],
                    title=video_data["title"],
                    published_at=video_data["published_at"],
                    duration_seconds=video_data["duration_seconds"],
                    thumbnail_url=video_data["thumbnail_url"],
                    view_count=video_data.get("view_count"),
                )
                db.add(new_video)
                db.flush()
                new_videos += 1
                video_obj = new_video

            # 3. Analytics
            pub_date = video_obj.published_at.date() if video_obj.published_at else None
            analytics = client.fetch_video_analytics(
                video_obj.youtube_video_id, published_at=pub_date
            )

            if analytics:
                existing_snap = db.query(AnalyticsSnapshot).filter(
                    AnalyticsSnapshot.video_id == video_obj.id,
                    AnalyticsSnapshot.snapshot_date == analytics["snapshot_date"],
                ).first()

                if existing_snap:
                    existing_snap.views = analytics["views"]
                    existing_snap.watch_time_minutes = analytics["watch_time_minutes"]
                    existing_snap.average_view_duration = analytics["average_view_duration"]
                    existing_snap.retention_at_30s = analytics["retention_at_30s"]
                    existing_snap.ctr = analytics["ctr"]
                else:
                    snapshot = AnalyticsSnapshot(
                        video_id=video_obj.id,
                        snapshot_date=analytics["snapshot_date"],
                        views=analytics["views"],
                        watch_time_minutes=analytics["watch_time_minutes"],
                        average_view_duration=analytics["average_view_duration"],
                        retention_at_30s=analytics["retention_at_30s"],
                        ctr=analytics["ctr"],
                    )
                    db.add(snapshot)

                db.commit()
                score_video(video_obj, db)

        db.commit()
        return {
            "channel_id": channel.youtube_channel_id,
            "channel_name": channel.channel_name,
            "new_videos": new_videos,
            "updated_videos": video_updates,
            "quota_used": get_quota_used(),
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


@router.get("/quota", summary="Check estimated API quota usage")
def check_quota():
    """Return the estimated YouTube API quota usage for this session."""
    daily_limit = 10_000
    used = get_quota_used()
    return {
        "quota_used": used,
        "quota_limit": daily_limit,
        "quota_remaining": daily_limit - used,
        "quota_percent": round((used / daily_limit) * 100, 2),
    }
