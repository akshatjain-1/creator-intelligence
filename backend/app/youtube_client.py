"""
YouTube API client with automatic token refresh.

Wraps the YouTube Data API v3 and YouTube Analytics API v2
to fetch channel stats, recent videos, and per-video analytics.
Handles decryption/re-encryption of OAuth tokens and
auto-refreshes expired access tokens.
"""

import logging
from datetime import datetime, date, timedelta, timezone
import isodate

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Creator
from app.encryption import encrypt_token, decrypt_token

logger = logging.getLogger(__name__)

# ── Internal quota tracker (resets per app restart) ──
_quota_used = 0


def get_quota_used() -> int:
    """Return the estimated quota units consumed this session."""
    return _quota_used


def _track_quota(units: int) -> None:
    """Add to the running quota estimate."""
    global _quota_used
    _quota_used += units


class YouTubeClient:
    """
    A YouTube API client bound to a specific Creator's credentials.

    Usage:
        client = YouTubeClient(creator, db)
        stats  = client.fetch_channel_stats()
        videos = client.fetch_recent_videos()
    """

    def __init__(self, creator: Creator, db: Session):
        self.creator = creator
        self.db = db
        self._youtube = None
        self._youtube_analytics = None

    # ── Token management ────────────────────────────

    def _get_credentials(self) -> Credentials:
        """
        Decrypt stored tokens, build Credentials, and auto-refresh
        if the access token has expired. Re-encrypts the new token
        back into the database.
        """
        access_token = decrypt_token(self.creator.access_token)
        refresh_token = decrypt_token(self.creator.refresh_token)

        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
        )

        # Set expiry so the library knows if it needs to refresh
        if self.creator.token_expiry:
            creds.expiry = self.creator.token_expiry.replace(tzinfo=None)

        # Auto-refresh if expired
        if creds.expired and creds.refresh_token:
            logger.info("Access token expired — refreshing for channel %s", self.creator.channel_id)
            creds.refresh(Request())

            # Re-encrypt and save the new access token
            self.creator.access_token = encrypt_token(creds.token)
            self.creator.token_expiry = (
                creds.expiry.replace(tzinfo=timezone.utc) if creds.expiry else None
            )
            self.db.commit()
            logger.info("Token refreshed and saved for channel %s", self.creator.channel_id)

        return creds

    def _get_youtube(self):
        """Lazily build and cache the YouTube service client."""
        if self._youtube is None:
            creds = self._get_credentials()
            self._youtube = build("youtube", "v3", credentials=creds)
        return self._youtube

    # ── API methods ─────────────────────────────────

    def fetch_channel_stats(self) -> dict:
        """
        Fetch channel-level statistics (subscribers, total views, video count).

        API cost: ~3 quota units (channels.list)
        """
        youtube = self._get_youtube()
        response = youtube.channels().list(
            part="snippet,statistics",
            id=self.creator.channel_id,
        ).execute()
        _track_quota(3)

        items = response.get("items", [])
        if not items:
            return {"error": "Channel not found"}

        channel = items[0]
        stats = channel.get("statistics", {})

        return {
            "channel_id": channel["id"],
            "title": channel["snippet"]["title"],
            "subscriber_count": int(stats.get("subscriberCount", 0)),
            "total_views": int(stats.get("viewCount", 0)),
            "video_count": int(stats.get("videoCount", 0)),
        }

    def fetch_recent_videos(self, max_results: int = 0) -> list[dict]:
        """
        Fetch videos for this channel using the uploads playlist.

        Uses playlistItems.list (1 quota unit/call) instead of search.list
        (100 quota units/call) for reliable, complete results.

        Args:
            max_results: Maximum videos to fetch. 0 = ALL videos (default).
        """
        youtube = self._get_youtube()

        # Derive uploads playlist ID: UC... → UU...
        uploads_playlist_id = "UU" + self.creator.channel_id[2:]

        # Step 1: Get all video IDs from the uploads playlist
        all_video_ids = []
        page_token = None
        target = max_results if max_results > 0 else 10000  # practical max

        while len(all_video_ids) < target:
            page_size = min(50, target - len(all_video_ids))
            playlist_resp = youtube.playlistItems().list(
                part="contentDetails",
                playlistId=uploads_playlist_id,
                maxResults=page_size,
                pageToken=page_token,
            ).execute()
            _track_quota(1)  # playlistItems.list = 1 quota unit

            video_ids = [
                item["contentDetails"]["videoId"]
                for item in playlist_resp.get("items", [])
                if item.get("contentDetails", {}).get("videoId")
            ]
            all_video_ids.extend(video_ids)

            page_token = playlist_resp.get("nextPageToken")
            if not page_token or not video_ids:
                break  # No more pages

        if not all_video_ids:
            logger.warning("No videos found for channel %s", self.creator.channel_id)
            return []

        # Step 2: Get full video details in batches of 50
        results = []
        for i in range(0, len(all_video_ids), 50):
            batch = all_video_ids[i:i+50]
            videos_resp = youtube.videos().list(
                part="snippet,contentDetails,statistics",
                id=",".join(batch),
            ).execute()
            _track_quota(3)

            for item in videos_resp.get("items", []):
                # Parse ISO 8601 duration (e.g., "PT4M13S" → 253 seconds)
                duration_str = item["contentDetails"].get("duration", "PT0S")
                try:
                    duration_seconds = int(isodate.parse_duration(duration_str).total_seconds())
                except Exception:
                    duration_seconds = 0

                # Parse published_at
                published_str = item["snippet"].get("publishedAt", "")
                try:
                    published_at = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
                except Exception:
                    published_at = None

                # Get best thumbnail
                thumbnails = item["snippet"].get("thumbnails", {})
                thumbnail_url = (
                    thumbnails.get("maxres", {}).get("url")
                    or thumbnails.get("high", {}).get("url")
                    or thumbnails.get("default", {}).get("url")
                    or ""
                )

                # Extract view count from statistics
                stats = item.get("statistics", {})
                view_count = int(stats.get("viewCount", 0))

                results.append({
                    "youtube_video_id": item["id"],
                    "title": item["snippet"]["title"],
                    "published_at": published_at,
                    "duration_seconds": duration_seconds,
                    "thumbnail_url": thumbnail_url,
                    "view_count": view_count,
                })

        return results

    # ── YouTube Analytics API ───────────────────────

    def _get_youtube_analytics(self):
        """Lazily build and cache the YouTube Analytics API v2 client."""
        if self._youtube_analytics is None:
            creds = self._get_credentials()
            self._youtube_analytics = build(
                "youtubeAnalytics", "v2", credentials=creds
            )
        return self._youtube_analytics

    def fetch_video_analytics(
        self,
        youtube_video_id: str,
        target_date: date | None = None,
    ) -> dict | None:
        """
        Fetch analytics metrics for a specific video on a specific date.

        Uses the YouTube Analytics API v2 (youtubeAnalytics.reports.query).

        Day-delay handling:
        - If no target_date provided, tries yesterday → 2 days ago → 3 days ago
        - Returns None if no data is found after all fallback attempts

        API cost: ~1 quota unit per query (Analytics API has separate quota)

        Returns dict with keys matching AnalyticsSnapshot columns:
            views, watch_time_minutes, average_view_duration,
            retention_at_30s (approximated from averageViewPercentage), ctr
        """
        yt_analytics = self._get_youtube_analytics()

        # Determine dates to try (day-delay fallback)
        if target_date:
            dates_to_try = [target_date]
        else:
            today = date.today()
            dates_to_try = [
                today - timedelta(days=1),  # yesterday
                today - timedelta(days=2),  # 2 days ago
                today - timedelta(days=3),  # 3 days ago
            ]

        for try_date in dates_to_try:
            date_str = try_date.isoformat()

            try:
                response = yt_analytics.reports().query(
                    ids="channel==MINE",
                    startDate=date_str,
                    endDate=date_str,
                    metrics="views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,annotationClickThroughRate",
                    dimensions="video",
                    filters=f"video=={youtube_video_id}",
                ).execute()
                _track_quota(1)
            except Exception as e:
                logger.warning(
                    "Analytics query failed for video %s on %s: %s",
                    youtube_video_id, date_str, e,
                )
                continue

            rows = response.get("rows", [])

            if rows:
                # columns: video, views, estimatedMinutesWatched,
                #          averageViewDuration, averageViewPercentage,
                #          annotationClickThroughRate
                row = rows[0]
                logger.info(
                    "Analytics found for video %s on %s",
                    youtube_video_id, date_str,
                )
                return {
                    "snapshot_date": try_date,
                    "views": int(row[1]),
                    "watch_time_minutes": int(row[2]),
                    "average_view_duration": int(row[3]),
                    "retention_at_30s": round(float(row[4]), 2),  # averageViewPercentage
                    "ctr": round(float(row[5]), 4),  # annotationClickThroughRate
                }

            logger.info(
                "No analytics data for video %s on %s — trying older date",
                youtube_video_id, date_str,
            )

        logger.warning(
            "No analytics data found for video %s after all fallback attempts",
            youtube_video_id,
        )
        return None

