"""
Weather service for fetching weather data and calculating weather-adjusted pace.
Uses OpenWeatherMap API with dew-point correction formula (Magnus Formula).
"""
import httpx
from datetime import datetime, timezone
from typing import Optional
import os
import math

# Placeholder API key - should be set via environment variable
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "your_api_key_here")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

# Track if we've logged the missing API key warning
_weather_api_warning_logged = False


def get_weather_data(lat: float, lon: float, timestamp: datetime) -> Optional[dict]:
    """
    Fetch weather data from OpenWeatherMap API.
    
    Args:
        lat: Latitude
        lon: Longitude
        timestamp: Timestamp of the activity
        
    Returns:
        Dictionary with weather data or None if API call fails
    """
    global _weather_api_warning_logged
    
    # Skip if no valid API key
    if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY == "your_api_key_here":
        if not _weather_api_warning_logged:
            print("⚠️  Weather API key not configured. Weather data will be skipped. (This is optional)")
            print("   To enable weather data, add OPENWEATHER_API_KEY to your .env file")
            _weather_api_warning_logged = True
        return None
    
    try:
        # OpenWeatherMap uses unix timestamp for historical data
        # For current weather, we can omit the timestamp
        params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_API_KEY,
            "units": "metric"
        }
        
        with httpx.Client(timeout=5.0) as client:
            response = client.get(OPENWEATHER_BASE_URL, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        # Only log 401 errors once (invalid API key)
        if e.response.status_code == 401 and not _weather_api_warning_logged:
            print("⚠️  Invalid OpenWeatherMap API key. Weather data will be skipped.")
            _weather_api_warning_logged = True
        return None
    except Exception:
        # Silently fail for other errors (network issues, timeouts, etc.)
        return None


def calculate_dew_point(temp_c: float, humidity: float) -> float:
    """
    Calculate dew point temperature using Magnus Formula.
    
    Magnus Formula: Td = (b × α) / (a - α)
    where α = (a × T) / (b + T) + ln(RH/100)
    
    Constants:
    - a = 17.27
    - b = 237.7°C
    
    Args:
        temp_c: Temperature in Celsius
        humidity: Relative humidity (0-100)
        
    Returns:
        Dew point temperature in Celsius
    """
    # Magnus formula constants
    a = 17.27
    b = 237.7
    
    # Calculate alpha component
    alpha = ((a * temp_c) / (b + temp_c)) + math.log(humidity / 100.0)
    
    # Calculate dew point
    dew_point = (b * alpha) / (a - alpha)
    
    return dew_point


def get_normalized_pace(
    base_pace: float,
    temp_c: Optional[float] = None,
    humidity: Optional[float] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    timestamp: Optional[datetime] = None
) -> float:
    """
    Calculate normalized pace using Magnus Formula for dew point calculation.
    
    Applies correction factors based on dew point temperature thresholds:
    - Dew point < 10°C: 0.98x (optimal conditions, slight improvement)
    - Dew point 10-15°C: 1.02x (moderate impact)
    - Dew point 15-20°C: 1.05x (high impact)
    - Dew point > 20°C: 1.10x (very high impact)
    
    Args:
        base_pace: Base pace in seconds per km
        temp_c: Temperature in Celsius (optional, will fetch if not provided)
        humidity: Relative humidity 0-100 (optional, will fetch if not provided)
        lat: Optional latitude to fetch weather if temp/humidity not provided
        lon: Optional longitude to fetch weather if temp/humidity not provided
        timestamp: Optional timestamp for weather fetch (timezone-aware)
        
    Returns:
        Normalized pace in seconds per km
    """
    # If temp and humidity not provided, try to fetch from API
    if temp_c is None or humidity is None:
        if lat is not None and lon is not None and timestamp is not None:
            weather_data = get_weather_data(lat, lon, timestamp)
            if weather_data:
                temp_c = weather_data.get("main", {}).get("temp")
                humidity = weather_data.get("main", {}).get("humidity")
        
        # If still no data, return base pace (no adjustment)
        if temp_c is None or humidity is None:
            return base_pace
    
    # Calculate dew point using Magnus Formula
    dew_point = calculate_dew_point(temp_c, humidity)
    
    # Apply correction factors based on dew point thresholds
    if dew_point < 10:
        # Optimal conditions - slight improvement
        adjustment_factor = 0.98
    elif dew_point < 15:
        # Moderate impact - minimal adjustment
        adjustment_factor = 1.02
    elif dew_point < 20:
        # High impact - moderate adjustment
        adjustment_factor = 1.05
    else:
        # Very high impact - significant adjustment
        adjustment_factor = 1.10
    
    normalized_pace = base_pace * adjustment_factor
    
    return normalized_pace


def calculate_weather_adjusted_pace(
    base_pace: float, 
    temp_c: Optional[float] = None, 
    humidity: Optional[float] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    timestamp: Optional[datetime] = None
) -> float:
    """
    Legacy function name - delegates to get_normalized_pace for backward compatibility.
    
    Calculate weather-adjusted pace using dew-point correction.
    
    Args:
        base_pace: Base pace in seconds per km
        temp_c: Temperature in Celsius
        humidity: Relative humidity (0-100)
        lat: Optional latitude to fetch weather if temp/humidity not provided
        lon: Optional longitude to fetch weather if temp/humidity not provided
        timestamp: Optional timestamp for weather fetch
        
    Returns:
        Weather-adjusted pace in seconds per km
    """
    return get_normalized_pace(base_pace, temp_c, humidity, lat, lon, timestamp)

