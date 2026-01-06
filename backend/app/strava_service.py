"""
Strava API service for fetching activities and athlete data.
Handles OAuth token management with automatic refresh.
"""
import httpx
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from app.models import OAuthToken


STRAVA_API_BASE = "https://www.strava.com/api/v3"


async def get_valid_token(db: Session, user_id: str) -> Optional[str]:
    """
    Get a valid Strava access token for a user, automatically refreshing if expired.
    
    This function checks if the current access token is expired and uses the refresh token
    to fetch a new one if necessary. Ensures timezone-aware datetime comparisons.
    
    Args:
        db: Database session
        user_id: User ID to get token for
        
    Returns:
        Valid access token string, or None if no token exists or refresh fails
    """
    from datetime import timezone
    
    query = db.query(OAuthToken).filter(
        OAuthToken.provider == "strava",
        OAuthToken.user_id == user_id
    )
    
    token_record = query.first()
    
    if not token_record:
        return None
    
    # Ensure timezone-aware datetime for comparison
    now = datetime.now(timezone.utc)
    
    # Check if token is expired (with 5 minute buffer for safety)
    if token_record.expires_at:
        # Ensure expires_at is timezone-aware
        expires_at = token_record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if now >= expires_at - timedelta(minutes=5):
            # Token expired or about to expire, refresh it
            if not token_record.refresh_token:
                print(f"Warning: Strava token expired for user {user_id} but no refresh token available")
                return None
            
            new_token = await refresh_strava_token(db, token_record.refresh_token, token_record.id)
            if new_token:
                return new_token
            return None
    
    return token_record.access_token


async def get_strava_token(db: Session, user_id: str) -> Optional[str]:
    """
    Legacy function name - delegates to get_valid_token for backward compatibility.
    
    Get valid Strava access token from database for a specific user.
    Refreshes token if expired.
    """
    return await get_valid_token(db, user_id)


async def refresh_strava_token(db: Session, refresh_token: str, token_id: str) -> Optional[str]:
    """
    Refresh Strava access token using refresh token.
    Ensures timezone-aware datetime objects are stored.
    """
    import os
    from datetime import timezone
    
    client_id = os.getenv("STRAVA_CLIENT_ID")
    client_secret = os.getenv("STRAVA_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        return None
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.strava.com/oauth/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            
            if response.status_code == 200:
                data = response.json()
                token_record = db.query(OAuthToken).filter(OAuthToken.id == token_id).first()
                if token_record:
                    token_record.access_token = data["access_token"]
                    if "refresh_token" in data:
                        token_record.refresh_token = data["refresh_token"]
                    if "expires_at" in data:
                        # Convert Unix timestamp to timezone-aware datetime
                        expires_at = datetime.fromtimestamp(data["expires_at"], tz=timezone.utc)
                        token_record.expires_at = expires_at
                    token_record.updated_at = datetime.now(timezone.utc)
                    db.commit()
                    return data["access_token"]
    except Exception as e:
        print(f"Error refreshing Strava token: {e}")
        import traceback
        traceback.print_exc()
    
    return None


async def fetch_strava_activities(
    db: Session,
    access_token: str,
    per_page: int = 200,
    before: Optional[datetime] = None,
    after: Optional[datetime] = None
) -> List[Dict]:
    """
    Fetch activities from Strava API.
    
    Args:
        db: Database session
        access_token: Strava access token
        per_page: Number of activities per page (max 200)
        before: Fetch activities before this date
        after: Fetch activities after this date
    
    Returns:
        List of activity dictionaries
    """
    activities = []
    page = 1
    
    try:
        async with httpx.AsyncClient() as client:
            while True:
                params = {
                    "per_page": per_page,
                    "page": page,
                }
                
                if before:
                    params["before"] = int(before.timestamp())
                if after:
                    params["after"] = int(after.timestamp())
                
                response = await client.get(
                    f"{STRAVA_API_BASE}/athlete/activities",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params=params,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    print(f"Error fetching Strava activities: {response.status_code} - {response.text}")
                    break
                
                page_activities = response.json()
                if not page_activities:
                    break
                
                activities.extend(page_activities)
                
                # If we got fewer than per_page, we've reached the end
                if len(page_activities) < per_page:
                    break
                
                page += 1
                
                # Rate limiting: Strava allows 200 requests per 15 minutes
                # Be conservative and add a small delay
                import asyncio
                await asyncio.sleep(0.5)
    
    except Exception as e:
        print(f"Error fetching Strava activities: {e}")
    
    return activities


async def fetch_strava_activity_details(
    access_token: str,
    activity_id: int
) -> Optional[Dict]:
    """
    Fetch detailed information for a specific Strava activity.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{STRAVA_API_BASE}/activities/{activity_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"include_all_efforts": "false"},
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"Error fetching Strava activity {activity_id}: {e}")
    
    return None


def convert_strava_activity_to_db_format(strava_activity: Dict) -> Dict:
    """
    Convert Strava API activity format to our database format.
    """
    # Get start location (if available)
    start_lat = None
    start_lon = None
    if "start_latlng" in strava_activity and strava_activity["start_latlng"]:
        start_lat = strava_activity["start_latlng"][0]
        start_lon = strava_activity["start_latlng"][1]
    
    # Get average heart rate (if available)
    heart_rate = None
    if "average_heartrate" in strava_activity:
        heart_rate = strava_activity["average_heartrate"]
    
    # Parse start date - ensure timezone-aware
    start_date_str = strava_activity["start_date"]
    if start_date_str.endswith("Z"):
        start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
    else:
        start_date = datetime.fromisoformat(start_date_str)
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
    
    return {
        "strava_id": str(strava_activity["id"]),
        "timestamp": start_date,
        "distance": float(strava_activity.get("distance", 0)),  # in meters
        "moving_time": int(strava_activity.get("moving_time", 0)),  # in seconds
        "heart_rate": heart_rate,
        "lat": start_lat,
        "lon": start_lon,
        "source": "strava",
    }

