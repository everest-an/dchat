#!/usr/bin/env python3
"""
Subscription API Test Script

This script tests all subscription and NFT avatar API endpoints.
Run this after starting the backend server to verify functionality.

Usage:
    python3 test_subscription_api.py

Requirements:
    - Backend server running on http://localhost:5000
    - Valid JWT token and wallet address

@author Manus AI
@date 2025-11-05
"""

import requests
import json
import sys
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:5000"
JWT_TOKEN = "your_jwt_token_here"  # Replace with actual token
USER_ADDRESS = "0x742d35cc6634c0532925a3b844bc9e7595f0beb0"  # Replace with actual address

# Test results
test_results = []

def print_header(text: str):
    """Print formatted header"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)

def print_test(name: str, passed: bool, details: str = ""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {name}")
    if details:
        print(f"       {details}")
    test_results.append({"name": name, "passed": passed, "details": details})

def make_request(method: str, endpoint: str, data: Dict = None, auth: bool = True) -> Dict[str, Any]:
    """Make HTTP request to API"""
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    
    if auth:
        headers["Authorization"] = f"Bearer {JWT_TOKEN}"
        headers["X-User-Address"] = USER_ADDRESS
    
    if data:
        headers["Content-Type"] = "application/json"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return {
            "status_code": response.status_code,
            "data": response.json() if response.content else {},
            "success": response.status_code < 400
        }
    except Exception as e:
        return {
            "status_code": 0,
            "data": {"error": str(e)},
            "success": False
        }

def test_health_check():
    """Test health check endpoint"""
    print_header("Testing Health Check")
    
    result = make_request("GET", "/api/health", auth=False)
    
    if result["success"] and result["data"].get("status") == "ok":
        endpoints = result["data"].get("endpoints", {})
        has_subscription = "subscriptions" in endpoints
        print_test("Health check", True, f"Server is running (Subscription API: {has_subscription})")
    else:
        print_test("Health check", False, "Server is not responding")

def test_subscription_plans():
    """Test get subscription plans"""
    print_header("Testing Subscription Plans API")
    
    # Test 1: Get all plans
    result = make_request("GET", "/api/subscriptions/plans", auth=False)
    
    if result["success"]:
        plans = result["data"].get("plans", [])
        print_test("Get subscription plans", len(plans) == 3, f"Found {len(plans)} plans")
        
        # Verify plan structure
        if plans:
            plan = plans[0]
            has_required_fields = all(k in plan for k in ["tier", "name", "pricing", "features"])
            print_test("Plan structure validation", has_required_fields)
    else:
        print_test("Get subscription plans", False, result["data"].get("error"))

def test_subscription_pricing():
    """Test get pricing for specific tier"""
    print_header("Testing Subscription Pricing API")
    
    # Test PRO tier pricing
    result = make_request("GET", "/api/subscriptions/pricing/PRO", auth=False)
    
    if result["success"]:
        pricing = result["data"].get("pricing", {})
        has_prices = all(k in pricing for k in ["monthlyPrice", "yearlyPrice", "nftPrice"])
        print_test("Get PRO tier pricing", has_prices)
    else:
        print_test("Get PRO tier pricing", False, result["data"].get("error"))
    
    # Test ENTERPRISE tier pricing
    result = make_request("GET", "/api/subscriptions/pricing/ENTERPRISE", auth=False)
    
    if result["success"]:
        print_test("Get ENTERPRISE tier pricing", True)
    else:
        print_test("Get ENTERPRISE tier pricing", False, result["data"].get("error"))
    
    # Test invalid tier
    result = make_request("GET", "/api/subscriptions/pricing/INVALID", auth=False)
    print_test("Invalid tier handling", result["status_code"] == 400)

def test_user_subscription():
    """Test get user subscription"""
    print_header("Testing User Subscription API")
    
    # Test 1: Get current subscription
    result = make_request("GET", "/api/subscriptions/me")
    
    if result["success"]:
        subscription = result["data"].get("subscription")
        tier = result["data"].get("tier", "FREE")
        print_test("Get current subscription", True, f"Current tier: {tier}")
    else:
        print_test("Get current subscription", False, result["data"].get("error"))
    
    # Test 2: Get subscription tier
    result = make_request("GET", "/api/subscriptions/tier")
    
    if result["success"]:
        tier = result["data"].get("tier")
        is_active = result["data"].get("isActive")
        print_test("Get subscription tier", True, f"Tier: {tier}, Active: {is_active}")
    else:
        print_test("Get subscription tier", False, result["data"].get("error"))
    
    # Test 3: Get subscription history
    result = make_request("GET", "/api/subscriptions/history")
    
    if result["success"]:
        subscriptions = result["data"].get("subscriptions", [])
        print_test("Get subscription history", True, f"Found {len(subscriptions)} subscriptions")
    else:
        print_test("Get subscription history", False, result["data"].get("error"))

def test_subscription_create():
    """Test create subscription (simulation)"""
    print_header("Testing Subscription Creation API")
    
    # Note: This requires a valid transaction hash from blockchain
    # For testing, we'll just verify the endpoint exists and validates input
    
    # Test with missing data
    result = make_request("POST", "/api/subscriptions/create", data={})
    print_test("Create subscription - missing data", result["status_code"] == 400)
    
    # Test with invalid tier
    result = make_request("POST", "/api/subscriptions/create", data={
        "tier": "INVALID",
        "period": "MONTHLY",
        "paymentToken": "ETH",
        "transactionHash": "0x123"
    })
    print_test("Create subscription - invalid tier", result["status_code"] == 400)

def test_nft_avatar_api():
    """Test NFT avatar API endpoints"""
    print_header("Testing NFT Avatar API")
    
    # Test 1: Get my NFT avatar
    result = make_request("GET", "/api/avatars/nft/me")
    
    if result["success"]:
        avatar = result["data"].get("avatar")
        print_test("Get my NFT avatar", True, f"Avatar set: {avatar is not None}")
    else:
        print_test("Get my NFT avatar", False, result["data"].get("error"))
    
    # Test 2: Get user NFT avatar (public)
    result = make_request("GET", f"/api/avatars/nft/{USER_ADDRESS}", auth=False)
    
    if result["success"]:
        print_test("Get user NFT avatar (public)", True)
    else:
        print_test("Get user NFT avatar (public)", False, result["data"].get("error"))
    
    # Test 3: Get avatar history
    result = make_request("GET", "/api/avatars/nft/history")
    
    if result["success"]:
        avatars = result["data"].get("avatars", [])
        print_test("Get avatar history", True, f"Found {len(avatars)} avatars")
    else:
        print_test("Get avatar history", False, result["data"].get("error"))
    
    # Test 4: Verify avatar ownership
    result = make_request("GET", f"/api/avatars/nft/verify/{USER_ADDRESS}", auth=False)
    
    if result["success"]:
        is_valid = result["data"].get("isValid")
        print_test("Verify avatar ownership", True, f"Valid: {is_valid}")
    else:
        print_test("Verify avatar ownership", False, result["data"].get("error"))

def test_nft_avatar_set():
    """Test set NFT avatar (simulation)"""
    print_header("Testing Set NFT Avatar API")
    
    # Test with missing data
    result = make_request("POST", "/api/avatars/nft/set", data={})
    print_test("Set NFT avatar - missing data", result["status_code"] == 400)
    
    # Test with invalid contract address
    result = make_request("POST", "/api/avatars/nft/set", data={
        "nftContract": "invalid",
        "tokenId": "123",
        "standard": "ERC721",
        "transactionHash": "0x123"
    })
    print_test("Set NFT avatar - invalid contract", result["status_code"] == 400)

def test_authentication():
    """Test authentication requirements"""
    print_header("Testing Authentication")
    
    # Test without JWT token
    result = make_request("GET", "/api/subscriptions/me", auth=False)
    print_test("Protected endpoint without auth", result["status_code"] == 401)
    
    # Test with invalid token
    global JWT_TOKEN
    old_token = JWT_TOKEN
    JWT_TOKEN = "invalid_token"
    
    result = make_request("GET", "/api/subscriptions/me")
    print_test("Protected endpoint with invalid auth", result["status_code"] == 401)
    
    JWT_TOKEN = old_token

def print_summary():
    """Print test summary"""
    print_header("Test Summary")
    
    total = len(test_results)
    passed = sum(1 for t in test_results if t["passed"])
    failed = total - passed
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success Rate: {(passed/total*100):.1f}%\n")
    
    if failed > 0:
        print("Failed Tests:")
        for test in test_results:
            if not test["passed"]:
                print(f"  - {test['name']}")
                if test["details"]:
                    print(f"    {test['details']}")

def main():
    """Run all tests"""
    print("\n" + "=" * 80)
    print("  SUBSCRIPTION API TEST SUITE")
    print("=" * 80)
    print(f"\nBase URL: {BASE_URL}")
    print(f"User Address: {USER_ADDRESS}")
    print("\nNote: Some tests may fail if you haven't set up JWT token and wallet address")
    
    try:
        # Run tests
        test_health_check()
        test_subscription_plans()
        test_subscription_pricing()
        test_user_subscription()
        test_subscription_create()
        test_nft_avatar_api()
        test_nft_avatar_set()
        test_authentication()
        
        # Print summary
        print_summary()
        
        # Exit with appropriate code
        failed = sum(1 for t in test_results if not t["passed"])
        sys.exit(0 if failed == 0 else 1)
        
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
