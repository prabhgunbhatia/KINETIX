# Fix for 500 Error on Registration

## Problem

The frontend is getting a 500 error when trying to register a user. This is likely because the database schema doesn't match the current User model.

## Solution

The database was created before the `is_active` and `is_verified` fields were added to the User model. The easiest fix is to delete the database and let it recreate with the correct schema.

### Option 1: Delete Database (Recommended for Development)

1. **Stop the backend server** (Ctrl+C in the terminal)

2. **Delete the database file:**

   ```powershell
   Remove-Item backend\lactate_lift.db -ErrorAction SilentlyContinue
   ```

3. **Restart the backend server:**

   ```powershell
   cd backend
   python -m uvicorn app.main:app --reload
   ```

4. **The database will be automatically recreated** with the correct schema on startup

### Option 2: Use the Updated Code (Automatic Fix)

I've updated `backend/app/main.py` to automatically drop and recreate tables on startup (for development). This means:

1. **Just restart the backend server** (Ctrl+C, then restart)
2. The database will be automatically recreated with the correct schema
3. **Note:** This will delete all existing data!

### Verify the Fix

After restarting, try registering again. The error should be gone.

## What Changed

The User model has these fields:

- `id` (String, primary key)
- `email` (String, unique, required)
- `password_hash` (String, required)
- `full_name` (String, optional)
- `is_active` (Boolean, default=True) ← **This field was missing in old database**
- `is_verified` (Boolean, default=False) ← **This field was missing in old database**
- `created_at` (DateTime)
- `updated_at` (DateTime)

The old database didn't have `is_active` and `is_verified`, causing the 500 error when trying to insert a new user.

## For Production

In production, you should use proper database migrations (like Alembic) instead of dropping and recreating tables. The current solution is only for development.


