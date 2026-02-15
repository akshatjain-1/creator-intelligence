"""Quick script to test analytics fetching."""
import httpx
import json

channel_id = "UCiKzIV0YpLF8Va2u8IdKpWw"  # Just Shop
r = httpx.get(f"http://localhost:8000/test/analytics/{channel_id}", timeout=300)
d = r.json()

print(f"Processed: {d.get('analytics_processed')} / {d.get('total_videos')}")
print(f"Quota: {d.get('quota_used')}")
print()

for x in d.get("details", []):
    vid = x["youtube_video_id"]
    action = x["action"]
    views = x.get("views", "")
    title = x.get("title", "")[:40]
    print(f"  {vid}: {action:10s} {str(views):>6s}  {title}")
