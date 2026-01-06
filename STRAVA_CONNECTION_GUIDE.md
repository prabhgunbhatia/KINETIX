# 🔗 Strava Connection Guide

## ✅ Feature Added: Connect Strava from Dashboard

You can now connect your Strava account directly from the dashboard!

---

## 🎯 How It Works

### 1. **Connect Strava Button**

- Appears on dashboard if Strava is not connected
- Orange button with Strava branding
- Click to initiate OAuth flow

### 2. **OAuth Flow**

1. User clicks "Connect Strava"
2. Redirects to Strava authorization page
3. User authorizes KINETIX to access their data
4. Strava redirects back to callback page
5. Backend exchanges code for access token
6. Token stored in database
7. User redirected to dashboard with success message

### 3. **Connection Status**

- Dashboard checks connection status on load
- Shows "Strava Connected" badge when connected
- Hides "Connect Strava" button when connected
- Shows sync options when connected

---

## 🚀 Usage

### Connect Strava

1. **From Dashboard:**

   - Click "Connect Strava" button (if not connected)
   - Authorize on Strava website
   - Return to dashboard automatically

2. **After Connection:**
   - "Strava Connected" badge appears
   - Toggle between "Strava" and "Manual" modes
   - Click "Sync Strava" to fetch activities

### Sync Activities

1. **Ensure Connected:**

   - Check for "Strava Connected" badge
   - If not connected, click "Connect Strava" first

2. **Sync:**
   - Toggle to "Strava" mode (default when connected)
   - Click "Sync Strava" button
   - Wait for sync to complete
   - Activities appear in dashboard

---

## 🔧 Technical Details

### Backend Endpoints

**Check Connection Status:**

```
GET /auth/status
```

Returns:

```json
{
  "strava": {
    "connected": true,
    "expires_at": "2024-01-15T10:00:00Z"
  }
}
```

**Initiate OAuth:**

```
GET /auth/strava
```

- Requires authentication (JWT token)
- Redirects to Strava authorization page
- Passes user ID in `state` parameter

**OAuth Callback:**

```
GET /auth/strava/callback?code=...&state=...
```

- Exchanges authorization code for access token
- Stores token in database
- Redirects to frontend callback page

### Frontend Implementation

**Dashboard:**

- Checks connection status on mount
- Shows "Connect Strava" if not connected
- Shows sync options if connected
- Refreshes status after OAuth callback

**Callback Page:**

- Handles OAuth return
- Shows success/error messages
- Redirects to dashboard with status flag

---

## 🐛 Troubleshooting

### "Connect Strava" Button Not Appearing

**Check:**

1. Are you logged in?
2. Is the dashboard fully loaded?
3. Check browser console for errors

**Solution:**

- Refresh the page
- Check network tab for `/auth/status` request

### OAuth Redirect Fails

**Check:**

1. Is `STRAVA_CLIENT_ID` set in backend `.env`?
2. Is `STRAVA_CLIENT_SECRET` set?
3. Is `STRAVA_REDIRECT_URI` correct?

**Solution:**

- Verify environment variables
- Check backend logs for errors
- Ensure redirect URI matches Strava app settings

### Token Exchange Fails

**Check:**

1. Backend logs for error messages
2. Strava app settings
3. Client ID/Secret validity

**Solution:**

- Verify Strava app credentials
- Check token exchange endpoint logs
- Ensure redirect URI matches exactly

### Connection Status Not Updating

**Check:**

1. Browser console for errors
2. Network tab for `/auth/status` response
3. Backend database for token record

**Solution:**

- Refresh dashboard
- Check if token was saved to database
- Manually check connection status endpoint

---

## ✅ Success Indicators

### Connected

- ✅ "Strava Connected" badge visible
- ✅ "Connect Strava" button hidden
- ✅ "Sync Strava" button available
- ✅ Toggle between Strava/Manual modes

### Not Connected

- ✅ "Connect Strava" button visible
- ✅ "Add Run" button available (manual mode)
- ✅ No sync options shown

---

## 📝 Environment Variables Required

**Backend `.env`:**

```bash
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REDIRECT_URI=http://localhost:8000/auth/strava/callback
```

**Strava App Settings:**

- Authorization Callback Domain: `localhost:8000`
- Redirect URI: `http://localhost:8000/auth/strava/callback`
- Scopes: `activity:read_all`

---

## 🎉 You're All Set!

Now you can:

1. ✅ Connect Strava from dashboard
2. ✅ See connection status
3. ✅ Sync activities automatically
4. ✅ Use manual entry as fallback

**Happy syncing!** 🚀
