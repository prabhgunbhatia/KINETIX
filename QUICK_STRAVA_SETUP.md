# ⚡ Quick Strava Setup

## The Problem
You're getting: `{"message":"Bad Request","errors":[{"resource":"Application","field":"client_id","code":"invalid"}]}`

This means Strava credentials are missing or invalid.

---

## 🚀 Quick Fix (3 Steps)

### 1. Get Strava Credentials

1. Go to: https://www.strava.com/settings/api
2. Click "Create App" or "Register Your Application"
3. Fill in:
   - **Name**: KINETIX
   - **Category**: Training
   - **Authorization Callback Domain**: `localhost:8000`
   - **Redirect URI**: `http://localhost:8000/auth/strava/callback`
4. Copy your **Client ID** and **Client Secret**

### 2. Add to docker-compose.yml

Edit `docker-compose.yml` and replace the empty values:

```yaml
services:
  backend:
    environment:
      STRAVA_CLIENT_ID: YOUR_CLIENT_ID_HERE
      STRAVA_CLIENT_SECRET: YOUR_CLIENT_SECRET_HERE
      STRAVA_REDIRECT_URI: http://localhost:8000/auth/strava/callback
```

**Example:**
```yaml
STRAVA_CLIENT_ID: 123456
STRAVA_CLIENT_SECRET: abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### 3. Restart Backend

```powershell
docker compose restart backend
```

---

## ✅ Test

1. Go to dashboard: http://localhost:3000/dashboard
2. Click "Connect Strava"
3. Should redirect to Strava login!

---

## 🆘 Still Not Working?

**Check credentials are loaded:**
```powershell
docker compose exec backend env | Select-String "STRAVA"
```

Should show your Client ID and Secret (not empty).

**See full guide:** `STRAVA_SETUP.md`

