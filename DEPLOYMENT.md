# Deployment Guide

This guide covers deploying KINETIX to production so others can use it.

## Deployment Options

### Option 1: Vercel (Frontend) + Railway/Render (Backend) - Recommended

#### Frontend on Vercel (Free Tier Available)

1. **Push to GitHub** (if not already done):
```bash
git remote add origin https://github.com/YOUR_USERNAME/kinetix.git
git push -u origin main
```

2. **Deploy Frontend**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Add environment variables:
     ```
     NEXT_PUBLIC_API_URL=https://your-backend-url.com
     ```
   - Deploy!

#### Backend on Railway (Easy) or Render (Free Tier)

**Railway:**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add service → Select `backend` folder
6. Add environment variables:
   - `DATABASE_URL` (Railway provides PostgreSQL automatically)
   - `JWT_SECRET`
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `OPENWEATHER_API_KEY`
   - `STRAVA_REDIRECT_URI` (use Railway's URL)
7. Deploy!

**Render:**
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. New → Web Service
4. Connect your GitHub repo
5. Set:
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables (same as Railway)
7. Add PostgreSQL database (free tier available)
8. Deploy!

### Option 2: Docker Compose on VPS (DigitalOcean, AWS EC2, etc.)

1. **Get a VPS** (DigitalOcean Droplet, AWS EC2, etc.)
2. **SSH into server**:
```bash
ssh user@your-server-ip
```

3. **Install Docker & Docker Compose**:
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo apt-get install docker-compose-plugin
```

4. **Clone repository**:
```bash
git clone https://github.com/YOUR_USERNAME/kinetix.git
cd kinetix
```

5. **Create .env file**:
```bash
cp .env.example .env
nano .env  # Edit with your values
```

6. **Start services**:
```bash
docker compose up -d --build
```

7. **Set up reverse proxy (Nginx)**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

8. **Set up SSL with Let's Encrypt**:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 3: Fly.io (Full Stack - Free Tier)

1. **Install Fly CLI**:
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

2. **Login**:
```bash
fly auth login
```

3. **Deploy Backend**:
```bash
cd backend
fly launch
# Follow prompts, select PostgreSQL addon
```

4. **Deploy Frontend**:
```bash
cd frontend
fly launch
# Set NEXT_PUBLIC_API_URL to backend URL
```

## Environment Variables Checklist

Make sure to set these in your deployment platform:

### Backend:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Random secret key for JWT tokens
- `STRAVA_CLIENT_ID` - From Strava API
- `STRAVA_CLIENT_SECRET` - From Strava API
- `STRAVA_REDIRECT_URI` - Your backend URL + `/auth/strava/callback`
- `OPENWEATHER_API_KEY` - From OpenWeatherMap

### Frontend:
- `NEXT_PUBLIC_API_URL` - Your backend API URL (e.g., `https://api.kinetix.com`)

## Post-Deployment Checklist

- [ ] Update Strava OAuth redirect URI to production URL
- [ ] Test user registration/login
- [ ] Test Strava connection
- [ ] Test activity sync
- [ ] Test race prediction
- [ ] Set up monitoring (optional)
- [ ] Set up backups for database

## Quick Deploy Commands

### Railway (Backend)
```bash
railway login
railway init
railway up
```

### Vercel (Frontend)
```bash
npm i -g vercel
cd frontend
vercel
```

## Troubleshooting

### CORS Issues
Make sure your backend CORS settings include your frontend URL:
```python
# In backend/app/main.py
origins = [
    "http://localhost:3000",
    "https://your-frontend-domain.com"
]
```

### Database Connection
Ensure `DATABASE_URL` is correctly formatted:
```
postgresql://user:password@host:port/database
```

### Environment Variables Not Loading
- Check variable names match exactly
- Restart services after adding variables
- Use `echo $VARIABLE_NAME` to verify

