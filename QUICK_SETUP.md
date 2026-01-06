# Quick Setup Guide - KINETIX with PostgreSQL

## 🚀 Fastest Way to Get Started

### If You Have Docker Desktop:

```powershell
# Try the newer command first (Docker Desktop 3.0+)
docker compose up -d

# If that doesn't work, try the older command
docker-compose up -d
```

### If You DON'T Have Docker:

**Option A: Install Docker Desktop** (Recommended - 5 minutes)
1. Download: https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. Run: `docker compose up -d`

**Option B: Install PostgreSQL Locally** (10-15 minutes)
1. Download PostgreSQL: https://www.postgresql.org/download/windows/
2. Install (remember the password)
3. Create database (see SETUP_POSTGRESQL.md)
4. Create `backend/.env` with database URL
5. Run: `python -m uvicorn app.main:app --reload`

---

## 📝 Minimal Setup (Without Docker)

### 1. Install PostgreSQL

Download and install from: https://www.postgresql.org/download/windows/

### 2. Create Database

```powershell
# Connect to PostgreSQL (use your postgres password)
psql -U postgres

# Run these commands:
CREATE USER kinetix_user WITH PASSWORD 'kinetix_password';
CREATE DATABASE kinetix_db OWNER kinetix_user;
GRANT ALL PRIVILEGES ON DATABASE kinetix_db TO kinetix_user;
\q
```

### 3. Create Environment File

Create `backend/.env`:
```
DATABASE_URL=postgresql://kinetix_user:kinetix_password@localhost:5432/kinetix_db
SECRET_KEY=your-secret-key-minimum-32-characters
```

### 4. Install Dependencies

```powershell
cd backend
pip install -r requirements.txt
```

### 5. Start Backend

```powershell
python -m uvicorn app.main:app --reload
```

That's it! The database tables will be created automatically.

---

## ✅ Verify It Works

1. Backend should show: `Database tables created successfully`
2. Visit: http://localhost:8000/ (should show API info)
3. Test registration in frontend

---

## 🆘 Still Having Issues?

See `SETUP_POSTGRESQL.md` for detailed troubleshooting.



