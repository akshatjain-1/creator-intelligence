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


@router.post("/sync", summary="Trigger full data sync for all creators")
def sync_all_creators(db: Session = Depends(get_db)):
    try:
        creators = db.query(Creator).all()
        results = []

        for creator in creators:
            res = _sync_creator(creator, db)
            results.append(res)
        
        return {
            "message": "Sync complete",
            "creators_processed": len(results),
            "details": results
        }
    except Exception as e:
        import traceback
        return {"critical_error": str(e), "traceback": traceback.format_exc()}

def _sync_creator(creator: Creator, db: Session):
    try:
        from app.services.scoring_service import score_video  # Lazy import to avoid circular dep
        
        if not creator:
            return {"error": "Creator not found"}
            
        client = YouTubeClient(creator, db)
        
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
                    creator_id=creator.id,
                    youtube_video_id=video_data["youtube_video_id"],
                    title=video_data["title"],
                    published_at=video_data["published_at"],
                    duration_seconds=video_data["duration_seconds"],
                    thumbnail_url=video_data["thumbnail_url"],
                    view_count=video_data.get("view_count"),
                )
                db.add(new_video)
                db.flush() # get ID
                new_videos += 1
                video_obj = new_video

            # 3. Analytics & Scoring (Immediate)
            pub_date = video_obj.published_at.date() if video_obj.published_at else None
            analytics = client.fetch_video_analytics(video_obj.youtube_video_id, published_at=pub_date)

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
                
                # 4. Score
                db.commit() # Commit snapshots before scoring
                score_video(video_obj, db)

        db.commit()
        return {
            "channel_id": creator.channel_id,
            "new_videos": new_videos,
            "updated_videos": video_updates,
            "quota_used": get_quota_used()
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

@router.get("/ingest/{channel_id}", summary="Trigger manual ingestion for a channel")
def test_ingest(channel_id: str, db: Session = Depends(get_db)):
    # ... (keep existing for reference/testing if needed, or deprecate)
    # For now, I'll keep it but redirect logic if desired. 
    # But since this is a user request for "Sync", the above POST /sync is the key.
    return _sync_creator(db.query(Creator).filter(Creator.channel_id == channel_id).first(), db)

@router.get("/analytics/{channel_id}")
def test_analytics(channel_id: str, db: Session = Depends(get_db)):
    return {"message": "Use POST /api/ingest/sync instead"}

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

