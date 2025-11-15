"""
Quick API test script for matching endpoints
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from src.main import app
import json

def test_health():
    """Test health endpoint"""
    with app.test_client() as client:
        response = client.get('/api/health')
        print(f"Health Check: {response.status_code}")
        if response.status_code == 200:
            print(f"  Response: {response.json}")
        return response.status_code == 200

def test_matching_endpoints():
    """Test matching endpoints are registered"""
    with app.test_client() as client:
        # Test that endpoints exist (will return 401 without auth, but that's ok)
        endpoints_to_test = [
            '/api/matching/my-requests',
        ]
        
        for endpoint in endpoints_to_test:
            response = client.get(endpoint)
            print(f"Endpoint {endpoint}: {response.status_code}")
            # 401 means endpoint exists but requires auth
            # 404 means endpoint doesn't exist
            if response.status_code in [200, 401, 403]:
                print(f"  ✓ Endpoint registered")
            else:
                print(f"  ✗ Endpoint may not be registered")

if __name__ == '__main__':
    print("="*60)
    print("Testing Matching API Deployment")
    print("="*60)
    
    print("\n1. Testing Health Endpoint...")
    test_health()
    
    print("\n2. Testing Matching Endpoints...")
    test_matching_endpoints()
    
    print("\n" + "="*60)
    print("✅ Deployment test complete")
    print("="*60)
