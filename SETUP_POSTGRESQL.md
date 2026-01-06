# Setting Up PostgreSQL for KINETIX

## Option 1: Docker Compose (If Docker is Installed)

### Check Docker Installation

```powershell
# Check if Docker is installed
docker --version

# Check if Docker Compose is available (newer Docker versions)
docker compose version
```

### If Docker is Installed

**For newer Docker versions (Docker Desktop 3.0+):**

```powershell
# Use 'docker compose' (no hyphen)
docker compose up -d
```

**For older Docker versions:**

```powershell
# Use 'docker-compose' (with hyphen)
docker-compose up -d
```

### If Docker is NOT Installed

You have two options:

1. **Install Docker Desktop** (recommended for easy setup)
2. **Install PostgreSQL locally** (see Option 2 below)

---

## Option 2: Local PostgreSQL Installation

### Step 1: Install PostgreSQL

**Windows:**

1. Download from: https://www.postgresql.org/download/windows/
2. Run the installer
3. Remember the password you set for the `postgres` user
4. Default port is 5432

**Or using Chocolatey:**

```powershell
choco install postgresql
```

### Step 2: Create Database and User

Open PowerShell and run:

```powershell
# Connect to PostgreSQL (use the password you set during installation)
psql -U postgres

# Then run these SQL commands:
CREATE USER kinetix_user WITH PASSWORD 'kinetix_password';
CREATE DATABASE kinetix_db OWNER kinetix_user;
GRANT ALL PRIVILEGES ON DATABASE kinetix_db TO kinetix_user;
\q
```

### Step 3: Update Environment Variables

Create `backend/.env` file:

```bash
DATABASE_URL=postgresql://kinetix_user:kinetix_password@localhost:5432/kinetix_db
SECRET_KEY=your-secret-key-minimum-32-characters-long-change-this-in-production
```

### Step 4: Install Python Dependencies

```powershell
cd backend
pip install -r requirements.txt
```

### Step 5: Start Backend

```powershell
python -m uvicorn app.main:app --reload
```

The database tables will be created automatically on first startup.

---

## Option 3: Use Docker Desktop (If Not Installed)

### Install Docker Desktop

1. Download from: https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. Wait for Docker to start (whale icon in system tray)
4. Then use:

```powershell
docker compose up -d
```

---

## Quick Test

After PostgreSQL is running, test the connection:

```powershell
# Test connection
python -c "from backend.app.database import engine; engine.connect(); print('✅ Connected to PostgreSQL!')"
```

---

## Troubleshooting

### "psql: command not found"

- PostgreSQL is not in your PATH
- Add PostgreSQL bin directory to PATH, or use full path:
  ```powershell
  & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres
  ```

### "could not connect to server"

- PostgreSQL service is not running
- Start it from Services (services.msc) or:

  ```powershell
  # Find PostgreSQL service
  Get-Service | Where-Object {$_.Name -like "*postgres*"}

  # Start it
  Start-Service postgresql-x64-15  # Adjust version number
  ```

### "password authentication failed"

- Wrong password
- Check your `.env` file matches the database user/password

### "database does not exist"

- Database wasn't created
- Run the CREATE DATABASE command from Step 2

---

## Verify Everything Works

1. **Check PostgreSQL is running:**

   ```powershell
   # Windows
   Get-Service | Where-Object {$_.Name -like "*postgres*"}
   ```

2. **Test database connection:**

   ```powershell
   cd backend
   python -c "from app.database import engine; conn = engine.connect(); print('✅ Connected!'); conn.close()"
   ```

3. **Start backend:**

   ```powershell
   python -m uvicorn app.main:app --reload
   ```

4. **Check logs for:**
   ```
   Database tables created successfully
   INFO:     Application startup complete.
   ```

---

## Recommended: Use Docker Desktop

Docker Desktop makes everything easier:

- No manual PostgreSQL installation
- Automatic database setup
- Easy to start/stop
- Isolated environment

If you can install Docker Desktop, that's the easiest path forward!


