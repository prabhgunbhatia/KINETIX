# How to Restart Backend with Fresh Database

## The Problem
You're getting an error: "The process cannot access the file because it is being used by another process."

This happens because the backend server is still running and has the database file open.

## Solution: Stop Server First, Then Delete Database

### Step 1: Stop the Backend Server

1. **Find the terminal window** where you started the backend server
2. **Press `Ctrl+C`** to stop the server
3. **Wait a few seconds** to make sure it's fully stopped

### Step 2: Delete the Database

Once the server is stopped, run:

```powershell
Remove-Item backend\lactate_lift.db -Force
```

### Step 3: Restart the Backend

```powershell
cd backend
python -m uvicorn app.main:app --reload
```

## Alternative: Use the PowerShell Script

I've created a script that does this automatically:

```powershell
.\backend\restart_with_fresh_db.ps1
```

This script will:
1. Stop any running backend processes
2. Delete the database file
3. Tell you when it's safe to restart

## Manual Method (If Script Doesn't Work)

### Option A: Find and Kill the Process

1. **Open Task Manager** (Ctrl+Shift+Esc)
2. **Find Python processes** running `uvicorn` or `app.main`
3. **End the process**
4. **Then delete the database file**

### Option B: Close All Python Processes

```powershell
# Stop all Python processes (be careful - this stops ALL Python processes!)
Get-Process python | Stop-Process -Force
```

Then delete the database:
```powershell
Remove-Item backend\lactate_lift.db -Force
```

## Verify It Worked

After restarting the backend, you should see:
```
Database tables created successfully
INFO:     Application startup complete.
```

Then try registering again - the 500 error should be gone!



