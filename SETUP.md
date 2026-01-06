# Lactate Lift - Setup Guide

## Quick Start Steps

### Step 1: Install Backend Dependencies

Open a terminal in the project root and run:

```powershell
cd backend
pip install fastapi uvicorn sqlalchemy httpx python-multipart
```

**Note:** If you prefer using a virtual environment (recommended):
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install fastapi uvicorn sqlalchemy httpx python-multipart
```

### Step 2: Start the Backend Server

In the same terminal (still in `backend` folder):

```powershell
uvicorn app.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

The API will be available at:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Step 3: Install Frontend Dependencies (if not already done)

Open a **NEW terminal** in the project root:

```powershell
cd frontend
npm install
```

This should be quick since Next.js was already initialized.

### Step 4: Start the Frontend Server

In the same terminal (still in `frontend` folder):

```powershell
npm run dev
```

You should see:
```
  ▲ Next.js 16.1.1
  - Local:        http://localhost:3000
```

### Step 5: Generate Sample Data

1. Open your browser and go to: http://localhost:8000/sync
   - This will create 10 sample activities with weather data and TRIMP scores

2. Or use curl:
```powershell
curl http://localhost:8000/sync
```

### Step 6: View the Dashboard

Open your browser and go to: http://localhost:3000

You should see the Lactate Lift dashboard with:
- Chronic Load stat card
- Injury Risk (ACWR) stat card
- Avg Weather-Adjusted Pace stat card
- Recent runs table

## Testing the API

### Test API Health
```powershell
curl http://localhost:8000/
```

### Test Dashboard Endpoint
```powershell
curl http://localhost:8000/dashboard
```

### View API Documentation
Open in browser: http://localhost:8000/docs

## Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```powershell
uvicorn app.main:app --reload --port 8001
```
Then update frontend `page.tsx` to use `http://localhost:8001`

**Module not found errors:**
- Make sure you're in the `backend` directory
- Verify dependencies are installed: `pip list`

**Database errors:**
- The SQLite database will be created automatically in the `backend` folder
- If issues occur, delete `lactate_lift.db` and restart the server

### Frontend Issues

**Port 3000 already in use:**
```powershell
npm run dev -- -p 3001
```

**CORS errors:**
- Make sure backend is running on port 8000
- Check that CORS is configured in `backend/app/main.py`

**API connection errors:**
- Verify backend is running: http://localhost:8000
- Check browser console for errors
- Make sure you've synced data first: http://localhost:8000/sync

## Environment Variables (Optional)

Create a `.env` file in the `backend` folder:

```
OPENWEATHER_API_KEY=your_api_key_here
```

Get a free API key at: https://openweathermap.org/api

**Note:** The app will work without this, but weather data will be limited.

## Project Structure Summary

```
project/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app & endpoints
│   │   ├── models.py             # Activity database model
│   │   ├── database.py           # SQLAlchemy setup
│   │   ├── weather_service.py    # Weather API & calculations
│   │   └── analytics_service.py  # ACWR calculations
│   └── requirements.txt
└── frontend/
    ├── app/
    │   └── page.tsx              # Dashboard page
    ├── components/ui/
    │   └── card.tsx              # UI components
    └── lib/
        └── utils.ts              # Utilities
```

## What Each Endpoint Does

- **GET /** - API information
- **GET /sync** - Creates sample activities (call this first!)
- **GET /dashboard** - Returns ACWR data and recent runs

## Next Steps After Setup

1. ✅ Install dependencies
2. ✅ Start backend server
3. ✅ Start frontend server
4. ✅ Sync sample data
5. ✅ View dashboard
6. 🔄 Customize for your needs
7. 🔄 Integrate real Strava API (replace `/sync` endpoint)
8. 🔄 Add authentication
9. 🔄 Deploy to production




