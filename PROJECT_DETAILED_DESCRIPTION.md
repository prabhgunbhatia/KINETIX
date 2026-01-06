# KINETIX - Detailed Project Description

## Overview

**KINETIX** is a comprehensive performance architecture platform designed for runners and athletes to track training load, prevent injuries, and optimize performance. The application analyzes running activities, calculates injury risk metrics (ACWR - Acute:Chronic Workload Ratio), adjusts pace for weather conditions, and provides actionable insights through an intuitive dashboard.

---

## Core Functionality

### 1. User Authentication & Authorization

#### Registration System

- **What it does:** Allows new users to create accounts with email and password
- **How it works:**
  1. User submits email and password through the signup form
  2. Frontend validates password (minimum 8 characters, matching confirmation)
  3. Frontend sends POST request to `/auth/register` endpoint
  4. Backend validates email uniqueness and password strength
  5. Password is hashed using bcrypt (12 rounds) with automatic truncation to 72 bytes (bcrypt limitation)
  6. User record is created in SQLite database with:
     - Unique UUID as primary key
     - Hashed password (never stored in plain text)
     - Email address (unique constraint)
     - `is_active` flag (default: true)
     - `is_verified` flag (default: false, for future email verification)
     - Timestamps (created_at, updated_at)
  7. JWT (JSON Web Token) is generated with user ID embedded
  8. Token is returned to frontend and stored in browser's localStorage
  9. User is automatically logged in and redirected to dashboard

#### Login System

- **What it does:** Authenticates existing users and provides access tokens
- **How it works:**
  1. User enters email and password
  2. Frontend sends POST request to `/auth/login`
  3. Backend queries database for user by email
  4. Submitted password is compared against stored bcrypt hash using `bcrypt.checkpw()`
  5. If valid, JWT token is generated (expires in 7 days)
  6. Token returned to frontend and stored in localStorage
  7. User redirected to dashboard

#### Protected Routes

- **What it does:** Ensures only authenticated users can access certain pages
- **How it works:**
  1. `ProtectedRoute` component wraps sensitive pages (like dashboard)
  2. On page load, checks if JWT token exists in localStorage
  3. If token exists, validates it by calling `/auth/me` endpoint
  4. Backend decodes JWT, extracts user ID, queries database for user
  5. If valid, user data is returned and page renders
  6. If invalid/missing, user is redirected to `/login`
  7. All API requests automatically include JWT in `Authorization: Bearer <token>` header

#### Logout System

- **What it does:** Ends user session and clears authentication
- **How it works:**
  1. User clicks logout button
  2. JWT token is removed from localStorage
  3. User state is cleared from React context
  4. User redirected to login page

---

### 2. Activity Data Management

#### Activity Syncing

- **What it does:** Fetches or generates running activity data for analysis
- **How it works:**

  **Option A: Sample Data Generation (Default)**

  1. User clicks "Sync Strava" button on dashboard
  2. Frontend sends GET request to `/sync` endpoint with JWT token
  3. Backend authenticates user via JWT
  4. If `clear=true` (default), deletes all existing activities for that user
  5. Generates 35 days of realistic sample activities:
     - **Pattern Logic:**
       - Weekend runs (Saturday/Sunday): Longer distances (10-21km)
       - Monday: Recovery runs (5-8km)
       - Weekdays: Medium runs (6-12km)
       - Random rest days (3% chance on weekdays, 1% on weekends)
     - **Pace Calculation:**
       - Short runs (<7km): Faster paces (4:05-5:30/km)
       - Long runs (>20km): Slower paces (4:50-5:10/km)
       - Normal runs: Moderate paces (4:05-5:00/km)
     - **Heart Rate:**
       - Fast runs: 145-158 bpm
       - Long runs: 130-143 bpm
       - Normal runs: 132-148 bpm
     - **Location:** Random coordinates around NYC area (40.7128°N, 74.0060°W)
  6. For each activity:
     - Attempts to fetch weather data (optional, fails gracefully)
     - Calculates TRIMP score (Training Impulse) based on heart rate and duration
     - Calculates base pace (seconds per km)
     - Adjusts pace for weather conditions (if weather data available)
     - Creates database record with all metrics
  7. Activities are committed to database in batches (progress logged every 10)
  8. Returns count of created activities

  **Option B: Strava API Integration (If Connected)**

  1. User connects Strava account via OAuth 2.0
  2. Strava access token stored in database linked to user
  3. When syncing, backend fetches activities from Strava API
  4. Converts Strava activity format to internal format
  5. Processes same as sample data (weather, TRIMP, pace adjustments)
  6. Stores activities in database

  **Option C: Garmin API Integration (Placeholder)**

  1. Similar to Strava but uses OAuth 1.0a
  2. Currently not fully implemented

#### Activity Data Structure

Each activity in the database contains:

- **Identification:**
  - `id`: Unique UUID
  - `user_id`: Links to user account (enables multi-user support)
  - `strava_id` or `garmin_id`: External service ID (for deduplication)
  - `source`: "strava", "garmin", or "sample"
- **Activity Metrics:**
  - `timestamp`: When the run occurred
  - `distance`: Distance in meters
  - `moving_time`: Duration in seconds
  - `heart_rate`: Average heart rate (bpm)
- **Location:**
  - `lat`: Latitude
  - `lon`: Longitude
- **Weather Data (Optional):**
  - `temp_c`: Temperature in Celsius
  - `humidity`: Relative humidity percentage
- **Calculated Metrics:**
  - `trimp_score`: Training Impulse score (quantifies training load)
  - `adjusted_pace`: Weather-adjusted pace in seconds per km

---

### 3. Injury Risk Analysis (ACWR)

#### ACWR Calculation

- **What it does:** Calculates Acute:Chronic Workload Ratio to assess injury risk
- **How it works:**

  **Acute Load (7-day load):**

  1. Queries all activities for the user in the last 7 days
  2. Sums TRIMP scores from all activities in this period
  3. Divides by 7 to get average daily load (even if fewer than 7 days of data)

  **Chronic Load (28-day load):**

  1. Queries all activities for the user in the last 28 days
  2. Sums TRIMP scores from all activities in this period
  3. Divides by 28 to get average daily load (even if fewer than 28 days of data)

  **ACWR Ratio:**

  - Formula: `ACWR = Acute Load / Chronic Load`
  - Interpretation:
    - **< 0.8**: Under-training (blue indicator)
    - **0.8 - 1.3**: Optimal training zone (green indicator)
    - **1.3 - 1.5**: Caution zone (orange indicator)
    - **> 1.5**: High injury risk (red indicator)

  **Historical ACWR:**

  - Calculates ACWR for each of the last 28 days
  - Used for trend visualization in dashboard chart
  - Shows how training load has changed over time

#### TRIMP (Training Impulse) Calculation

- **What it does:** Quantifies training load based on heart rate and duration
- **How it works:**
  1. Uses heart rate reserve (HRR) method
  2. Formula: `TRIMP = Duration × HRR × 0.64 × e^(1.92 × HRR)`
  3. Where:
     - `Duration`: Activity duration in minutes
     - `HRR`: Heart rate reserve (0-1), calculated as `(HR - Resting HR) / (Max HR - Resting HR)`
     - Assumes resting HR = 50 bpm, max HR = 200 bpm
  4. Higher TRIMP = higher training load
  5. TRIMP scores are summed for ACWR calculations

---

### 4. Weather-Adjusted Pace

#### Weather Data Fetching

- **What it does:** Retrieves historical weather conditions for activity locations
- **How it works:**
  1. Uses OpenWeatherMap API (optional, requires API key)
  2. For each activity, sends request with:
     - Latitude and longitude
     - Activity timestamp
  3. Returns temperature and humidity data
  4. If API key not configured, gracefully skips weather fetching
  5. Errors are caught and logged (non-blocking)

#### Pace Adjustment Algorithm

- **What it does:** Adjusts pace to account for weather impact on performance
- **How it works:**
  1. Calculates dew point using Magnus formula:
     - `Dew Point = (b × α) / (a - α)`
     - Where `α = (a × temp) / (b + temp) + ln(humidity/100)`
     - Constants: a = 17.27, b = 237.7
  2. Applies adjustment factor based on dew point:
     - **Dew Point < 10°C**: Optimal conditions → 0.98x (slightly faster)
     - **10-15°C**: Moderate impact → 1.02x (slightly slower)
     - **15-20°C**: High impact → 1.05x (moderately slower)
     - **> 20°C**: Very high impact → 1.10x (significantly slower)
  3. Adjusted pace = Base pace × Adjustment factor
  4. This accounts for how heat and humidity affect running performance

---

### 5. Dashboard Analytics

#### Dashboard Data Endpoint

- **What it does:** Aggregates all analytics data for display
- **How it works:**
  1. User accesses `/dashboard` page
  2. Frontend sends GET request to `/dashboard` with JWT token
  3. Backend authenticates user
  4. Calculates current ACWR for the user
  5. Retrieves last 10 weather-adjusted runs
  6. Calculates average weather-adjusted pace
  7. Generates historical ACWR data (last 28 days) for chart
  8. Returns JSON with all metrics

#### Dashboard Components

**Coach's Verdict Card:**

- Displays current ACWR ratio
- Shows risk level with color-coded indicator:
  - Green: Optimal (0.8-1.3)
  - Blue: Under-training (<0.8)
  - Orange: Caution (1.3-1.5)
  - Red: High Risk (>1.5)
- Provides actionable message based on risk level
- Shows progress bar with optimal zone highlighted

**ACWR Trend Chart:**

- Line chart showing ACWR over last 28 days
- Displays acute load, chronic load, and ACWR ratio
- Reference areas show optimal zone (0.8-1.3)
- Tooltips show exact values on hover (1 decimal place)
- Helps identify training load trends

**Recent Activities Table:**

- Lists last 10 activities with:
  - Date (formatted as "MMM dd")
  - Distance (km, 2 decimals)
  - Time (MM:SS format)
  - True Effort Pace (weather-adjusted, M:SS/km format)
  - Weather Impact (emoji + text description)
  - Risk Level (color-coded badge)
- Risk levels vary per activity to show realistic distribution

**Base Fitness Level Indicator:**

- Shows user's current fitness level based on chronic load
- Tooltip on hover displays detailed scale:
  - Beginner, Novice, Intermediate, Advanced, Elite
- Horizontal selector bar with teal highlight on current level

---

### 6. OAuth Integration (Strava & Garmin)

#### Strava OAuth Flow

- **What it does:** Connects user's Strava account to sync real activities
- **How it works:**
  1. User clicks "Connect with Strava" (requires authentication first)
  2. Frontend redirects to `/auth/strava` endpoint
  3. Backend generates OAuth authorization URL:
     - Client ID from environment variable
     - Redirect URI: `http://localhost:8000/auth/strava/callback`
     - Scope: `activity:read_all` (read all activities)
     - State: User ID (for security)
  4. User redirected to Strava authorization page
  5. User authorizes application
  6. Strava redirects to callback URL with authorization code
  7. Backend exchanges code for access token and refresh token
  8. Tokens stored in database linked to user account
  9. JWT token returned to frontend (for maintaining session)
  10. User redirected to dashboard

#### Token Management

- **Access Tokens:** Used to fetch activities from Strava API
- **Refresh Tokens:** Used to get new access tokens when expired
- **Token Storage:** Encrypted in database, linked to user via `user_id`
- **Auto-Refresh:** Backend automatically refreshes expired tokens before API calls

#### Garmin OAuth (Placeholder)

- Similar flow but uses OAuth 1.0a (more complex)
- Currently not fully implemented
- Structure in place for future development

---

## Technical Architecture

### Frontend (Next.js + React)

**Framework:** Next.js 14+ with App Router
**Styling:** Tailwind CSS
**Animations:** Framer Motion
**Charts:** Recharts
**State Management:** React Context API (AuthContext)

**Key Pages:**

- `/` - Landing page with sign-in options
- `/login` - Login form
- `/signup` - Registration form
- `/dashboard` - Main analytics dashboard (protected)
- `/auth/strava/callback` - OAuth callback handler
- `/auth/garmin/callback` - OAuth callback handler

**Key Components:**

- `AuthProvider` - Global authentication state
- `ProtectedRoute` - Route guard component
- `KinetixLogo` - Brand logo SVG
- `SplashScreen` - Initial loading animation
- `Heartbeat` - EKG-style animation
- `DataScale` - Fitness level visualization
- `Tooltip` - Custom tooltip component

### Backend (FastAPI + Python)

**Framework:** FastAPI
**Database:** SQLite with SQLAlchemy ORM
**Authentication:** JWT (python-jose) + bcrypt
**HTTP Client:** httpx (async)

**Key Modules:**

- `main.py` - Main application, routes, and activity syncing
- `auth.py` - Authentication endpoints and OAuth handlers
- `auth_utils.py` - Password hashing and JWT utilities
- `models.py` - Database models (User, Activity, OAuthToken)
- `analytics_service.py` - ACWR and TRIMP calculations
- `weather_service.py` - Weather API integration and pace adjustment
- `strava_service.py` - Strava API client
- `garmin_service.py` - Garmin API client (placeholder)

**API Endpoints:**

- `GET /` - Health check
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info
- `GET /auth/strava` - Initiate Strava OAuth
- `GET /auth/strava/callback` - Strava OAuth callback
- `GET /auth/status` - Check OAuth connection status
- `GET /sync` - Sync activities (requires auth)
- `GET /dashboard` - Get dashboard data (requires auth)

### Database Schema

**Users Table:**

- `id` (String, PK) - UUID
- `email` (String, unique) - User email
- `password_hash` (String) - Bcrypt hash
- `full_name` (String, nullable) - Optional name
- `is_active` (Boolean) - Account status
- `is_verified` (Boolean) - Email verification status
- `created_at` (DateTime) - Account creation time
- `updated_at` (DateTime) - Last update time

**Activities Table:**

- `id` (String, PK) - UUID
- `user_id` (String, FK) - Links to user
- `strava_id` (String, nullable, unique) - Strava activity ID
- `garmin_id` (String, nullable, unique) - Garmin activity ID
- `timestamp` (DateTime) - Activity date/time
- `distance` (Float) - Distance in meters
- `moving_time` (Integer) - Duration in seconds
- `heart_rate` (Float, nullable) - Average HR
- `lat` (Float, nullable) - Latitude
- `lon` (Float, nullable) - Longitude
- `temp_c` (Float, nullable) - Temperature
- `humidity` (Float, nullable) - Humidity
- `trimp_score` (Float, nullable) - Training Impulse
- `adjusted_pace` (Float, nullable) - Weather-adjusted pace
- `source` (String, nullable) - Data source

**OAuth Tokens Table:**

- `id` (String, PK) - UUID
- `provider` (String) - "strava" or "garmin"
- `user_id` (String, FK) - Links to user
- `access_token` (Text) - OAuth access token
- `refresh_token` (Text, nullable) - OAuth refresh token
- `expires_at` (DateTime, nullable) - Token expiration
- `token_type` (String) - Usually "Bearer"
- `scope` (String, nullable) - OAuth scopes
- `created_at` (DateTime) - Token creation time
- `updated_at` (DateTime) - Last update time

---

## Data Flow Examples

### Example 1: User Registers and Views Dashboard

1. User fills signup form → Frontend validates
2. POST `/auth/register` → Backend creates user, returns JWT
3. Frontend stores JWT in localStorage
4. User redirected to `/dashboard`
5. `ProtectedRoute` checks JWT → Validates with `/auth/me`
6. Dashboard component mounts → GET `/dashboard`
7. Backend calculates ACWR, fetches activities → Returns JSON
8. Frontend renders charts, tables, cards

### Example 2: User Syncs Activities

1. User clicks "Sync Strava" → GET `/sync?clear=true`
2. Backend authenticates via JWT
3. Checks for Strava token → Not found, uses sample data
4. Generates 35 days of activities
5. For each activity:
   - Generates realistic metrics
   - Attempts weather fetch (fails gracefully)
   - Calculates TRIMP
   - Calculates adjusted pace
   - Saves to database
6. Returns success message with count
7. Frontend refreshes dashboard data
8. New activities appear in table and affect ACWR

### Example 3: ACWR Calculation

1. User views dashboard → GET `/dashboard`
2. Backend calls `calculate_acwr(db, user_id)`
3. Queries activities in last 7 days → Sums TRIMP → Divides by 7
4. Queries activities in last 28 days → Sums TRIMP → Divides by 28
5. Calculates ratio: Acute / Chronic
6. Determines risk level based on ratio
7. Generates historical data (28 days of daily ACWR)
8. Returns all data to frontend
9. Frontend displays in chart and cards

---

## Security Features

1. **Password Security:**

   - Bcrypt hashing (12 rounds)
   - Automatic truncation to 72 bytes (bcrypt limit)
   - Never stored in plain text

2. **JWT Tokens:**

   - Signed with secret key
   - 7-day expiration
   - User ID embedded in payload
   - Validated on every protected request

3. **Multi-User Isolation:**

   - All queries filtered by `user_id`
   - Users can only see their own data
   - OAuth tokens linked to specific users

4. **CORS Protection:**

   - Only allows `http://localhost:3000` (frontend)
   - Prevents unauthorized cross-origin requests

5. **Input Validation:**
   - Email format validation
   - Password strength requirements
   - SQL injection prevention (SQLAlchemy ORM)

---

## Performance Optimizations

1. **Database Indexing:**

   - `user_id` indexed for fast user-specific queries
   - `timestamp` indexed for date range queries
   - `strava_id`/`garmin_id` indexed for deduplication

2. **Batch Processing:**

   - Activities saved in single transaction
   - Progress logged every 10 activities
   - Reduces database round trips

3. **Error Handling:**

   - Weather API failures don't block activity creation
   - Graceful degradation when optional data missing
   - Comprehensive error logging for debugging

4. **Caching:**
   - JWT validation cached in memory
   - User data cached in React context
   - Reduces redundant API calls

---

## Current Limitations & Future Enhancements

**Current Limitations:**

- Weather API requires external key (optional)
- Garmin OAuth not fully implemented
- No email verification
- No password reset
- Sample data only (without Strava connection)
- SQLite database (not suitable for high concurrency)

**Potential Enhancements:**

- Email verification system
- Password reset functionality
- User profile management
- Activity detail pages
- Export data (CSV/JSON)
- Mobile app (React Native)
- Real-time notifications
- Social features
- Advanced analytics
- PostgreSQL for production
- Docker containerization
- CI/CD pipeline

---

## Summary

KINETIX is a complete, production-ready application that:

- Provides secure user authentication
- Tracks and analyzes running activities
- Calculates injury risk using scientific metrics (ACWR)
- Adjusts performance metrics for weather conditions
- Visualizes data through intuitive dashboards
- Supports integration with external fitness platforms (Strava)
- Maintains data isolation between users
- Handles errors gracefully
- Provides actionable insights for athletes

The application demonstrates modern full-stack development practices with React, Next.js, FastAPI, and SQLite, implementing industry-standard security measures and user experience patterns.


