# Backend Setup - Quick Start

## Fast Installation

The requirements have been optimized to remove heavy dependencies. Installation should be much faster now.

### Option 1: Quick Install (Recommended)

```bash
cd backend
pip install fastapi uvicorn sqlalchemy httpx python-multipart
```

### Option 2: Using requirements.txt

```bash
cd backend
pip install -r requirements.txt
```

### Run the Server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## What Changed

- **Removed pandas**: Not used in the codebase, was slowing down installation
- **Removed python-dateutil**: Using built-in datetime module instead
- **Flexible versions**: Using `>=` instead of `==` for faster resolution

## API Endpoints

- `GET /` - API info
- `GET /sync` - Sync sample data from Strava (placeholder)
- `GET /dashboard` - Get dashboard analytics data
