"""
Test script to check the register endpoint
"""
import requests
import json

url = "http://127.0.0.1:8000/auth/register"
data = {
    "email": "test@example.com",
    "password": "test12345"
}

try:
    print(f"Testing POST {url}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    response = requests.post(url, json=data, timeout=10)
    
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    
    try:
        response_data = response.json()
        print(f"Response Body: {json.dumps(response_data, indent=2)}")
    except:
        print(f"Response Text: {response.text}")
    
    if response.status_code == 201:
        print("\n[SUCCESS] Registration endpoint is working!")
    else:
        print(f"\n[ERROR] Registration failed with status {response.status_code}")
        
except requests.exceptions.ConnectionError:
    print("[ERROR] Cannot connect to backend. Is it running?")
except requests.exceptions.Timeout:
    print("[ERROR] Request timed out")
except Exception as e:
    print(f"[ERROR] Unexpected error: {e}")
    import traceback
    traceback.print_exc()



