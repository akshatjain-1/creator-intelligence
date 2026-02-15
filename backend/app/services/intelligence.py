"""
Intelligence Service — Gemini AI Layer (Phase 2).

Translates pre-calculated metrics into human-readable advice.
This is NOT an AI analysis tool — it's a synthesis layer.
The math is already done by scoring_service.py.

Integration: Google Gemini 2.0 Flash via google-genai SDK
Prompt Strategy: Context injection (feed calculations, not raw data)
"""

import logging
from google import genai

from app.config import settings

logger = logging.getLogger(__name__)

# ── Configure Gemini client ────────────────────────────
client = genai.Client(api_key=settings.GEMINI_API_KEY)

SYSTEM_INSTRUCTION = """You are a YouTube Strategist. You receive structured performance metrics. Your job is to write a **single, brutal, actionable sentence** for the creator.

Rules:
- If Hook Score < Channel Average: Blame the intro. Be specific about what they should fix.
- If Hook Score > Channel Average: Praise the intro hook.
- If Velocity > Channel Average: Congratulate the topic choice and momentum.
- If Velocity < Channel Average: Warn about slow traction and suggest promotion tactics.
- Tone: Professional, concise, data-backed. No fluff. No emojis.
- Maximum 2 sentences. Every word must earn its place."""


def generate_insight(
    video_title: str,
    hook_score: float | None,
    channel_avg_hook: float | None,
    velocity: float | None,
    channel_avg_velocity: float | None,
) -> str:
    """
    Generate AI-powered insight for a specific video.

    Args:
        video_title: The video's title
        hook_score: This video's Hook Score (0-100 or None)
        channel_avg_hook: Channel average Hook Score
        velocity: This video's Growth Velocity
        channel_avg_velocity: Channel average Velocity

    Returns:
        A single actionable insight string.
        Falls back to a static message if Gemini fails.
    """
    # ── Determine primary issue ─────────────────────
    primary_issue = _determine_primary_issue(
        hook_score, channel_avg_hook, velocity, channel_avg_velocity
    )

    # ── Build the context payload ───────────────────
    payload = {
        "video_title": video_title,
        "hook_score": hook_score,
        "channel_avg_hook": channel_avg_hook,
        "velocity": velocity,
        "channel_avg_velocity": channel_avg_velocity,
        "primary_issue": primary_issue,
    }

    # ── Call Gemini ─────────────────────────────────
    try:
        prompt = f"""Analyze this video's performance and give one actionable insight:

{_format_payload(payload)}

Write your response as a single, direct sentence addressed to the creator."""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.7,
                max_output_tokens=150,
            ),
        )
        insight = response.text.strip()

        logger.info("Gemini insight generated for '%s'", video_title)
        return insight

    except Exception as e:
        logger.error("Gemini API failed for '%s': %s", video_title, e)

        # Fallback per spec: "AI analysis unavailable, but your Hook Score is X%."
        if hook_score is not None:
            return f"AI analysis unavailable, but your Hook Score is {hook_score:.0f}%."
        return "AI analysis unavailable. No analytics data found for this video yet."


def _determine_primary_issue(
    hook_score: float | None,
    channel_avg_hook: float | None,
    velocity: float | None,
    channel_avg_velocity: float | None,
) -> str:
    """Classify the primary performance issue for the prompt."""
    if hook_score is None:
        return "insufficient_data"

    if channel_avg_hook and hook_score < channel_avg_hook:
        return "retention_drop_early"

    if channel_avg_velocity and velocity and velocity < channel_avg_velocity:
        return "slow_velocity"

    if channel_avg_hook and hook_score > channel_avg_hook:
        return "strong_hook"

    if channel_avg_velocity and velocity and velocity > channel_avg_velocity:
        return "strong_velocity"

    return "average_performance"


def _format_payload(payload: dict) -> str:
    """Format the payload as a readable string for the prompt."""
    lines = []
    for key, value in payload.items():
        if value is None:
            lines.append(f"- {key}: N/A (no data yet)")
        else:
            lines.append(f"- {key}: {value}")
    return "\n".join(lines)
