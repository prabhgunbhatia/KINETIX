# Quick Fix: 500 Error on Registration

## ✅ What I Just Did

1. **Stopped all Python processes** (including the backend server)
2. **Checked for database file** (it wasn't found, so it may have already been deleted)

## 🚀 Next Steps

### 1. Restart the Backend Server

Open a new terminal and run:

```powershell
cd backend
python -m uvicorn app.main:app --reload
```

### 2. Wait for Startup

You should see:
```
Database tables created successfully
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 3. Test Registration

Now try registering again from the frontend. The 500 error should be gone!

## 🔍 If You Still Get Errors

1. **Check the backend terminal** - it will show the exact error
2. **Check browser console** (F12) - look for error messages
3. **Verify backend is running** - visit `http://127.0.0.1:8000/` in your browser

## 📝 What Was the Problem?

The database schema didn't match the User model. The database was missing the `is_active` and `is_verified` fields. By deleting the database and restarting, it gets recreated with the correct schema.



