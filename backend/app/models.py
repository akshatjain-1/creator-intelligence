"""
SQLAlchemy ORM models — Phase 2.5 Multi-Tenant Schema.

Hierarchy:  User  →  YouTubeChannel  →  Video  →  AnalyticsSnapshot
"""

import uuid
from datetime import datetime, date

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Date,
    Text,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


# ── Identity ────────────────────────────────────────


class User(Base):
    """
    A human who logs in via Firebase Authentication.
    This is the top-level tenant — all data branches from here.
    """

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String(128), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    channels = relationship(
        "YouTubeChannel", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User firebase_uid={self.firebase_uid}>"


# ── Platform Integration ────────────────────────────


class YouTubeChannel(Base):
    """
    A YouTube channel connected by a User.
    One User can own many channels (1-to-Many).
    Tokens are Fernet-encrypted at rest.
    """

    __tablename__ = "youtube_channels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    youtube_channel_id = Column(String(64), nullable=False, unique=True, index=True)
    channel_name = Column(String(255), nullable=True)
    channel_avatar_url = Column(String(500), nullable=True)

    # Encrypted OAuth tokens
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime(timezone=True), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user = relationship("User", back_populates="channels")
    videos = relationship(
        "Video", back_populates="channel", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<YouTubeChannel {self.youtube_channel_id}>"


# ── Content ─────────────────────────────────────────


class Video(Base):
    """A single YouTube video's metadata and derived scores."""

    __tablename__ = "videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id = Column(
        UUID(as_uuid=True),
        ForeignKey("youtube_channels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    youtube_video_id = Column(String(32), nullable=False, unique=True)
    title = Column(String(500), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    view_count = Column(Integer, nullable=True)

    # Derived metrics (populated by scoring_service)
    hook_score = Column(Float, nullable=True)
    velocity = Column(Float, nullable=True)
    last_analyzed_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    channel = relationship("YouTubeChannel", back_populates="videos")
    analytics_snapshots = relationship(
        "AnalyticsSnapshot", back_populates="video", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Video youtube_id={self.youtube_video_id}>"


# ── Analytics ───────────────────────────────────────


class AnalyticsSnapshot(Base):
    """Time-series analytics data for a video on a specific date."""

    __tablename__ = "analytics_snapshots"
    __table_args__ = (
        UniqueConstraint("video_id", "snapshot_date", name="uq_video_date"),
        Index("ix_snapshot_date", "snapshot_date"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_date = Column(Date, primary_key=True, nullable=False)
    video_id = Column(
        UUID(as_uuid=True),
        ForeignKey("videos.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Metrics
    views = Column(Integer, nullable=True, default=0)
    watch_time_minutes = Column(Integer, nullable=True, default=0)
    average_view_duration = Column(Integer, nullable=True, default=0)
    retention_at_30s = Column(Float, nullable=True)
    ctr = Column(Float, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    video = relationship("Video", back_populates="analytics_snapshots")

    def __repr__(self) -> str:
        return f"<AnalyticsSnapshot video_id={self.video_id} date={self.snapshot_date}>"
