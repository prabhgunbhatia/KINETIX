from sqlalchemy import Column, String, DateTime, Float, Integer, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"


class Activity(Base):
    __tablename__ = "activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Link to user (FK to users.id)
    strava_id = Column(String, unique=True, nullable=True, index=True)
    garmin_id = Column(String, unique=True, nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    distance = Column(Float, nullable=False)  # in meters
    moving_time = Column(Integer, nullable=False)  # in seconds
    heart_rate = Column(Float, nullable=True)  # average heart rate
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    temp_c = Column(Float, nullable=True)  # temperature in Celsius
    humidity = Column(Float, nullable=True)  # humidity percentage
    trimp_score = Column(Float, nullable=True)  # Training Impulse score
    adjusted_pace = Column(Float, nullable=True)  # weather-adjusted pace in seconds per km
    source = Column(String, nullable=True)  # 'strava' or 'garmin'

    def __repr__(self):
        return f"<Activity(id={self.id}, user_id={self.user_id}, strava_id={self.strava_id}, timestamp={self.timestamp})>"


class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String, nullable=False, index=True)  # 'strava' or 'garmin'
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Required: link to user account (FK to users.id)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    token_type = Column(String, nullable=True, default="Bearer")
    scope = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<OAuthToken(id={self.id}, provider={self.provider}, expires_at={self.expires_at})>"



