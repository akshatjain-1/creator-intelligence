"""
Backfill Script — Recalculate scores for all existing videos.

Run this after the Phase 2 migration to populate hook_score
and velocity for any videos already in the database.

Usage:
    cd backend
    .\\venv\\Scripts\\python.exe recalc_scores.py
"""

import sys
import os

# Ensure the backend directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.services.scoring_service import score_all_videos


def main():
    print("=" * 60)
    print("  Creator Intelligence Engine — Score Backfill")
    print("=" * 60)

    db = SessionLocal()
    try:
        results = score_all_videos(db)

        print(f"\nScored {len(results)} videos:\n")
        for r in results:
            hook = f"{r['hook_score']:.1f}" if r["hook_score"] is not None else "null"
            vel = f"{r['velocity']:.2f}" if r["velocity"] is not None else "null"
            print(f"  [{r['youtube_video_id']}] {r['title'][:40]}")
            print(f"    Hook Score: {hook}  |  Velocity: {vel}")

            if r["baseline_hook"] is not None and r["hook_delta"] is not None:
                print(f"    Baseline Hook: {r['baseline_hook']:.1f}  (Δ {r['hook_delta']:+.1f}%)")
            if r["baseline_velocity"] is not None and r["velocity_delta"] is not None:
                print(f"    Baseline Vel:  {r['baseline_velocity']:.2f}  (Δ {r['velocity_delta']:+.1f}%)")
            print()

        print("✅ Backfill complete!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
