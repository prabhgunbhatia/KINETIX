"""
Analytics service for calculating training metrics including ACWR (Acute:Chronic Workload Ratio).
Uses Pandas for vectorized operations and efficient time-series calculations.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import Activity
from typing import Optional, Dict, List
import pandas as pd
import numpy as np
try:
    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import r2_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    LinearRegression = None
    r2_score = None


def calculate_trimp(heart_rate: float, duration_minutes: float, max_hr: float = 200, rest_hr: float = 60) -> float:
    """
    Calculate TRIMP (Training Impulse) score using heart rate reserve method.
    
    Args:
        heart_rate: Average heart rate during activity
        duration_minutes: Duration of activity in minutes
        max_hr: Maximum heart rate (default 200)
        rest_hr: Resting heart rate (default 60)
        
    Returns:
        TRIMP score
    """
    if heart_rate is None or duration_minutes <= 0:
        return 0.0
    
    # Heart rate reserve
    hr_reserve = (heart_rate - rest_hr) / (max_hr - rest_hr)
    
    # TRIMP = duration * HR reserve * exp(1.92 * HR reserve)
    # This is the Banister TRIMP formula
    trimp = duration_minutes * hr_reserve * (2.718 ** (1.92 * hr_reserve))
    
    return trimp


def get_activities_in_range(
    db: Session,
    start_date: datetime,
    end_date: datetime,
    user_id  # Can be UUID or str
) -> List[Activity]:
    """
    Get all activities within a date range for a specific user.
    
    Args:
        db: Database session
        start_date: Start of date range
        end_date: End of date range
        user_id: User ID to filter by
        
    Returns:
        List of Activity objects
    """
    return db.query(Activity).filter(
        Activity.timestamp >= start_date,
        Activity.timestamp <= end_date,
        Activity.user_id == user_id
    ).all()


def calculate_acwr(db: Session, user_id: str, reference_date: Optional[datetime] = None) -> Dict[str, float]:
    """
    Calculate Acute:Chronic Workload Ratio (ACWR) using vectorized Pandas operations.
    
    ACWR compares the 7-day average TRIMP (acute load) to the 28-day average TRIMP (chronic load).
    This ratio helps identify injury risk:
    - ACWR < 0.8: Under-training
    - ACWR 0.8-1.3: Optimal training zone
    - ACWR > 1.3: Increased injury risk
    - ACWR > 1.5: High injury risk
    
    Args:
        db: Database session
        user_id: User ID to filter activities
        reference_date: Reference date for calculation (defaults to now, timezone-aware)
        
    Returns:
        Dictionary with:
        - acute_load: 7-day average TRIMP
        - chronic_load: 28-day average TRIMP
        - acwr_ratio: Acute:Chronic ratio
        - injury_risk: Risk level string
    """
    # Ensure timezone-aware reference date
    if reference_date is None:
        reference_date = datetime.now(timezone.utc)
    elif reference_date.tzinfo is None:
        reference_date = reference_date.replace(tzinfo=timezone.utc)
    
    # Calculate date ranges (need 28 days for chronic load calculation)
    twenty_eight_days_ago = reference_date - timedelta(days=28)
    
    # Fetch all activities in the 28-day window for this user
    activities = db.query(Activity).filter(
        Activity.timestamp >= twenty_eight_days_ago,
        Activity.timestamp <= reference_date,
        Activity.user_id == user_id,
        Activity.trimp_score.isnot(None)
    ).all()
    
    # If no activities, return zero values
    if not activities:
        return {
            "acute_load": 0.0,
            "chronic_load": 0.0,
            "acwr_ratio": 0.0,
            "injury_risk": "No Data"
        }
    
    # Convert to Pandas DataFrame for vectorized operations
    df = pd.DataFrame([
        {
            "timestamp": activity.timestamp,
            "trimp_score": activity.trimp_score or 0.0
        }
        for activity in activities
    ])
    
    # Ensure timestamp is timezone-aware and set as index
    if len(df) > 0:
        if df['timestamp'].dt.tz is None:
            df['timestamp'] = pd.to_datetime(df['timestamp']).dt.tz_localize(timezone.utc)
        else:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        df.set_index('timestamp', inplace=True)
        
        # Create a complete date range for the 28-day window
        start_date = pd.Timestamp(twenty_eight_days_ago).normalize()
        end_date = pd.Timestamp(reference_date).normalize()
        
        # Ensure timezone-aware
        if start_date.tz is None:
            start_date = start_date.tz_localize(timezone.utc)
        if end_date.tz is None:
            end_date = end_date.tz_localize(timezone.utc)
        
        # Resample to daily frequency, summing TRIMP scores per day
        # This creates daily aggregates (days with multiple activities are summed)
        daily_trimp = df['trimp_score'].resample('D').sum()
        
        # Create a complete date range for all days in the 28-day window
        date_range = pd.date_range(start=start_date, end=end_date, freq='D', tz=timezone.utc)
        
        # Use asfreq().fillna(0) to ensure EVERY single calendar day has a record
        # This fills missing days (rest days) with 0, ensuring continuous timeline
        daily_trimp = daily_trimp.reindex(date_range, fill_value=0.0)
    else:
        # No activities - create empty series with all days filled with 0
        start_date = pd.Timestamp(twenty_eight_days_ago).normalize()
        end_date = pd.Timestamp(reference_date).normalize()
        if start_date.tz is None:
            start_date = start_date.tz_localize(timezone.utc)
        if end_date.tz is None:
            end_date = end_date.tz_localize(timezone.utc)
        date_range = pd.date_range(start=start_date, end=end_date, freq='D', tz=timezone.utc)
        daily_trimp = pd.Series(0.0, index=date_range)
    
    # Calculate rolling averages using vectorized operations
    # Recent Fatigue (Acute Load): 7-day rolling mean
    # This naturally shows fatigue decaying during rest periods (TRIMP = 0)
    recent_fatigue = daily_trimp.rolling(window=7, min_periods=1).mean()
    
    # Base Fitness (Chronic Load): 28-day rolling mean
    base_fitness = daily_trimp.rolling(window=28, min_periods=1).mean()
    
    # Get the most recent values (at reference_date)
    # Find the closest date <= reference_date
    ref_date_normalized = pd.Timestamp(reference_date).normalize()
    if ref_date_normalized.tz is None:
        ref_date_normalized = ref_date_normalized.tz_localize(timezone.utc)
    
    valid_dates = recent_fatigue.index[recent_fatigue.index <= ref_date_normalized]
    if len(valid_dates) == 0:
        # If no valid dates, use the latest available
        acute_load = float(recent_fatigue.iloc[-1]) if len(recent_fatigue) > 0 else 0.0
        chronic_load = float(base_fitness.iloc[-1]) if len(base_fitness) > 0 else 0.0
    else:
        latest_date = valid_dates[-1]
        acute_load = float(recent_fatigue.loc[latest_date]) if latest_date in recent_fatigue.index else 0.0
        chronic_load = float(base_fitness.loc[latest_date]) if latest_date in base_fitness.index else 0.0
    
    # Calculate ACWR ratio
    if chronic_load > 0:
        acwr_ratio = acute_load / chronic_load
    else:
        acwr_ratio = 0.0
    
    # Determine injury risk level
    if acwr_ratio == 0:
        injury_risk = "No Data"
    elif acwr_ratio < 0.8:
        injury_risk = "Under-training"
    elif acwr_ratio <= 1.3:
        injury_risk = "Optimal"
    elif acwr_ratio <= 1.5:
        injury_risk = "Increased Risk"
    else:
        injury_risk = "High Risk"
    
    return {
        "acute_load": round(acute_load, 2),
        "chronic_load": round(chronic_load, 2),
        "acwr_ratio": round(acwr_ratio, 2),
        "injury_risk": injury_risk
    }


def get_weather_adjusted_runs(db: Session, user_id, limit: int = 10) -> List[dict]:  # user_id can be UUID or str
    """
    Get recent runs with weather-adjusted pace for a specific user.
    
    Args:
        db: Database session
        user_id: User ID to filter by
        limit: Maximum number of runs to return
        
    Returns:
        List of dictionaries with run data
    """
    activities = db.query(Activity).filter(
        Activity.adjusted_pace.isnot(None),
        Activity.user_id == user_id
    ).order_by(
        Activity.timestamp.desc()
    ).limit(limit).all()
    
    return [
        {
            "id": activity.id,
            "timestamp": activity.timestamp.isoformat(),
            "distance": activity.distance,
            "moving_time": activity.moving_time,
            "adjusted_pace": activity.adjusted_pace,
            "temp_c": activity.temp_c,
            "humidity": activity.humidity
        }
        for activity in activities
    ]


def get_average_true_effort_pace(db: Session, user_id: str, days: int = 30) -> float:
    """
    Get the average True Effort Pace (weather-adjusted pace) from the last N days.
    
    Args:
        db: Database session
        user_id: User ID to filter activities
        days: Number of days to look back (default 30)
        
    Returns:
        Average pace in seconds per km, or 0 if no data
    """
    today = datetime.now(timezone.utc)
    start_date = today - timedelta(days=days)
    
    activities = db.query(Activity).filter(
        Activity.timestamp >= start_date,
        Activity.timestamp <= today,
        Activity.user_id == user_id,
        Activity.adjusted_pace.isnot(None)
    ).all()
    
    if not activities:
        return 0.0
    
    total_pace = sum(act.adjusted_pace for act in activities if act.adjusted_pace)
    return total_pace / len(activities)


def get_best_recent_true_effort_pace(db: Session, user_id: str, days: int = 30) -> float:
    """
    Get the best (fastest) True Effort Pace from recent activities.
    
    Args:
        db: Database session
        user_id: User ID to filter activities
        days: Number of days to look back (default 30)
        
    Returns:
        Best pace in seconds per km, or 0 if no data
    """
    today = datetime.now(timezone.utc)
    start_date = today - timedelta(days=days)
    
    activities = db.query(Activity).filter(
        Activity.timestamp >= start_date,
        Activity.timestamp <= today,
        Activity.user_id == user_id,
        Activity.adjusted_pace.isnot(None),
        Activity.adjusted_pace > 0
    ).all()
    
    if not activities:
        return 0.0
    
    # Best pace = fastest pace = minimum seconds per km
    best_pace = min(act.adjusted_pace for act in activities if act.adjusted_pace)
    return best_pace


def get_best_all_time_pace(db: Session, user_id: str) -> float:
    """
    Get the best (fastest) True Effort Pace from all activities (all time best).
    
    Args:
        db: Database session
        user_id: User ID to filter activities
        
    Returns:
        Best pace in seconds per km, or 0 if no data
    """
    activities = db.query(Activity).filter(
        Activity.user_id == user_id,
        Activity.adjusted_pace.isnot(None),
        Activity.adjusted_pace > 0
    ).all()
    
    if not activities:
        return 0.0
    
    # Best pace = fastest pace = minimum seconds per km
    best_pace = min(act.adjusted_pace for act in activities if act.adjusted_pace)
    return best_pace


def get_max_distance_run(db: Session, user_id: str) -> float:
    """
    Get the maximum distance the runner has ever run.
    
    Args:
        db: Database session
        user_id: User ID to filter activities
        
    Returns:
        Maximum distance in km, or 0 if no data
    """
    activities = db.query(Activity).filter(
        Activity.user_id == user_id,
        Activity.distance > 0
    ).all()
    
    if not activities:
        return 0.0
    
    max_distance_meters = max(act.distance for act in activities)
    return max_distance_meters / 1000.0  # Convert to km


def get_recent_5k_runs(db: Session, user_id: str, days: int = 30, limit: int = 3) -> List[float]:
    """
    Get the most recent 5K runs (within ±500m of 5km) for reality anchoring.
    
    Args:
        db: Database session
        user_id: User ID to filter activities
        days: Number of days to look back (default 30)
        limit: Maximum number of runs to return (default 3)
        
    Returns:
        List of adjusted pace values for recent 5K runs
    """
    today = datetime.now(timezone.utc)
    start_date = today - timedelta(days=days)
    
    activities = db.query(Activity).filter(
        Activity.timestamp >= start_date,
        Activity.timestamp <= today,
        Activity.user_id == user_id,
        Activity.adjusted_pace.isnot(None),
        Activity.adjusted_pace > 0
    ).order_by(Activity.timestamp.desc()).all()
    
    # Filter for 5K runs (4.5km to 5.5km)
    five_k_runs = []
    for activity in activities:
        distance_km = activity.distance / 1000.0
        if 4.5 <= distance_km <= 5.5 and activity.adjusted_pace:
            five_k_runs.append(activity.adjusted_pace)
            if len(five_k_runs) >= limit:
                break
    
    return five_k_runs


def predict_race_pace_multivariate_regression(
    db: Session,
    user_id: str,
    projected_chronic_load: float,
    projected_acute_load: float,
    target_distance_km: float = 5.0,
    days: int = 90
) -> tuple[float, float, str]:
    """
    Predict race pace using multi-variate linear regression with scikit-learn.
    
    Features (X): chronic_load (Fitness) and acute_load (Fatigue)
    Target (y): log(adjusted_pace_seconds_per_km) - logarithmic transform for diminishing returns
    
    Includes:
    - Logarithmic transform for pace
    - Recency weighting (recent runs weighted more heavily)
    - Maximum distance penalty (if never run close to target distance)
    - Best all-time pace as baseline anchor
    - Taper ceiling (max 5% improvement from best recent pace)
    - Confidence adjustment based on deviation from recent history
    
    Args:
        db: Database session
        user_id: User ID to filter activities
        projected_chronic_load: Projected Base Fitness (Chronic Load) for race day
        projected_acute_load: Projected Recent Fatigue (Acute Load) for race day
        target_distance_km: Target race distance in km (default 5.0)
        days: Number of days to look back for training data (default 90)
        
    Returns:
        Tuple of (predicted_pace_seconds_per_km, confidence_score, warning_message)
        Returns (0.0, 0.0, "") if insufficient data
    """
    from datetime import timedelta, timezone
    import math
    
    if not SKLEARN_AVAILABLE:
        return (0.0, 0.0, "")
    
    # Get best all-time pace (baseline anchor)
    best_all_time_pace = get_best_all_time_pace(db, user_id)
    if best_all_time_pace <= 0:
        return (0.0, 0.0, "")
    
    # Get best recent True Effort Pace for taper ceiling
    best_recent_pace = get_best_recent_true_effort_pace(db, user_id, days=30)
    if best_recent_pace <= 0:
        return (0.0, 0.0, "")
    
    # Get maximum distance run
    max_distance_km = get_max_distance_run(db, user_id)
    
    # Get recent 5K runs for reality anchoring
    recent_5k_paces = get_recent_5k_runs(db, user_id, days=30, limit=3)
    
    # Get historical activities
    today = datetime.now(timezone.utc)
    start_date = today - timedelta(days=days)
    
    activities = db.query(Activity).filter(
        Activity.timestamp >= start_date,
        Activity.timestamp <= today,
        Activity.user_id == user_id,
        Activity.distance > 0,
        Activity.moving_time > 0,
        Activity.adjusted_pace.isnot(None)
    ).order_by(Activity.timestamp.asc()).all()
    
    if len(activities) < 5:
        # Need at least 5 data points for meaningful regression
        return (0.0, 0.0, "")
    
    # Prepare training data with recency weighting
    X_train = []  # Features: [chronic_load, acute_load]
    y_train = []  # Target: log(adjusted_pace_seconds_per_km)
    sample_weights = []  # Recency weights
    
    # Calculate ACWR for each activity date to get chronic/acute loads
    for idx, activity in enumerate(activities):
        # Get ACWR data for this activity's date
        acwr_data = calculate_acwr(db, user_id, reference_date=activity.timestamp)
        
        chronic_load = acwr_data.get("chronic_load", 0.0)
        acute_load = acwr_data.get("acute_load", 0.0)
        adjusted_pace = activity.adjusted_pace
        
        # Only include if we have valid data
        if chronic_load > 0 and acute_load >= 0 and adjusted_pace and adjusted_pace > 0:
            X_train.append([chronic_load, acute_load])
            # Logarithmic transform: log(pace) to model diminishing returns
            y_train.append(np.log(adjusted_pace))
            
            # Recency weighting: more recent activities weighted more heavily
            # Use exponential decay: weight = exp(-days_ago / 30)
            days_ago = (today - activity.timestamp).days
            recency_weight = math.exp(-days_ago / 30.0)
            
            # Extra weight for recent 5K runs (reality anchor)
            distance_km = activity.distance / 1000.0
            if 4.5 <= distance_km <= 5.5 and days_ago <= 30:
                recency_weight *= 2.0  # Double weight for recent 5K runs
            
            sample_weights.append(recency_weight)
    
    if len(X_train) < 5:
        return (0.0, 0.0, "")
    
    # Convert to numpy arrays
    X_train_array = np.array(X_train)
    y_train_array = np.array(y_train)
    sample_weights_array = np.array(sample_weights)
    
    # Train the model with sample weights
    try:
        model = LinearRegression()
        model.fit(X_train_array, y_train_array, sample_weight=sample_weights_array)
        
        # Predict log(pace) for race day
        X_race = np.array([[projected_chronic_load, projected_acute_load]])
        predicted_log_pace = model.predict(X_race)[0]
        predicted_pace = math.exp(predicted_log_pace)  # Transform back from log space
        
        # Anchor to best all-time pace: prediction shouldn't be much faster than best
        # Use the better of recent or all-time as the baseline
        baseline_pace = min(best_recent_pace, best_all_time_pace)
        
        # CRITICAL: Use best pace as the primary anchor, not regression
        # Scale best all-time pace to target distance using conservative Riegel's formula
        # For longer distances, use a more conservative exponent (1.10-1.15 instead of 1.06)
        if baseline_pace > 0:
            if target_distance_km != 5.0:
                # Use more conservative exponent for longer distances
                # For marathon (42km), use 1.12 instead of 1.06
                # For half marathon (21km), use 1.10
                # For 10K, use 1.08
                if target_distance_km >= 35:  # Marathon or longer
                    riegel_exponent = 1.12
                elif target_distance_km >= 20:  # Half marathon
                    riegel_exponent = 1.10
                elif target_distance_km >= 10:  # 10K
                    riegel_exponent = 1.08
                else:  # 5K-10K
                    riegel_exponent = 1.06
                
                # Scale best pace to target distance
                baseline_time_5k = baseline_pace * 5.0
                baseline_time_target = baseline_time_5k * ((target_distance_km / 5.0) ** riegel_exponent)
                baseline_pace_at_target = baseline_time_target / target_distance_km
            else:
                baseline_pace_at_target = baseline_pace
            
            # The predicted pace CANNOT be faster than the scaled best pace
            # This is a hard floor, not just a ceiling
            if predicted_pace < baseline_pace_at_target:
                predicted_pace = baseline_pace_at_target
        
        # Apply maximum distance penalty if runner hasn't run close to target distance
        distance_penalty = 1.0
        if max_distance_km > 0:
            # If target is much longer than max distance run, add significant penalty
            if target_distance_km > max_distance_km * 1.2:  # 20% longer than max
                distance_ratio = target_distance_km / max_distance_km
                if distance_ratio > 3.0:  # More than 3x their max distance (e.g., marathon when max is 10K)
                    distance_penalty = 1.25  # 25% slower - very aggressive
                elif distance_ratio > 2.0:  # 2x to 3x (e.g., marathon when max is half)
                    distance_penalty = 1.20  # 20% slower
                elif distance_ratio > 1.5:  # 1.5x to 2x
                    distance_penalty = 1.15  # 15% slower
                else:  # 1.2x to 1.5x
                    distance_penalty = 1.10  # 10% slower
        
        # Apply distance penalty
        predicted_pace = predicted_pace * distance_penalty
        
        # Account for fatigue: if acute load is high relative to chronic, slow down
        fatigue_factor = 1.0
        if projected_chronic_load > 0:
            acwr_ratio = projected_acute_load / projected_chronic_load
            if acwr_ratio > 1.3:  # High fatigue (ACWR > 1.3)
                fatigue_factor = 1.10  # 10% slower due to fatigue
            elif acwr_ratio > 1.1:  # Moderate fatigue
                fatigue_factor = 1.05  # 5% slower
            elif acwr_ratio < 0.8:  # Low fatigue (well rested)
                fatigue_factor = 0.99  # 1% faster (well rested) - very conservative
        
        predicted_pace = predicted_pace * fatigue_factor
        
        # Final safety check: Ensure prediction is not faster than scaled best pace
        # Allow only 2% improvement from best pace (very conservative)
        if baseline_pace_at_target > 0:
            minimum_pace = baseline_pace_at_target * 0.98  # 2% improvement max
            if predicted_pace < minimum_pace:
                predicted_pace = minimum_pace
        
        # Calculate R² score
        y_pred_train = model.predict(X_train_array)
        r2 = r2_score(y_train_array, y_pred_train)
        
        # Adjust confidence based on deviation from recent history
        warning_message = ""
        if recent_5k_paces:
            # Compare prediction to recent 5K runs
            avg_recent_5k_pace = np.mean(recent_5k_paces)
            deviation_percent = abs(predicted_pace - avg_recent_5k_pace) / avg_recent_5k_pace
            
            if deviation_percent > 0.10:  # More than 10% deviation
                # Significantly lower confidence
                r2 = r2 * 0.5  # Halve the confidence
                warning_message = "Insufficient data for high-intensity prediction."
        
        # Sanity check: predicted pace should be reasonable (between 2:00/km and 10:00/km)
        if predicted_pace < 120 or predicted_pace > 600:
            return (0.0, r2, warning_message)
        
        return (predicted_pace, r2, warning_message)
    except Exception as e:
        print(f"Error in multivariate regression: {e}")
        import traceback
        traceback.print_exc()
        return (0.0, 0.0, "")


def predict_race_time(
    base_pace_seconds_per_km: float,
    base_distance_km: float,
    target_distance_km: float
) -> float:
    """
    Predict race time using Riegel's Power Law (legacy method, kept for fallback).
    
    Formula: T2 = T1 × (D2 / D1)^1.06
    
    Args:
        base_pace_seconds_per_km: Known pace in seconds per km
        base_distance_km: Known distance in km
        target_distance_km: Target race distance in km
        
    Returns:
        Predicted time in seconds
    """
    if base_pace_seconds_per_km <= 0 or base_distance_km <= 0:
        return 0.0
    
    # Calculate time for base distance
    base_time_seconds = base_pace_seconds_per_km * base_distance_km
    
    # Apply Riegel's formula
    ratio = target_distance_km / base_distance_km
    predicted_time = base_time_seconds * (ratio ** 1.06)
    
    return predicted_time


def calculate_race_trimp(
    distance_km: float,
    time_seconds: float,
    estimated_hr: float = 160
) -> float:
    """
    Estimate TRIMP for a race based on distance and time.
    
    Args:
        distance_km: Race distance in km
        time_seconds: Estimated finish time in seconds
        estimated_hr: Estimated average heart rate (default 160 for race effort)
        
    Returns:
        Estimated TRIMP score
    """
    duration_minutes = time_seconds / 60.0
    return calculate_trimp(estimated_hr, duration_minutes)


def calculate_daily_avg_load(db: Session, user_id: str, days: int = 14) -> float:
    """
    Calculate the average daily TRIMP load over the last N days.
    This represents the user's "Current Habit" or training momentum.
    
    Args:
        db: Database session
        user_id: User ID to filter activities
        days: Number of days to look back (default 14)
        
    Returns:
        Average daily TRIMP load
    """
    today = datetime.now(timezone.utc)
    start_date = today - timedelta(days=days)
    
    activities = db.query(Activity).filter(
        Activity.timestamp >= start_date,
        Activity.timestamp <= today,
        Activity.user_id == user_id,
        Activity.trimp_score.isnot(None)
    ).all()
    
    if not activities:
        return 0.0
    
    total_trimp = sum(act.trimp_score for act in activities if act.trimp_score)
    return total_trimp / days


def project_fitness_growth(
    current_fitness: float,
    daily_avg_load: float,
    days_to_race: int
) -> float:
    """
    Project how Base Fitness (Chronic Load) will grow by race day.
    
    Uses exponential decay formula to model how fitness levels out
    as it approaches the daily training volume:
    projected_fitness = current_fitness + ((daily_avg_load - current_fitness) * (1 - exp(-days_to_race / 28)))
    
    Args:
        current_fitness: Current Base Fitness (28-day average TRIMP)
        daily_avg_load: Average daily TRIMP from last 14 days
        days_to_race: Number of days until race
        
    Returns:
        Projected Base Fitness on race day
    """
    import math
    
    if days_to_race <= 0:
        return current_fitness
    
    # Exponential decay model: fitness approaches daily_avg_load over time
    # The 28-day constant represents the time it takes for chronic load to adjust
    growth_factor = 1 - math.exp(-days_to_race / 28.0)
    projected_fitness = current_fitness + ((daily_avg_load - current_fitness) * growth_factor)
    
    # Ensure projected fitness doesn't go below current (can't lose fitness this way)
    return max(projected_fitness, current_fitness)


def generate_taper_plan(
    current_base_fitness: float,
    race_date: datetime,
    target_acwr: float = 0.9
) -> List[dict]:
    """
    Generate a 14-day taper plan that reduces training load to achieve target ACWR.
    
    Week 1: Reduce by 20%
    Week 2: Reduce by 50%
    
    Args:
        current_base_fitness: Current chronic load (28-day average TRIMP)
        race_date: Target race date (timezone-aware)
        target_acwr: Target ACWR on race day (default 0.9)
        
    Returns:
        List of daily training targets with date and target TRIMP
    """
    today = datetime.now(timezone.utc)
    if today.tzinfo is None:
        today = today.replace(tzinfo=timezone.utc)
    if race_date.tzinfo is None:
        race_date = race_date.replace(tzinfo=timezone.utc)
    
    days_until_race = (race_date.date() - today.date()).days
    
    if days_until_race < 14:
        # If less than 14 days, adjust the taper period
        taper_days = max(1, days_until_race - 1)
    else:
        taper_days = 14
    
    taper_plan = []
    
    # Calculate daily TRIMP target based on current base fitness
    # Target ACWR of 0.9 means acute load should be 0.9 × chronic load
    target_acute_load = current_base_fitness * target_acwr
    
    # Week 1: Reduce by 20% (80% of normal)
    week1_target = current_base_fitness * 0.8
    
    # Week 2: Reduce by 50% (50% of normal)
    week2_target = current_base_fitness * 0.5
    
    for day in range(taper_days):
        date = today + timedelta(days=day)
        
        # Determine which week
        if day < 7:
            target_trimp = week1_target
        else:
            target_trimp = week2_target
        
        taper_plan.append({
            "date": date.isoformat(),
            "day": day + 1,
            "target_trimp": round(target_trimp, 1),
            "week": 1 if day < 7 else 2
        })
    
    return taper_plan



