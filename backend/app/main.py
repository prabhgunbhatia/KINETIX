from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta, timezone
import uuid
import os
import re

from app.database import get_db, engine, Base
from app.models import Activity, User
from app.weather_service import calculate_weather_adjusted_pace, get_weather_data
from app.analytics_service import (
    calculate_acwr, 
    get_weather_adjusted_runs, 
    calculate_trimp,
    get_average_true_effort_pace,
    predict_race_time,
    calculate_race_trimp,
    generate_taper_plan,
    calculate_daily_avg_load,
    project_fitness_growth
)
from app.auth import router as auth_router, get_current_user
from app.strava_service import (
    get_strava_token,
    get_valid_token,
    fetch_strava_activities,
    convert_strava_activity_to_db_format
)
from app.garmin_service import (
    get_garmin_token,
    fetch_garmin_activities,
    convert_garmin_activity_to_db_format
)

# Disable docs in production (set ENABLE_DOCS=false to hide /docs and /redoc)
# Note: os is imported at the top of the file
enable_docs = os.getenv("ENABLE_DOCS", "true").lower() == "true"

app = FastAPI(
    title="KINETIX API", 
    version="1.0.0",
    docs_url="/docs" if enable_docs else None,
    redoc_url="/redoc" if enable_docs else None,
    openapi_url="/openapi.json" if enable_docs else None,
)

# CORS middleware for frontend - MUST be added BEFORE routes
# Allow origins from environment variable or default to localhost
import os
import re
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
# Split by comma and strip whitespace from each origin
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

# Also allow all Vercel preview URLs (they follow the pattern: https://project-*-username.vercel.app)
# This allows preview deployments to work without updating ALLOWED_ORIGINS each time
vercel_pattern = re.compile(r'^https://[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+\.vercel\.app$')
vercel_production_pattern = re.compile(r'^https://[a-z0-9-]+\.vercel\.app$')

# Check if any of the allowed origins is a Vercel domain
has_vercel_origin = any(
    vercel_pattern.match(origin) or vercel_production_pattern.match(origin) 
    for origin in allowed_origins
)

print(f"DEBUG: CORS allowed origins: {allowed_origins}")
if has_vercel_origin:
    print("DEBUG: Vercel domain detected - allowing all Vercel preview URLs")
# Custom CORS origin validator to allow Vercel preview URLs
def is_allowed_origin(origin: str) -> bool:
    # Check exact matches first
    if origin in allowed_origins:
        return True
    # If we have a Vercel origin, allow all Vercel preview URLs
    if has_vercel_origin:
        if vercel_pattern.match(origin) or vercel_production_pattern.match(origin):
            return True
    return False

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app" if has_vercel_origin else None,
    allow_origins=allowed_origins if not has_vercel_origin else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Create database tables on startup
@app.on_event("startup")
def create_tables():
    """Create database tables on application startup"""
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        import traceback
        traceback.print_exc()
        print("\n⚠️  If you see schema errors, delete the database file and restart:")
        print("   Remove-Item backend\\lactate_lift.db")

# Include auth router
app.include_router(auth_router)

# Explicit OPTIONS handler for all routes to ensure CORS preflight works
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Handle OPTIONS preflight requests for CORS"""
    return {"message": "OK"}

@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {"message": "KINETIX API", "version": "1.0.0", "status": "running"}



@app.get("/sync")
async def sync_activities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    clear: bool = True,
    source: str = "auto"  # 'auto', 'strava', 'garmin', or 'sample'
):
    """
    Sync activities from Strava, Garmin, or generate sample data.
    
    Args:
        clear: If True (default), clears all existing activities before syncing new ones
        source: Data source - 'auto' (try Strava first, then sample), 'strava', 'garmin', or 'sample'
    """
    import random
    
    # Clear existing activities for this user if requested
    if clear:
        deleted_count = db.query(Activity).filter(Activity.user_id == current_user.id).delete()
        db.commit()
        print(f"Cleared {deleted_count} existing activities for user {current_user.id}")
    
    # Try to sync from Strava if available
    if source in ["auto", "strava"]:
        try:
            # Use get_valid_token to ensure token is fresh
            access_token = await get_valid_token(db, str(current_user.id))
            if access_token:
                print("Found valid Strava token, fetching activities from API...")
                activities = await fetch_strava_activities(
                    db,
                    access_token,
                    per_page=200,
                    after=datetime.now(timezone.utc) - timedelta(days=90)  # Last 90 days
                )
                
                if activities:
                    print(f"Fetched {len(activities)} activities from Strava API")
                    created_count = await process_and_save_activities(
                        db, activities, "strava", convert_strava_activity_to_db_format, current_user.id
                    )
                    return {
                        "message": f"Synced {created_count} activities from Strava",
                        "count": created_count,
                        "source": "strava"
                    }
                else:
                    print("No activities found in Strava account")
                    if source == "strava":
                        return {
                            "message": "No activities found in Strava account",
                            "count": 0,
                            "source": "strava"
                        }
            else:
                if source == "strava":
                    raise HTTPException(
                        status_code=401,
                        detail="Strava not connected. Please connect your Strava account first."
                    )
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error syncing from Strava: {e}")
            import traceback
            traceback.print_exc()
            if source == "strava":
                raise HTTPException(status_code=500, detail=f"Error syncing from Strava: {str(e)}")
    
    # Try to sync from Garmin if available
    if source in ["auto", "garmin"]:
        try:
            garmin_tokens = await get_garmin_token(db, current_user.id)
            if garmin_tokens:
                print("Found Garmin token, fetching activities from API...")
                activities = await fetch_garmin_activities(
                    db,
                    garmin_tokens["token"],
                    garmin_tokens["token_secret"],
                    start_date=datetime.now(timezone.utc) - timedelta(days=90)
                )
                
                if activities:
                    print(f"Fetched {len(activities)} activities from Garmin API")
                    created_count = await process_and_save_activities(
                        db, activities, "garmin", convert_garmin_activity_to_db_format, current_user.id
                    )
                    return {
                        "message": f"Synced {created_count} activities from Garmin",
                        "count": created_count,
                        "source": "garmin"
                    }
        except Exception as e:
            print(f"Error syncing from Garmin: {e}")
            if source == "garmin":
                raise HTTPException(status_code=500, detail=f"Error syncing from Garmin: {str(e)}")
    
    # Fall back to sample data if no API connection or source is 'sample'
    print("Generating sample data...")
    
    # Generate realistic sample data for the last 35 days (more than 28 for proper chronic load)
    sample_activities = []
    base_date = datetime.now(timezone.utc)  # Timezone-aware base date
    
    print(f"Generating activities starting from {base_date}")
    
    # Create a realistic training pattern with variation
    # Distribute activities to avoid overload in recent days
    activities_generated = 0
    for i in range(35):
        days_ago = i
        activity_date = base_date - timedelta(days=days_ago)
        
        # Create weekly patterns (harder on some days, easier on others)
        day_of_week = activity_date.weekday()
        week_number = days_ago // 7
        
        # Add minimal rest days to ensure we have enough data for calculations
        # Only skip 3% of weekdays and 1% of weekends
        if day_of_week not in [5, 6] and random.random() < 0.03:
            continue  # Skip this day (rest day)
        elif day_of_week in [5, 6] and random.random() < 0.01:
            continue  # Skip weekend occasionally
        
        # Base distance varies by day of week - more varied like the image
        if day_of_week in [5, 6]:  # Weekend - longer runs
            base_distance = random.choice([
                10000, 12000, 15000, 18000, 21100  # 10km, 12km, 15km, 18km, 21.1km (half marathon)
            ])
        elif day_of_week == 0:  # Monday - recovery
            base_distance = random.choice([5000, 6400, 8000])  # 5km, 6.4km, 8km
        else:  # Weekdays
            base_distance = random.choice([6000, 8000, 10000, 12000])  # 6km, 8km, 10km, 12km
        
        distance = base_distance
        
        # Pace calculation - varied realistic paces like the image (4:05 to 5:30/km)
        # Based on distance and effort level
        if distance < 7000:  # Short runs - can be fast
            pace_per_km = random.choice([245, 250, 255, 290, 300, 330])  # 4:05-5:30/km
        elif distance > 20000:  # Very long runs - slower
            pace_per_km = random.choice([290, 294, 300, 310])  # 4:50-5:10/km
        elif distance > 15000:  # Long runs
            pace_per_km = random.choice([258, 270, 290, 294])  # 4:18-4:54/km
        else:  # Normal runs
            pace_per_km = random.choice([245, 250, 258, 270, 290, 300])  # 4:05-5:00/km
        
        # Calculate moving time from distance and pace
        distance_km = distance / 1000.0
        moving_time = int(pace_per_km * distance_km)
        
        # Heart rate varies with effort - LOWER to reduce TRIMP and keep ACWR balanced
        # Lower HR = lower TRIMP = more balanced ACWR
        if pace_per_km < 280:  # Fast run (under 4:40/km)
            heart_rate = 150 + random.randint(-5, 8)  # Reduced from 160
        elif distance > 15000:  # Long run
            heart_rate = 135 + random.randint(-5, 8)  # Reduced from 140
        else:  # Normal run
            heart_rate = 140 + random.randint(-8, 8)  # Reduced from 145
        
        # Add some variation to location (slight drift)
        lat = 40.7128 + (random.random() - 0.5) * 0.1
        lon = -74.0060 + (random.random() - 0.5) * 0.1
        
        # Generate unique strava_id with timestamp to avoid conflicts
        sample_activities.append({
            "user_id": current_user.id,
            "strava_id": f"strava_{activity_date.strftime('%Y%m%d')}_{i}_{int(base_date.timestamp())}",
            "timestamp": activity_date,
            "distance": distance,
            "moving_time": moving_time,
            "heart_rate": heart_rate,
            "lat": lat,
            "lon": lon,
            "source": "sample",
        })
        activities_generated += 1
    
    print(f"Generated {activities_generated} activity templates, {len(sample_activities)} after filtering")
    
    if len(sample_activities) == 0:
        return {
            "message": "No activities generated. Try again.",
            "count": 0
        }
    
    created_activities = []
    
    for idx, activity_data in enumerate(sample_activities):
        # No need to check for existing since we cleared all activities
        
        # Fetch weather data (optional, won't fail if unavailable)
        try:
            weather = get_weather_data(
                activity_data["lat"],
                activity_data["lon"],
                activity_data["timestamp"]
            )
            
            if weather:
                activity_data["temp_c"] = weather.get("main", {}).get("temp")
                activity_data["humidity"] = weather.get("main", {}).get("humidity")
        except Exception as e:
            print(f"Warning: Could not fetch weather for activity {idx}: {e}")
            # Continue without weather data
        
        # Calculate TRIMP score
        duration_minutes = activity_data["moving_time"] / 60.0
        trimp = calculate_trimp(
            activity_data["heart_rate"],
            duration_minutes
        )
        activity_data["trimp_score"] = trimp
        
        # Calculate base pace (seconds per km)
        distance_km = activity_data["distance"] / 1000.0
        base_pace = activity_data["moving_time"] / distance_km
        
        # Calculate weather-adjusted pace
        try:
            adjusted_pace = calculate_weather_adjusted_pace(
                base_pace,
                activity_data.get("temp_c"),
                activity_data.get("humidity"),
                activity_data["lat"],
                activity_data["lon"],
                activity_data["timestamp"]
            )
            activity_data["adjusted_pace"] = adjusted_pace
        except Exception as e:
            print(f"Warning: Could not calculate adjusted pace for activity {idx}: {e}")
            activity_data["adjusted_pace"] = base_pace  # Fallback to base pace
        
        # Create activity
        try:
            activity = Activity(**activity_data)
            db.add(activity)
            created_activities.append(activity)
            if (idx + 1) % 10 == 0:
                print(f"Added {idx + 1}/{len(sample_activities)} activities...")
        except Exception as e:
            print(f"Error creating activity {activity_data.get('strava_id')}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    try:
        db.commit()
        print(f"Successfully committed {len(created_activities)} activities to database")
    except Exception as e:
        print(f"Error committing activities: {e}")
        db.rollback()
        return {
            "message": f"Error syncing activities: {str(e)}",
            "count": 0
        }
    
    return {
        "message": f"Synced {len(created_activities)} sample activities",
        "count": len(created_activities),
        "source": "sample"
    }


async def process_and_save_activities(
    db: Session,
    api_activities: list,
    source: str,
    converter_func,
    user_id  # Can be UUID or str
):
    """
    Process activities from API and save to database.
    
    Args:
        db: Database session
        api_activities: List of activities from API
        source: 'strava' or 'garmin'
        converter_func: Function to convert API format to DB format
        user_id: User ID to associate activities with
    
    Returns:
        Number of activities created
    """
    created_count = 0
    
    for idx, api_activity in enumerate(api_activities):
        try:
            # Convert API format to our DB format
            activity_data = converter_func(api_activity)
            
            # Add user_id to activity data
            activity_data["user_id"] = user_id
            
            # Check if activity already exists for this user
            if source == "strava" and activity_data.get("strava_id"):
                existing = db.query(Activity).filter(
                    Activity.strava_id == activity_data["strava_id"],
                    Activity.user_id == user_id
                ).first()
            elif source == "garmin" and activity_data.get("garmin_id"):
                existing = db.query(Activity).filter(
                    Activity.garmin_id == activity_data["garmin_id"],
                    Activity.user_id == user_id
                ).first()
            else:
                existing = None
            
            if existing:
                # Update existing activity
                for key, value in activity_data.items():
                    if key != "id" and hasattr(existing, key):
                        setattr(existing, key, value)
                continue
            
            # Skip if missing required fields
            if not activity_data.get("distance") or not activity_data.get("moving_time"):
                continue
            
            # Fetch weather data
            try:
                weather = get_weather_data(
                    activity_data.get("lat"),
                    activity_data.get("lon"),
                    activity_data["timestamp"]
                )
                if weather:
                    activity_data["temp_c"] = weather.get("main", {}).get("temp")
                    activity_data["humidity"] = weather.get("main", {}).get("humidity")
            except Exception as e:
                print(f"Warning: Could not fetch weather for activity {idx}: {e}")
            
            # Calculate TRIMP score
            if activity_data.get("heart_rate"):
                duration_minutes = activity_data["moving_time"] / 60.0
                trimp = calculate_trimp(
                    activity_data["heart_rate"],
                    duration_minutes
                )
                activity_data["trimp_score"] = trimp
            
            # Calculate weather-adjusted pace
            distance_km = activity_data["distance"] / 1000.0
            base_pace = activity_data["moving_time"] / distance_km
            
            try:
                adjusted_pace = calculate_weather_adjusted_pace(
                    base_pace,
                    activity_data.get("temp_c"),
                    activity_data.get("humidity"),
                    activity_data.get("lat"),
                    activity_data.get("lon"),
                    activity_data["timestamp"]
                )
                activity_data["adjusted_pace"] = adjusted_pace
            except Exception as e:
                activity_data["adjusted_pace"] = base_pace
            
            # Create activity
            activity = Activity(**activity_data)
            db.add(activity)
            created_count += 1
            
            if (idx + 1) % 10 == 0:
                print(f"Processed {idx + 1}/{len(api_activities)} activities...")
        
        except Exception as e:
            print(f"Error processing activity {idx}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    try:
        db.commit()
        print(f"Successfully saved {created_count} activities to database")
    except Exception as e:
        print(f"Error committing activities: {e}")
        db.rollback()
        raise
    
    return created_count


@app.get("/dashboard")
def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard data including ACWR ratio and weather-adjusted runs.
    """
    # Calculate ACWR using actual database data for this user
    acwr_data = calculate_acwr(db, current_user.id)
    
    # Debug: Log the calculated values
    print(f"ACWR Calculation - Chronic Load: {acwr_data['chronic_load']}, Acute Load: {acwr_data['acute_load']}, ACWR Ratio: {acwr_data['acwr_ratio']}")
    
    # Get weather-adjusted runs for this user
    runs = get_weather_adjusted_runs(db, current_user.id, limit=10)
    
    # Calculate average weather-adjusted pace
    if runs:
        avg_adjusted_pace = sum(run["adjusted_pace"] for run in runs) / len(runs)
    else:
        avg_adjusted_pace = 0.0
    
    # Get historical ACWR data for chart (last 28 days)
    # Use the analytics service to get continuous daily data with proper resampling
    from app.analytics_service import get_activities_in_range
    import pandas as pd
    
    historical_data = []
    today = datetime.now(timezone.utc)  # Timezone-aware
    twenty_eight_days_ago = today - timedelta(days=28)
    
    # Get all activities in the 28-day window
    activities = get_activities_in_range(db, twenty_eight_days_ago, today, current_user.id)
    
    if activities:
        # Convert to DataFrame for vectorized operations
        df = pd.DataFrame([
            {
                "timestamp": act.timestamp,
                "trimp_score": act.trimp_score or 0.0
            }
            for act in activities if act.trimp_score is not None
        ])
        
        if len(df) > 0:
            # Ensure timestamp is timezone-aware and set as index
            if df['timestamp'].dt.tz is None:
                df['timestamp'] = pd.to_datetime(df['timestamp']).dt.tz_localize(timezone.utc)
            else:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            df.set_index('timestamp', inplace=True)
            
            # Create a date range for the last 28 days (including today)
            # Normalize to midnight UTC for proper date comparison
            start_date = pd.Timestamp(twenty_eight_days_ago).normalize()
            end_date = pd.Timestamp(today).normalize()
            
            # Ensure timezone-aware
            if start_date.tz is None:
                start_date = start_date.tz_localize(timezone.utc)
            if end_date.tz is None:
                end_date = end_date.tz_localize(timezone.utc)
            
            date_range = pd.date_range(start=start_date, end=end_date, freq='D')
            
            # Resample to daily frequency, summing TRIMP scores per day
            daily_trimp = df['trimp_score'].resample('D').sum()
            
            # Reindex to include ALL days in the 28-day window, filling missing days with 0
            daily_trimp = daily_trimp.reindex(date_range, fill_value=0.0)
            
            # Calculate rolling averages for each day
            acute_load_series = daily_trimp.rolling(window=7, min_periods=1).mean()
            chronic_load_series = daily_trimp.rolling(window=28, min_periods=1).mean()
            
            # Generate data for each day in the 28-day window
            for date in date_range:
                # Get values for this date
                if date in acute_load_series.index:
                    acute = float(acute_load_series.loc[date])
                else:
                    acute = 0.0
                
                if date in chronic_load_series.index:
                    chronic = float(chronic_load_series.loc[date])
                else:
                    chronic = 0.0
                
                acwr_ratio = acute / chronic if chronic > 0 else 0.0
                
                historical_data.append({
                    "date": date.isoformat(),
                    "chronic_load": round(chronic, 2),
                    "acute_load": round(acute, 2),
                    "acwr_ratio": round(acwr_ratio, 2)
                })
    
    # If no activities, still return 28 days of zeros for continuous graph
    if not historical_data:
        for i in range(28):
            date = today - timedelta(days=27 - i)
            if date.tzinfo is None:
                date = date.replace(tzinfo=timezone.utc)
            historical_data.append({
                "date": date.isoformat(),
                "chronic_load": 0.0,
                "acute_load": 0.0,
                "acwr_ratio": 0.0
            })
    
    return {
        "acwr": acwr_data,
        "weather_adjusted_runs": runs,
        "avg_weather_adjusted_pace": round(avg_adjusted_pace, 2),
        "historical_acwr": historical_data
    }


@app.post("/activities/manual")
async def create_manual_activity(
    activity_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a manual activity entry.
    
    Expected fields in activity_data:
    - distance: float (in meters)
    - moving_time: int (in seconds)
    - heart_rate: float (optional, average heart rate)
    - timestamp: str (ISO format datetime)
    - lat: float (optional, latitude)
    - lon: float (optional, longitude)
    """
    from pydantic import BaseModel, Field
    from typing import Optional
    
    class ManualActivity(BaseModel):
        distance: float = Field(..., gt=0, description="Distance in meters")
        moving_time: int = Field(..., gt=0, description="Moving time in seconds")
        heart_rate: Optional[float] = Field(None, ge=0, le=250, description="Average heart rate")
        timestamp: str = Field(..., description="ISO format datetime")
        lat: Optional[float] = Field(None, ge=-90, le=90, description="Latitude")
        lon: Optional[float] = Field(None, ge=-180, le=180, description="Longitude")
    
    try:
        # Validate input
        activity = ManualActivity(**activity_data)
        
        # Parse timestamp
        try:
            activity_timestamp = datetime.fromisoformat(activity.timestamp.replace("Z", "+00:00"))
            if activity_timestamp.tzinfo is None:
                activity_timestamp = activity_timestamp.replace(tzinfo=timezone.utc)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid timestamp format: {str(e)}")
        
        # Prepare activity data
        db_activity_data = {
            "user_id": current_user.id,
            "timestamp": activity_timestamp,
            "distance": activity.distance,
            "moving_time": activity.moving_time,
            "heart_rate": activity.heart_rate,
            "lat": activity.lat,
            "lon": activity.lon,
            "source": "manual",
        }
        
        # Fetch weather data if location provided
        if activity.lat and activity.lon:
            try:
                weather = get_weather_data(activity.lat, activity.lon, activity_timestamp)
                if weather:
                    db_activity_data["temp_c"] = weather.get("main", {}).get("temp")
                    db_activity_data["humidity"] = weather.get("main", {}).get("humidity")
            except Exception as e:
                print(f"Warning: Could not fetch weather: {e}")
        
        # Calculate TRIMP score if heart rate provided
        if activity.heart_rate:
            duration_minutes = activity.moving_time / 60.0
            trimp = calculate_trimp(activity.heart_rate, duration_minutes)
            db_activity_data["trimp_score"] = trimp
        
        # Calculate normalized pace
        distance_km = activity.distance / 1000.0
        base_pace = activity.moving_time / distance_km
        
        try:
            adjusted_pace = calculate_weather_adjusted_pace(
                base_pace,
                db_activity_data.get("temp_c"),
                db_activity_data.get("humidity"),
                activity.lat,
                activity.lon,
                activity_timestamp
            )
            db_activity_data["adjusted_pace"] = adjusted_pace
        except Exception as e:
            db_activity_data["adjusted_pace"] = base_pace
        
        # Create activity
        new_activity = Activity(**db_activity_data)
        db.add(new_activity)
        db.commit()
        db.refresh(new_activity)
        
        return {
            "message": "Activity created successfully",
            "activity": {
                "id": str(new_activity.id),
                "distance": new_activity.distance,
                "moving_time": new_activity.moving_time,
                "trimp_score": new_activity.trimp_score,
                "adjusted_pace": new_activity.adjusted_pace,
                "timestamp": new_activity.timestamp.isoformat(),
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error creating manual activity: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating activity: {str(e)}")


@app.delete("/activities/{activity_id}")
async def delete_activity(
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an activity by ID.
    
    Args:
        activity_id: UUID of the activity to delete
        
    Returns:
        Success message
    """
    try:
        # Convert string to UUID
        try:
            activity_uuid = uuid.UUID(activity_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid activity ID format")
        
        # Find the activity and verify it belongs to the current user
        activity = db.query(Activity).filter(
            Activity.id == activity_uuid,
            Activity.user_id == current_user.id
        ).first()
        
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found or you don't have permission to delete it")
        
        # Delete the activity
        db.delete(activity)
        db.commit()
        
        return {
            "message": "Activity deleted successfully",
            "activity_id": activity_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting activity: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error deleting activity: {str(e)}")


@app.post("/activities/{activity_id}/fetch-weather")
async def fetch_weather_for_activity(
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch and update weather data for an existing activity.
    
    Args:
        activity_id: UUID of the activity to update
        
    Returns:
        Updated activity with weather data
    """
    try:
        # Convert string to UUID
        try:
            activity_uuid = uuid.UUID(activity_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid activity ID format")
        
        # Find the activity and verify it belongs to the current user
        activity = db.query(Activity).filter(
            Activity.id == activity_uuid,
            Activity.user_id == current_user.id
        ).first()
        
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Check if activity has location data
        if not activity.lat or not activity.lon:
            raise HTTPException(status_code=400, detail="Activity does not have location data (lat/lon)")
        
        # Fetch weather data
        try:
            weather = get_weather_data(activity.lat, activity.lon, activity.timestamp)
            if weather:
                activity.temp_c = weather.get("main", {}).get("temp")
                activity.humidity = weather.get("main", {}).get("humidity")
                
                # Recalculate adjusted pace with new weather data
                distance_km = activity.distance / 1000.0
                base_pace = activity.moving_time / distance_km
                adjusted_pace = calculate_weather_adjusted_pace(
                    base_pace,
                    activity.temp_c,
                    activity.humidity,
                    activity.lat,
                    activity.lon,
                    activity.timestamp
                )
                activity.adjusted_pace = adjusted_pace
                
                db.commit()
                db.refresh(activity)
                
                return {
                    "message": "Weather data updated successfully",
                    "activity": {
                        "id": str(activity.id),
                        "temp_c": activity.temp_c,
                        "humidity": activity.humidity,
                        "adjusted_pace": activity.adjusted_pace
                    }
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to fetch weather data from API")
        except Exception as e:
            print(f"Error fetching weather: {e}")
            raise HTTPException(status_code=500, detail=f"Error fetching weather: {str(e)}")
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating weather for activity: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error updating weather: {str(e)}")


@app.post("/activities/fetch-weather-all")
async def fetch_weather_for_all_activities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch and update weather data for all activities that are missing it.
    Only updates activities that have lat/lon but no temp_c or humidity.
    """
    try:
        # Find activities missing weather data but with location
        activities = db.query(Activity).filter(
            Activity.user_id == current_user.id,
            Activity.lat.isnot(None),
            Activity.lon.isnot(None),
            or_(
                Activity.temp_c.is_(None),
                Activity.humidity.is_(None)
            )
        ).all()
        
        if not activities:
            return {
                "message": "No activities need weather data",
                "updated": 0
            }
        
        updated_count = 0
        failed_count = 0
        error_messages = []
        
        for activity in activities:
            try:
                weather = get_weather_data(activity.lat, activity.lon, activity.timestamp)
                if weather:
                    activity.temp_c = weather.get("main", {}).get("temp")
                    activity.humidity = weather.get("main", {}).get("humidity")
                    
                    # Recalculate adjusted pace
                    distance_km = activity.distance / 1000.0
                    base_pace = activity.moving_time / distance_km
                    adjusted_pace = calculate_weather_adjusted_pace(
                        base_pace,
                        activity.temp_c,
                        activity.humidity,
                        activity.lat,
                        activity.lon,
                        activity.timestamp
                    )
                    activity.adjusted_pace = adjusted_pace
                    updated_count += 1
                else:
                    failed_count += 1
                    # Check if it's an API key issue
                    import os
                    api_key = os.getenv("OPENWEATHER_API_KEY", "")
                    if not api_key or api_key == "your_api_key_here":
                        if "API key" not in str(error_messages):
                            error_messages.append("OpenWeatherMap API key is missing or invalid")
                    else:
                        error_messages.append(f"Failed to fetch weather for activity on {activity.timestamp.date()}")
            except Exception as e:
                print(f"Error fetching weather for activity {activity.id}: {e}")
                failed_count += 1
                error_messages.append(f"Error: {str(e)}")
                continue
        
        db.commit()
        
        message = f"Updated weather data for {updated_count} activities"
        if failed_count > 0:
            if "API key" in str(error_messages):
                message += f". {failed_count} failed - OpenWeatherMap API key is missing or invalid. Please update OPENWEATHER_API_KEY in docker-compose.yml"
            else:
                message += f". {failed_count} failed"
        
        return {
            "message": message,
            "updated": updated_count,
            "failed": failed_count,
            "total": len(activities),
            "errors": error_messages[:3] if error_messages else []  # Return first 3 errors
        }
    
    except Exception as e:
        db.rollback()
        print(f"Error updating weather for all activities: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error updating weather: {str(e)}")


@app.post("/analytics/predict")
async def predict_acwr(
    proposed_activity: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Predict ACWR if a proposed activity is completed.
    
    Expected fields in proposed_activity:
    - distance: float (in meters)
    - moving_time: int (in seconds)
    - heart_rate: float (optional, average heart rate)
    
    Returns:
    - current_acwr: Current ACWR ratio
    - projected_acwr: Projected ACWR after proposed activity
    - risk_level: "Green", "Orange", or "Red"
    - risk_message: Human-readable risk assessment
    """
    from pydantic import BaseModel, Field
    from typing import Optional
    import pandas as pd
    
    class ProposedActivity(BaseModel):
        distance: float = Field(..., gt=0, description="Distance in meters")
        moving_time: int = Field(..., gt=0, description="Moving time in seconds")
        heart_rate: Optional[float] = Field(None, ge=0, le=250, description="Average heart rate")
    
    try:
        # Validate input
        activity = ProposedActivity(**proposed_activity)
        
        # Get current ACWR
        current_acwr_data = calculate_acwr(db, current_user.id)
        current_acwr = current_acwr_data["acwr_ratio"]
        
        # Calculate TRIMP for proposed activity
        # If no heart rate provided, estimate based on distance and time (moderate intensity)
        proposed_trimp = 0.0
        duration_minutes = activity.moving_time / 60.0
        
        if activity.heart_rate:
            proposed_trimp = calculate_trimp(activity.heart_rate, duration_minutes)
        else:
            # Estimate heart rate based on pace (faster pace = higher HR)
            # Rough estimate: 140-170 bpm for typical running pace
            distance_km = activity.distance / 1000.0
            pace_per_km = activity.moving_time / distance_km  # seconds per km
            
            # Estimate HR: faster pace (lower seconds/km) = higher HR
            if pace_per_km < 240:  # Very fast (< 4:00/km)
                estimated_hr = 170
            elif pace_per_km < 300:  # Fast (4:00-5:00/km)
                estimated_hr = 160
            elif pace_per_km < 360:  # Moderate (5:00-6:00/km)
                estimated_hr = 150
            else:  # Slow (> 6:00/km)
                estimated_hr = 140
            
            proposed_trimp = calculate_trimp(estimated_hr, duration_minutes)
            print(f"Prediction: Estimated HR {estimated_hr} bpm for {distance_km:.1f}km in {duration_minutes:.1f} min = {proposed_trimp:.2f} TRIMP")
        
        # Get user's activities for the last 28 days (plus today for proper rolling window)
        reference_date = datetime.now(timezone.utc)
        # Get more days to ensure rolling windows have enough data
        # We need at least 28 days before today to calculate proper chronic load
        thirty_five_days_ago = reference_date - timedelta(days=35)
        
        activities = db.query(Activity).filter(
            Activity.timestamp >= thirty_five_days_ago,
            Activity.timestamp <= reference_date,
            Activity.user_id == current_user.id,
            Activity.trimp_score.isnot(None)
        ).all()
        
        # Convert to DataFrame
        if not activities:
            return {
                "current_acwr": 0.0,
                "projected_acwr": 0.0,
                "risk_level": "No Data",
                "risk_message": "Not enough historical data to make a prediction",
                "current_acute_load": 0.0,
                "current_chronic_load": 0.0,
                "projected_acute_load": 0.0,
                "projected_chronic_load": 0.0,
            }
        
        df = pd.DataFrame([
            {
                "timestamp": act.timestamp,
                "trimp_score": act.trimp_score or 0.0
            }
            for act in activities
        ])
        
        # Ensure timestamp is timezone-aware and set as index
        if df['timestamp'].dt.tz is None:
            df['timestamp'] = pd.to_datetime(df['timestamp']).dt.tz_localize(timezone.utc)
        else:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        df.set_index('timestamp', inplace=True)
        
        # Resample to daily frequency
        daily_trimp = df['trimp_score'].resample('D').sum()
        
        # Add proposed activity to tomorrow's date
        tomorrow = reference_date + timedelta(days=1)
        tomorrow_date = tomorrow.date()
        
        # Create timezone-aware pandas Timestamp for tomorrow
        # tomorrow is already timezone-aware, so we create Timestamp directly
        tomorrow_datetime = pd.Timestamp(tomorrow)
        
        # Add proposed TRIMP to tomorrow
        # Check if tomorrow's date exists in the index
        tomorrow_exists = False
        for idx_date in daily_trimp.index.date:
            if idx_date == tomorrow_date:
                tomorrow_exists = True
                # Find the exact timestamp for this date
                matching_indices = daily_trimp.index[daily_trimp.index.date == tomorrow_date]
                if len(matching_indices) > 0:
                    daily_trimp.loc[matching_indices[0]] += proposed_trimp
                break
        
        if not tomorrow_exists:
            # Create new entry for tomorrow
            daily_trimp = pd.concat([daily_trimp, pd.Series([proposed_trimp], index=[tomorrow_datetime])])
            daily_trimp = daily_trimp.sort_index()
        
        # Calculate projected rolling averages
        # The key insight: Acute load is the average of the LAST 7 days (including tomorrow)
        # Chronic load is the average of the LAST 28 days (including tomorrow)
        # But we need to ensure they're calculated correctly even with limited data
        
        # Get data up to and including tomorrow
        data_up_to_tomorrow = daily_trimp[daily_trimp.index <= tomorrow_datetime]
        
        # Calculate acute load: average of last 7 days (or available days if < 7)
        # This is the key: acute load should be higher when we add a big activity
        last_7_days = data_up_to_tomorrow.tail(7)
        if len(last_7_days) > 0:
            # Sum of last 7 days, divided by 7 (normalized to daily average)
            # This gives us the average daily TRIMP over the last 7 days
            projected_acute_load = float(last_7_days.sum() / 7.0)
        else:
            projected_acute_load = 0.0
        
        # Calculate chronic load: average of last 28 days (or available days if < 28)
        # Chronic load changes more slowly
        last_28_days = data_up_to_tomorrow.tail(28)
        if len(last_28_days) > 0:
            # Sum of last 28 days, divided by 28 (normalized to daily average)
            # This gives us the average daily TRIMP over the last 28 days
            projected_chronic_load = float(last_28_days.sum() / 28.0)
        else:
            projected_chronic_load = 0.0
        
        # Debug: Show what data we're using
        print(f"  Data for prediction: {len(data_up_to_tomorrow)} days total")
        print(f"  Last 7 days TRIMP sum: {last_7_days.sum():.2f}, count: {len(last_7_days)}")
        print(f"  Last 28 days TRIMP sum: {last_28_days.sum():.2f}, count: {len(last_28_days)}")
        
        # Calculate projected ACWR
        if projected_chronic_load > 0:
            projected_acwr = projected_acute_load / projected_chronic_load
        else:
            projected_acwr = 0.0
        
        # Debug logging
        print(f"Prediction Debug:")
        print(f"  Proposed TRIMP: {proposed_trimp:.2f} (Distance: {activity.distance/1000:.1f}km, Time: {activity.moving_time/60:.1f}min, HR: {activity.heart_rate or 'estimated'})")
        print(f"  Current ACWR: {current_acwr:.2f} (Acute: {current_acwr_data['acute_load']:.2f}, Chronic: {current_acwr_data['chronic_load']:.2f})")
        print(f"  Projected Acute Load: {projected_acute_load:.2f} (change: {projected_acute_load - current_acwr_data['acute_load']:+.2f})")
        print(f"  Projected Chronic Load: {projected_chronic_load:.2f} (change: {projected_chronic_load - current_acwr_data['chronic_load']:+.2f})")
        print(f"  Projected ACWR: {projected_acwr:.2f} (change: {projected_acwr - current_acwr:+.2f})")
        if tomorrow_datetime in daily_trimp.index:
            tomorrow_trimp = daily_trimp.loc[tomorrow_datetime]
            print(f"  Daily TRIMP series: {len(daily_trimp)} days, Tomorrow TRIMP: {tomorrow_trimp:.2f}")
        else:
            print(f"  Daily TRIMP series: {len(daily_trimp)} days, Tomorrow NOT in index!")
        
        # Determine risk level
        if projected_acwr == 0:
            risk_level = "No Data"
            risk_message = "Not enough data for prediction"
        elif projected_acwr < 0.8:
            risk_level = "Green"
            risk_message = "Low risk - You're in the safe training zone"
        elif projected_acwr <= 1.3:
            risk_level = "Green"
            risk_message = "Optimal - You're in the sweet spot for training"
        elif projected_acwr <= 1.5:
            risk_level = "Orange"
            risk_message = "Caution - Increased injury risk. Consider reducing intensity"
        else:
            risk_level = "Red"
            risk_message = "High Risk - Significant injury risk. Strongly consider rest or lighter activity"
        
        return {
            "current_acwr": round(current_acwr, 2),
            "projected_acwr": round(projected_acwr, 2),
            "risk_level": risk_level,
            "risk_message": risk_message,
            "current_acute_load": round(current_acwr_data["acute_load"], 2),
            "current_chronic_load": round(current_acwr_data["chronic_load"], 2),
            "projected_acute_load": round(projected_acute_load, 2),
            "projected_chronic_load": round(projected_chronic_load, 2),
            "proposed_trimp": round(proposed_trimp, 2),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error predicting ACWR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error predicting ACWR: {str(e)}")


@app.post("/analytics/predict-race")
async def predict_race(
    race_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Predict race performance and generate a 14-day taper plan.
    
    Expected fields in race_data:
    - target_distance: float (in km, e.g., 5.0, 10.0, 21.1, 42.2)
    - race_date: string (ISO format, e.g., "2024-06-15T00:00:00Z")
    
    Returns:
    - predictions: Three scenarios (Conservative, Balanced, Aggressive)
    - difficulty: Easy/Moderate/Hard based on required TRIMP vs Base Fitness
    - taper_plan: 14-day training schedule
    """
    from pydantic import BaseModel, Field
    from typing import Optional
    
    class RacePredictionRequest(BaseModel):
        target_distance: float = Field(..., gt=0, description="Target race distance in km")
        race_date: str = Field(..., description="Race date in ISO format")
    
    try:
        # Validate input
        request = RacePredictionRequest(**race_data)
        
        # Parse race date (timezone-aware)
        race_date = datetime.fromisoformat(request.race_date.replace('Z', '+00:00'))
        if race_date.tzinfo is None:
            race_date = race_date.replace(tzinfo=timezone.utc)
        
        # Calculate Training Momentum
        today = datetime.now(timezone.utc)
        days_to_race = (race_date.date() - today.date()).days
        
        if days_to_race < 0:
            raise HTTPException(
                status_code=400,
                detail="Race date must be in the future"
            )
        
        # Calculate daily average load from last 14 days (Current Habit)
        daily_avg_load = calculate_daily_avg_load(db, current_user.id, days=14)
        
        # Get current Base Fitness (Chronic Load)
        acwr_data = calculate_acwr(db, current_user.id)
        current_base_fitness = acwr_data["chronic_load"]
        
        if current_base_fitness <= 0:
            raise HTTPException(
                status_code=400,
                detail="Not enough training data. Please sync activities to get predictions."
            )
        
        # Project fitness growth to race day
        projected_base_fitness = project_fitness_growth(
            current_base_fitness,
            daily_avg_load,
            days_to_race
        )
        
        # Calculate projected acute load for race day (considering taper)
        # If following taper plan, acute load will be lower
        # For prediction, use the taper-adjusted acute load
        target_acwr = 0.9  # Target ACWR on race day
        projected_acute_load_race_day = projected_base_fitness * target_acwr
        
        # Predict race pace using multivariate linear regression
        from app.analytics_service import predict_race_pace_multivariate_regression
        
        predicted_pace_per_km, confidence_score, warning_message = predict_race_pace_multivariate_regression(
            db,
            current_user.id,
            projected_base_fitness,
            projected_acute_load_race_day,
            days=90
        )
        
        # Get average pace for response and fallback
        avg_pace_seconds_per_km = get_average_true_effort_pace(db, current_user.id, days=30)
        
        # Get best recent pace for taper ceiling (after distance scaling)
        # Account for fitness improvement over time - project best pace improvement
        import math
        from app.analytics_service import get_best_recent_true_effort_pace
        current_best_pace = get_best_recent_true_effort_pace(db, current_user.id, days=30)
        
        # Project how the best pace might improve with continued training
        # If fitness is projected to grow, pace should improve proportionally
        # Use a conservative improvement model: pace improves by (fitness_growth_ratio)^0.1
        # This is conservative because pace improvements are harder than fitness gains
        if current_base_fitness > 0 and projected_base_fitness > current_base_fitness:
            fitness_improvement_ratio = projected_base_fitness / current_base_fitness
            # Pace improvement is much smaller than fitness improvement (0.1 exponent)
            pace_improvement_factor = math.pow(fitness_improvement_ratio, 0.1)
            projected_best_pace = current_best_pace / pace_improvement_factor  # Lower pace = faster
        else:
            projected_best_pace = current_best_pace
        
        # Fallback to Riegel formula if regression fails (insufficient data)
        # Only fallback if regression completely failed (returned 0.0), not if confidence is low
        if predicted_pace_per_km <= 0:
            if avg_pace_seconds_per_km <= 0:
                raise HTTPException(
                    status_code=400, 
                    detail="Not enough training data. Please sync at least 5 activities to get predictions."
                )
            
            # Use Riegel formula with fixed 1.06 exponent as fallback
            base_distance_km = 5.0
            baseline_time = predict_race_time(avg_pace_seconds_per_km, base_distance_km, request.target_distance)
            predicted_pace_per_km = baseline_time / request.target_distance
            confidence_score = 0.0  # No confidence for fallback
            warning_message = "Insufficient data for high-intensity prediction."
        
        # Calculate average training distance for distance scaling
        today = datetime.now(timezone.utc)
        start_date = today - timedelta(days=90)
        activities = db.query(Activity).filter(
            Activity.timestamp >= start_date,
            Activity.timestamp <= today,
            Activity.user_id == current_user.id,
            Activity.distance > 0
        ).all()
        
        avg_training_distance_km = 5.0  # Default
        if activities:
            total_distance = sum(act.distance / 1000.0 for act in activities)
            avg_training_distance_km = total_distance / len(activities)
        
        # Apply Riegel's formula for distance scaling if target differs from average training distance
        if abs(request.target_distance - avg_training_distance_km) > 0.5:  # If difference > 500m
            # Scale the predicted pace using Riegel's formula
            # T2 = T1 × (D2/D1)^1.06
            # For pace: P2 = P1 × (D1/D2)^1.06 (inverse relationship)
            distance_ratio = request.target_distance / avg_training_distance_km
            # Pace increases with distance, so we use the inverse
            pace_scaling_factor = math.pow(1.0 / distance_ratio, 1.06)
            predicted_pace_per_km = predicted_pace_per_km * pace_scaling_factor
        
        # Apply Taper Ceiling AFTER distance scaling to ensure realistic predictions
        # Account for fitness improvement over time - project best pace improvement
        if projected_best_pace > 0:
            # For the target distance, calculate what the projected best pace would be at that distance
            # Use Riegel to scale the projected best pace to target distance
            if request.target_distance != 5.0:  # If not 5K, scale the best pace
                best_pace_at_target = predict_race_time(projected_best_pace, 5.0, request.target_distance) / request.target_distance
            else:
                best_pace_at_target = projected_best_pace
            
            taper_ceiling = best_pace_at_target * 0.95  # 5% improvement max
            if predicted_pace_per_km < taper_ceiling:
                predicted_pace_per_km = taper_ceiling
        
        # Calculate race time from pace
        momentum_adjusted_time = predicted_pace_per_km * request.target_distance
        
        # Helper function to format pace as MM:SS
        def format_pace(pace_seconds_per_km: float) -> str:
            minutes = int(pace_seconds_per_km // 60)
            seconds = int(pace_seconds_per_km % 60)
            return f"{minutes:02d}:{seconds:02d}"
        
        # Generate three scenarios with momentum adjustment
        scenarios = {}
        
        # Conservative: Momentum-adjusted time + 5%
        conservative_time = momentum_adjusted_time * 1.05
        conservative_pace = (conservative_time / request.target_distance)
        scenarios["conservative"] = {
            "name": "The Finisher",
            "description": "Safe, achievable pace",
            "pace_seconds_per_km": round(conservative_pace, 1),
            "pace_formatted": format_pace(conservative_pace),
            "time_seconds": round(conservative_time),
            "time_formatted": format_time(conservative_time)
        }
        
        # Balanced: Momentum-adjusted time (projected fitness)
        balanced_time = momentum_adjusted_time
        balanced_pace = (balanced_time / request.target_distance)
        scenarios["balanced"] = {
            "name": "The Performer",
            "description": "Based on projected fitness growth",
            "pace_seconds_per_km": round(balanced_pace, 1),
            "pace_formatted": format_pace(balanced_pace),
            "time_seconds": round(balanced_time),
            "time_formatted": format_time(balanced_time)
        }
        
        # Aggressive: Momentum-adjusted time - 3%
        aggressive_time = momentum_adjusted_time * 0.97
        aggressive_pace = (aggressive_time / request.target_distance)
        scenarios["aggressive"] = {
            "name": "The PR Attempt",
            "description": "Reach goal requiring perfect taper",
            "pace_seconds_per_km": round(aggressive_pace, 1),
            "pace_formatted": format_pace(aggressive_pace),
            "time_seconds": round(aggressive_time),
            "time_formatted": format_time(aggressive_time)
        }
        
        # Calculate difficulty based on required TRIMP vs Projected Base Fitness
        balanced_trimp = calculate_race_trimp(request.target_distance, balanced_time, estimated_hr=170)
        
        # Difficulty scoring (using projected fitness)
        trimp_ratio = balanced_trimp / projected_base_fitness if projected_base_fitness > 0 else 0
        
        if trimp_ratio < 0.5:
            difficulty = "Easy"
            difficulty_message = "Well within your projected fitness level"
        elif trimp_ratio < 1.0:
            difficulty = "Moderate"
            difficulty_message = "Challenging but achievable with proper taper"
        else:
            difficulty = "Hard"
            difficulty_message = "Requires significant fitness improvement or aggressive taper"
        
        # Calculate projected ACWR on race day (if maintaining current momentum without taper)
        # Projected acute load = daily_avg_load * 7 (7-day average if maintaining same daily load)
        projected_acute_load = daily_avg_load * 7
        projected_acwr = projected_acute_load / projected_base_fitness if projected_base_fitness > 0 else 0
        
        # Generate confidence score explanation
        if confidence_score >= 0.7:
            confidence_explanation = "High confidence. The prediction is based on a strong pattern in your training data. The model has a good understanding of how your fitness and fatigue affect your pace."
        elif confidence_score >= 0.4:
            confidence_explanation = "Moderate confidence. The prediction is reasonable but could be improved with more consistent training data. Consider adding more activities to increase accuracy."
        else:
            confidence_explanation = "Low confidence. The prediction is based on limited or inconsistent training data. Add more activities, especially runs at your target race distance, to improve prediction accuracy."
        
        return {
            "target_distance": request.target_distance,
            "race_date": race_date.isoformat(),
            "base_pace_seconds_per_km": round(avg_pace_seconds_per_km, 1),
            "confidence_score": round(confidence_score, 3),
            "confidence_explanation": confidence_explanation,
            "confidence_warning": warning_message if warning_message else None,
            "scenarios": scenarios,
            "difficulty": {
                "level": difficulty,
                "message": difficulty_message,
                "required_trimp": round(balanced_trimp, 1),
                "current_base_fitness": round(current_base_fitness, 1),
                "projected_base_fitness": round(projected_base_fitness, 1),
                "trimp_ratio": round(trimp_ratio, 2)
            },
            "momentum": {
                "daily_avg_load": round(daily_avg_load, 1),
                "current_base_fitness": round(current_base_fitness, 1),
                "projected_base_fitness": round(projected_base_fitness, 1),
                "days_to_race": days_to_race,
                "projected_acwr": round(projected_acwr, 2),
                "needs_taper_warning": projected_acwr > 1.3
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error predicting race: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error predicting race: {str(e)}")


def format_time(seconds: float) -> str:
    """
    Format time in seconds to MM:SS or HH:MM:SS format.
    
    Args:
        seconds: Time in seconds
        
    Returns:
        Formatted time string (MM:SS or HH:MM:SS)
    """
    total_seconds = int(round(seconds))
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    else:
        return f"{minutes:02d}:{secs:02d}"


