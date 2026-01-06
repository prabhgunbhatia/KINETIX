# Quick Start Guide - KINETIX Authentication

## ✅ What's Been Implemented

### Backend
- ✅ User model with email/password authentication
- ✅ JWT token generation and validation
- ✅ Register and login endpoints
- ✅ Protected routes (require authentication)
- ✅ OAuth tokens linked to user accounts
- ✅ Multi-user support (all data is user-specific)

### Frontend
- ✅ Authentication context and state management
- ✅ Login and signup forms connected to backend
- ✅ Protected route wrapper
- ✅ API requests with authentication headers
- ✅ Token storage in localStorage
- ✅ Logout functionality
- ✅ User info display in dashboard

## 🚀 How to Run End-to-End

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file in the `backend` directory:

```bash
SECRET_KEY=your-secret-key-minimum-32-characters-long-change-this-in-production
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=http://localhost:8000/auth/strava/callback
```

**Important:** Generate a secure `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Start Backend Server

```bash
cd backend
python -m uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### 4. Start Frontend Server

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 5. Database Setup

**First time setup:** Delete the existing database file to recreate with new schema:
```bash
# Windows PowerShell
Remove-Item backend\lactate_lift.db -ErrorAction SilentlyContinue
```

The database will be automatically created with the new schema when you start the backend.

## 📝 Testing the Flow

### 1. Create an Account
1. Go to `http://localhost:3000`
2. Click "Sign Up"
3. Enter email and password (min 8 characters)
4. Click "Sign up"
5. You'll be redirected to the dashboard

### 2. Login
1. Go to `http://localhost:3000/login`
2. Enter your email and password
3. Click "Sign in"
4. You'll be redirected to the dashboard

### 3. Connect Strava (Optional)
1. Make sure you're logged in
2. Click "Connect with Strava" on the login page or dashboard
3. Authorize on Strava
4. You'll be redirected back to the dashboard

### 4. Sync Activities
1. On the dashboard, click "Sync Strava"
2. Activities will be fetched from Strava (or sample data if not connected)
3. Dashboard will update with your data

### 5. Logout
1. Click "Logout" button in the dashboard header
2. You'll be redirected to the login page

## 🔐 API Endpoints

### Public Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password

### Protected Endpoints (Require JWT Token)
- `GET /auth/me` - Get current user info
- `GET /auth/status` - Check OAuth connection status
- `GET /auth/strava` - Initiate Strava OAuth
- `GET /dashboard` - Get dashboard data
- `GET /sync` - Sync activities

## 🧪 Test with curl

### Register
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Get Dashboard (with token)
```bash
curl -X GET http://localhost:8000/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## ⚠️ Important Notes

1. **Database Migration**: The schema has changed. Delete `lactate_lift.db` to recreate with new tables.

2. **SECRET_KEY**: Must be set in environment variables. Use a secure random string (min 32 chars).

3. **Strava OAuth**: Requires Strava API credentials. See `API_SETUP.md` for details.

4. **Token Storage**: Tokens are stored in `localStorage`. In production, consider httpOnly cookies.

5. **CORS**: Backend allows `http://localhost:3000`. Update if using different port.

## 🐛 Troubleshooting

### "Invalid authentication credentials"
- Token expired or invalid
- Try logging in again

### "User not found" after login
- Database might not have the new schema
- Delete `lactate_lift.db` and restart backend

### "Failed to fetch dashboard data"
- Check if backend is running on port 8000
- Check browser console for CORS errors
- Verify token is in localStorage: `localStorage.getItem("auth_token")`

### OAuth redirect issues
- Make sure `STRAVA_REDIRECT_URI` matches exactly in Strava app settings
- Must be `http://localhost:8000/auth/strava/callback` (backend URL, not frontend)

## 🎯 Next Steps

1. **Set up Strava API** (optional):
   - Get credentials from https://www.strava.com/settings/api
   - Add to `.env` file
   - Test OAuth flow

2. **Test the full flow**:
   - Register → Login → Connect Strava → Sync → View Dashboard

3. **Production considerations**:
   - Use PostgreSQL instead of SQLite
   - Use httpOnly cookies for tokens
   - Add email verification
   - Add password reset
   - Set up proper error logging

## 📚 Files Created/Modified

### New Files
- `frontend/lib/auth.ts` - Authentication utilities
- `frontend/contexts/AuthContext.tsx` - Auth state management
- `frontend/components/ProtectedRoute.tsx` - Route protection
- `backend/app/auth_utils.py` - JWT and password utilities

### Modified Files
- `backend/app/models.py` - Added User model, updated Activity/OAuthToken
- `backend/app/auth.py` - Added register/login endpoints
- `backend/app/main.py` - Added auth requirements, user filtering
- `backend/app/analytics_service.py` - Added user filtering
- `backend/app/strava_service.py` - Added user filtering
- `frontend/app/login/page.tsx` - Connected to backend
- `frontend/app/signup/page.tsx` - Connected to backend
- `frontend/app/dashboard/page.tsx` - Added auth, protected route
- `frontend/app/layout.tsx` - Added AuthProvider

Everything is ready to test! 🚀



