# 🚀 KINETIX - Getting Started

## ⚠️ Docker Not Installed

You have two options to run KINETIX with PostgreSQL:

---

## Option 1: Install Docker Desktop (Easiest - Recommended)

### Why Docker?
- Automatic PostgreSQL setup
- No manual database configuration
- Easy to start/stop
- Isolated environment

### Steps:

1. **Download Docker Desktop:**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Download for Windows
   - Install and restart your computer if prompted

2. **Start Docker Desktop:**
   - Open Docker Desktop from Start Menu
   - Wait for it to start (whale icon in system tray)

3. **Run KINETIX:**
   ```powershell
   docker compose up -d
   ```

4. **Check it's running:**
   ```powershell
   docker compose ps
   ```

5. **View logs:**
   ```powershell
   docker compose logs -f backend
   ```

That's it! Backend will be at http://localhost:8000

---

## Option 2: Install PostgreSQL Locally (No Docker)

### Steps:

1. **Download PostgreSQL:**
   - Go to: https://www.postgresql.org/download/windows/
   - Download the installer
   - Run installer:
     - Remember the password you set for `postgres` user
     - Default port: 5432
     - Install all components

2. **Create Database:**
   
   Open PowerShell and run:
   ```powershell
   # Find PostgreSQL installation (usually in Program Files)
   # Or use psql if it's in your PATH
   & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres
   ```
   
   Then in psql, run:
   ```sql
   CREATE USER kinetix_user WITH PASSWORD 'kinetix_password';
   CREATE DATABASE kinetix_db OWNER kinetix_user;
   GRANT ALL PRIVILEGES ON DATABASE kinetix_db TO kinetix_user;
   \q
   ```

3. **Create Environment File:**
   
   Create `backend/.env`:
   ```
   DATABASE_URL=postgresql://kinetix_user:kinetix_password@localhost:5432/kinetix_db
   SECRET_KEY=your-secret-key-minimum-32-characters-long-change-this
   ```

4. **Install Dependencies:**
   ```powershell
   cd backend
   pip install -r requirements.txt
   ```

5. **Start Backend:**
   ```powershell
   python -m uvicorn app.main:app --reload
   ```

6. **Verify:**
   - Check terminal for: `Database tables created successfully`
   - Visit: http://localhost:8000/
   - Should see: `{"message": "KINETIX API", "version": "1.0.0", "status": "running"}`

---

## 🎯 Which Option Should I Choose?

**Choose Docker Desktop if:**
- ✅ You want the easiest setup
- ✅ You don't mind installing Docker
- ✅ You want isolated environments
- ✅ You plan to deploy with containers

**Choose Local PostgreSQL if:**
- ✅ You already have PostgreSQL installed
- ✅ You prefer not to install Docker
- ✅ You want direct database access
- ✅ You're comfortable with database setup

---

## ⚡ Quick Start (After Setup)

Once PostgreSQL is running (either way):

1. **Start Backend:**
   ```powershell
   cd backend
   python -m uvicorn app.main:app --reload
   ```

2. **Start Frontend:**
   ```powershell
   cd frontend
   npm run dev
   ```

3. **Test:**
   - Visit: http://localhost:3000
   - Register a new account
   - Login and sync activities
   - View dashboard

---

## 🆘 Troubleshooting

### "psql: command not found"
- PostgreSQL bin directory not in PATH
- Use full path: `& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres`
- Or add PostgreSQL bin to your PATH

### "could not connect to server"
- PostgreSQL service not running
- Start it: `Start-Service postgresql-x64-15` (adjust version)
- Or start from Services (services.msc)

### "password authentication failed"
- Wrong password in `.env` file
- Check your PostgreSQL user password

### "relation does not exist"
- Database tables not created
- Restart backend and check logs

---

## 📚 More Help

- **Detailed PostgreSQL setup**: See `SETUP_POSTGRESQL.md`
- **Migration guide**: See `MIGRATION_GUIDE.md`
- **Refactoring details**: See `REFACTORING_SUMMARY.md`

---

## ✅ Recommended: Install Docker Desktop

Docker Desktop makes everything much easier. The installation takes about 5 minutes, and then you can just run `docker compose up -d` and everything works!

**Download:** https://www.docker.com/products/docker-desktop/



