"""
Quick test script to check if the backend can start without errors
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    print("Testing imports...")
    from app.database import engine, Base
    print("[OK] Database imports OK")
    
    from app.models import User, Activity
    print("[OK] Model imports OK")
    
    from app.auth import router, get_current_user
    print("[OK] Auth imports OK")
    
    from app.main import app
    print("[OK] Main app import OK")
    
    print("\n[SUCCESS] All imports successful! Backend should start correctly.")
    print("\nTo start the server, run:")
    print("  python -m uvicorn app.main:app --reload")
    
except Exception as e:
    print(f"\n[ERROR] Error during import: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

