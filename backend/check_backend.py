"""
Quick script to check if the backend is running and responding
"""
import requests
import sys

try:
    print("Checking if backend is running at http://127.0.0.1:8000...")
    response = requests.get("http://127.0.0.1:8000/", timeout=5)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    print("\n[SUCCESS] Backend is running and responding!")
except requests.exceptions.ConnectionError:
    print("[ERROR] Cannot connect to backend. Is it running?")
    print("Start it with: python -m uvicorn app.main:app --reload")
    sys.exit(1)
except requests.exceptions.Timeout:
    print("[ERROR] Backend is not responding (timeout). It might be hanging.")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Unexpected error: {e}")
    sys.exit(1)



