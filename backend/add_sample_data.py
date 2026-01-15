"""
Script to add sample beginner runner data for a user
Usage: python add_sample_data.py
"""
import os
import sys
from datetime import datetime, timedelta, timezone
import random
import uuid

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import User, Activity
from app.analytics_service import calculate_trimp
from app.weather_service import calculate_weather_adjusted_pace

def create_beginner_runner_data(email: str, num_activities: int = 20):
    """Create realistic beginner runner activities for a user"""
    
    db = SessionLocal()
    try:
        # Find user by email
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"User with email {email} not found!")
            return
        
        print(f"Found user: {user.email} (ID: {user.id})")
        
        # Clear existing activities for this user (optional)
        existing_count = db.query(Activity).filter(Activity.user_id == user.id).count()
        if existing_count > 0:
            print(f"Found {existing_count} existing activities. Deleting...")
            db.query(Activity).filter(Activity.user_id == user.id).delete()
            db.commit()
        
        # Generate activities over the last 45 days
        activities = []
        base_date = datetime.now(timezone.utc) - timedelta(days=45)
        
        # Beginner runner parameters
        # Progress over time: start slower, get slightly faster
        base_pace_start = 7.5  # minutes per km (slow beginner pace)
        base_pace_end = 6.5     # minutes per km (improved pace)
        
        # Distances: mostly 2-5km, occasional longer runs
        distances_km = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]
        distance_weights = [10, 15, 20, 15, 15, 10, 10, 3, 2]  # More weight on shorter distances
        
        # Heart rate zones for beginner (130-160 bpm average)
        hr_min = 130
        hr_max = 160
        
        # Create activities (2-4 runs per week)
        activity_dates = []
        current_date = base_date
        while len(activity_dates) < num_activities:
            # Skip some days (not running every day)
            if random.random() > 0.4:  # 60% chance to skip a day
                current_date += timedelta(days=1)
                continue
            
            # Add some randomness to time of day (morning or evening)
            hour = random.choice([6, 7, 8, 18, 19, 20])
            minute = random.randint(0, 59)
            activity_time = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            activity_dates.append(activity_time)
            current_date += timedelta(days=1)
        
        # Sort dates
        activity_dates.sort()
        
        print(f"\nCreating {len(activity_dates)} activities...")
        
        for idx, activity_date in enumerate(activity_dates):
            # Progress: earlier runs are slower
            progress = idx / len(activity_dates)  # 0 to 1
            base_pace = base_pace_start - (base_pace_start - base_pace_end) * progress
            
            # Add some randomness to pace (±0.5 min/km)
            pace_variation = random.uniform(-0.5, 0.5)
            current_pace = base_pace + pace_variation
            current_pace = max(5.5, min(9.0, current_pace))  # Clamp between 5.5 and 9.0 min/km
            
            # Select distance (weighted towards shorter)
            distance_km = random.choices(distances_km, weights=distance_weights)[0]
            
            # Calculate time from pace and distance
            moving_time_seconds = int(current_pace * 60 * distance_km)
            
            # Heart rate (slightly higher for longer/faster runs)
            hr_base = hr_min + (hr_max - hr_min) * (progress * 0.3 + random.uniform(0, 0.7))
            heart_rate = int(hr_base)
            
            # Location (use a generic location - you can change this)
            lat = 37.7749 + random.uniform(-0.1, 0.1)  # San Francisco area
            lon = -122.4194 + random.uniform(-0.1, 0.1)
            
            # Weather (reasonable values)
            temp_c = random.uniform(15, 25)  # 15-25°C
            humidity = random.uniform(40, 70)  # 40-70%
            
            # Calculate TRIMP
            duration_minutes = moving_time_seconds / 60.0
            trimp_score = calculate_trimp(heart_rate, duration_minutes)
            
            # Calculate adjusted pace
            base_pace_seconds = current_pace * 60
            try:
                adjusted_pace = calculate_weather_adjusted_pace(
                    base_pace_seconds,
                    temp_c,
                    humidity,
                    lat,
                    lon,
                    activity_date
                )
            except:
                adjusted_pace = base_pace_seconds
            
            # Create activity
            activity = Activity(
                id=uuid.uuid4(),
                user_id=user.id,
                timestamp=activity_date,
                distance=distance_km * 1000,  # Convert to meters
                moving_time=moving_time_seconds,
                heart_rate=heart_rate,
                lat=lat,
                lon=lon,
                temp_c=temp_c,
                humidity=humidity,
                trimp_score=trimp_score,
                adjusted_pace=adjusted_pace,
                source="manual"
            )
            
            activities.append(activity)
            db.add(activity)
            
            if (idx + 1) % 5 == 0:
                print(f"  Created {idx + 1}/{len(activity_dates)} activities...")
        
        # Commit all activities
        db.commit()
        print(f"\n✅ Successfully created {len(activities)} activities for {email}")
        print(f"   Date range: {activity_dates[0].strftime('%Y-%m-%d')} to {activity_dates[-1].strftime('%Y-%m-%d')}")
        print(f"   Total distance: {sum(a.distance for a in activities) / 1000:.1f} km")
        print(f"   Average pace: {sum(a.adjusted_pace for a in activities) / len(activities) / 60:.1f} min/km")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    email = "bhatiaprabhgun06@gmail.com"
    num_activities = 25  # Create 25 activities over ~45 days
    
    print(f"Adding beginner runner data for: {email}")
    print(f"Number of activities: {num_activities}")
    print("-" * 50)
    
    create_beginner_runner_data(email, num_activities)

