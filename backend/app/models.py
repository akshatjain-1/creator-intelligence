"""
SQLAlchemy ORM models for the 3 core tables.

Schema follows the PRD §6 — Data Schema Specifications.
"""

import uuid
from datetime import datetime, date

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
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


class Creator(Base):
    """
    A YouTube channel owner who has authenticated with the app.
    Tokens are stored as Fernet-encrypted strings.
    """

    __tablename__ = "creators"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id = Column(String(64), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=True)
    channel_title = Column(String(255), nullable=True)

    # Encrypted OAuth tokens
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime(timezone=True), nullable=True)

    # Ingestion scheduling
    next_analytics_sync = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    videos = relationship("Video", back_populates="creator", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Creator channel_id={self.channel_id}>"


class Video(Base):
    """
    A single YouTube video's metadata.
    """

    __tablename__ = "videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(
        UUID(as_uuid=True),
        ForeignKey("creators.id", ondelete="CASCADE"),
        nullable=False,
    )
    youtube_video_id = Column(String(32), nullable=False, unique=True)
    title = Column(String(500), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    creator = relationship("Creator", back_populates="videos")
    analytics_snapshots = relationship(
        "AnalyticsSnapshot", back_populates="video", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Video youtube_id={self.youtube_video_id}>"


class AnalyticsSnapshot(Base):
    """
    Time-series analytics data for a video on a specific date.

    This table is converted to a TimescaleDB hypertable (partitioned on
    snapshot_date) via the Alembic migration for efficient time-range queries.

    NOTE: Composite PK (id, snapshot_date) is required by TimescaleDB — the
    partitioning column must be part of the primary key.
    """

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
