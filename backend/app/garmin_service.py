"""
Garmin API service for fetching activities.
Note: Garmin Connect API requires OAuth 1.0a and developer program approval.
This is a placeholder structure that can be completed once API access is granted.
"""
import httpx
from datetime import datetime
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from app.models import OAuthToken


# Garmin API endpoints (these may vary based on API version and approval)
GARMIN_API_BASE = "https://connectapi.garmin.com"


async def get_garmin_token(db: Session, user_id: str) -> Optional[Dict]:
    """
    Get Garmin OAuth tokens from database for a specific user.
    Garmin uses OAuth 1.0a, which requires both token and token_secret.
    """
    query = db.query(OAuthToken).filter(
        OAuthToken.provider == "garmin",
        OAuthToken.user_id == user_id
    )
    
    token_record = query.first()
    
    if not token_record:
        return None
    
    # For OAuth 1.0a, we need both token and secret
    # Store token_secret in refresh_token field for OAuth 1.0a
    return {
        "token": token_record.access_token,
        "token_secret": token_record.refresh_token,
    }


async def fetch_garmin_activities(
    db: Session,
    oauth_token: str,
    oauth_token_secret: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[Dict]:
    """
    Fetch activities from Garmin Connect API.
    
    Note: This requires:
    1. Garmin Developer Program approval
    2. OAuth 1.0a implementation
    3. Proper API credentials
    
    This is a placeholder that will need to be completed with actual API integration.
    """
    # TODO: Implement OAuth 1.0a signing
    # TODO: Make authenticated request to Garmin Activity API
    # TODO: Parse and return activities
    
    return []


def convert_garmin_activity_to_db_format(garmin_activity: Dict) -> Dict:
    """
    Convert Garmin API activity format to our database format.
    """
    # TODO: Map Garmin activity fields to our schema
    # This will depend on the actual Garmin API response structure
    
    return {
        "garmin_id": str(garmin_activity.get("activityId", "")),
        "timestamp": datetime.fromisoformat(garmin_activity.get("startTimeGMT", "")),
        "distance": float(garmin_activity.get("distance", 0)),  # in meters
        "moving_time": int(garmin_activity.get("duration", 0)),  # in seconds
        "heart_rate": garmin_activity.get("averageHR", None),
        "lat": garmin_activity.get("startLatitude", None),
        "lon": garmin_activity.get("startLongitude", None),
        "source": "garmin",
    }

