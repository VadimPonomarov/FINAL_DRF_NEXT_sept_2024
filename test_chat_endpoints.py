#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick test to verify chat endpoints are working on Railway deployment
"""

import requests
import json

BACKEND_URL = "https://autoria-web-production.up.railway.app"

def test_endpoints():
    print("Testing backend endpoints...")
    
    # Test 1: Health check
    try:
        response = requests.get(f"{BACKEND_URL}/health/", timeout=10)
        print(f"Health check: {response.status_code}")
        if response.status_code == 200:
            print(f"   Health data: {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
    
    # Test 2: Main API
    try:
        response = requests.get(f"{BACKEND_URL}/api/users/public/list/", timeout=10)
        print(f"Main API: {response.status_code}")
    except Exception as e:
        print(f"Main API failed: {e}")
    
    # Test 3: Chat endpoints list
    chat_endpoints = [
        "/api/chat/generate-image/",
        "/api/chat/generate-car-images/",
        "/api/chat/generate-car-images-mock/"
    ]
    
    for endpoint in chat_endpoints:
        try:
            # Test with GET first (should show method not allowed or swagger docs)
            response = requests.get(f"{BACKEND_URL}{endpoint}", timeout=10)
            print(f"{endpoint}: {response.status_code}")
            
            # Test with POST (should show proper error or response)
            response = requests.post(
                f"{BACKEND_URL}{endpoint}", 
                json={"test": "data"},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            print(f"   POST {endpoint}: {response.status_code}")
            
            if response.status_code == 404:
                print(f"   {endpoint} NOT FOUND")
            elif response.status_code >= 400:
                print(f"   {endpoint} found but returned error")
            else:
                print(f"   {endpoint} working")
                
        except Exception as e:
            print(f"{endpoint} failed: {e}")

if __name__ == "__main__":
    test_endpoints()
