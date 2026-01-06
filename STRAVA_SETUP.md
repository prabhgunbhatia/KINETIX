# 🔗 Strava API Setup Guide

## ⚠️ Error: Invalid Client ID

You're getting this error because Strava API credentials are not configured. Follow these steps to set them up.

---

## 📋 Step 1: Create Strava Application

1. **Go to Strava Developers:**

   - Visit: https://www.strava.com/settings/api

2. **Create New Application:**

   - Click "Create App" or "Register Your Application"
   - Fill in the form:
     - **Application Name**: KINETIX (or any name)
     - **Category**: Training
     - **Club**: Leave blank (optional)
     - **Website**: http://localhost:3000 (or your domain)
     - **Application Description**: Training analytics platform
     - **Authorization Callback Domain**: `localhost:8000`
     - **Redirect URI**: `http://localhost:8000/auth/strava/callback`

3. **Get Credentials:**
   - After creating, you'll see:
     - **Client ID** (a number)
     - **Client Secret** (a long string)
   - **Copy both** - you'll need them!

---

## 🔧 Step 2: Configure Credentials

### Option A: Docker Compose (Recommended)

**Edit `docker-compose.yml`:**

```yaml
services:
  backend:
    environment:
      STRAVA_CLIENT_ID: your_actual_client_id_here
      STRAVA_CLIENT_SECRET: your_actual_client_secret_here
      STRAVA_REDIRECT_URI: http://localhost:8000/auth/strava/callback
```

**Then restart:**

```powershell
docker compose down
docker compose up -d
```

### Option B: Environment File

**Create `backend/.env` file:**

```bash
STRAVA_CLIENT_ID=your_actual_client_id_here
STRAVA_CLIENT_SECRET=your_actual_client_secret_here
STRAVA_REDIRECT_URI=http://localhost:8000/auth/strava/callback
```

**Update `docker-compose.yml` to use .env:**

```yaml
services:
  backend:
    env_file:
      - ./backend/.env
```

---

## ✅ Step 3: Verify Configuration

**Check if credentials are loaded:**

```powershell
docker compose exec backend env | Select-String "STRAVA"
```

You should see:

```
STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=abc123...
STRAVA_REDIRECT_URI=http://localhost:8000/auth/strava/callback
```

---

## 🚀 Step 4: Test Connection

1. **Restart backend** (if you changed docker-compose.yml):

   ```powershell
   docker compose restart backend
   ```

2. **Go to dashboard:**

   - Visit http://localhost:3000/dashboard
   - Click "Connect Strava"
   - Should redirect to Strava authorization page

3. **Authorize:**
   - Log in to Strava (if not already)
   - Click "Authorize"
   - Should redirect back to dashboard

---

## 🔍 Troubleshooting

### "Invalid client_id" Error

**Causes:**

- Client ID not set
- Client ID is wrong
- Client ID is a string instead of number

**Solution:**

- Verify Client ID is set correctly
- Make sure it's just the number (no quotes)
- Restart backend after changes

### "Redirect URI mismatch" Error

**Causes:**

- Redirect URI in Strava app doesn't match
- Redirect URI in code doesn't match

**Solution:**

- In Strava app settings, set:
  - **Authorization Callback Domain**: `localhost:8000`
  - **Redirect URI**: `http://localhost:8000/auth/strava/callback`
- In docker-compose.yml, ensure:
  - `STRAVA_REDIRECT_URI=http://localhost:8000/auth/strava/callback`

### Credentials Not Loading

**Causes:**

- Environment variables not set
- Docker container not restarted
- .env file not in correct location

**Solution:**

- Check docker-compose.yml environment section
- Restart containers: `docker compose restart backend`
- Verify with: `docker compose exec backend env | Select-String "STRAVA"`

---

## 📝 Quick Setup Checklist

- [ ] Created Strava application at https://www.strava.com/settings/api
- [ ] Got Client ID and Client Secret
- [ ] Set `STRAVA_CLIENT_ID` in docker-compose.yml or .env
- [ ] Set `STRAVA_CLIENT_SECRET` in docker-compose.yml or .env
- [ ] Set `STRAVA_REDIRECT_URI` correctly
- [ ] Restarted backend container
- [ ] Verified credentials are loaded
- [ ] Tested "Connect Strava" button

---

## 🎯 Example Configuration

**docker-compose.yml:**

```yaml
services:
  backend:
    environment:
      STRAVA_CLIENT_ID: 123456
      STRAVA_CLIENT_SECRET: abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
      STRAVA_REDIRECT_URI: http://localhost:8000/auth/strava/callback
```

**Note:** Replace with your actual credentials!

---

## 🔒 Security Notes

- **Never commit** credentials to git
- Use environment variables, not hardcoded values
- For production, use secrets management
- Rotate secrets if exposed

---

## ✅ Once Configured

After setting up credentials:

1. Restart backend: `docker compose restart backend`
2. Try "Connect Strava" again
3. Should work! 🎉
