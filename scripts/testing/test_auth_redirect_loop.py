#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test auth redirect loop issue on production
"""
import requests
import sys
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

FRONTEND = "https://autoria-clone.vercel.app"
BACKEND = "https://autoria-web-production.up.railway.app"

def test_login_and_redirect():
    """Test full login flow and redirect to /autoria/search"""
    
    print("=" * 60)
    print("Testing Auth Redirect Loop Fix")
    print("=" * 60)
    
    session = requests.Session()
    
    # Step 1: Login via backend API
    print("\n1. Login via /api/auth/login...")
    login_url = f"{FRONTEND}/api/auth/login"
    login_data = {
        "email": "admin@autoria.com",
        "password": "12345678"
    }
    
    try:
        r = session.post(login_url, json=login_data, timeout=10)
        print(f"   Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"   ❌ Login failed: {r.text[:200]}")
            return False
            
        data = r.json()
        print(f"   ✅ Login successful")
        print(f"   Cookies after login: {list(session.cookies.keys())}")
        
        # Check if access_token cookie is set
        if 'access_token' not in session.cookies:
            print(f"   ⚠️  No access_token cookie set")
        else:
            print(f"   ✅ access_token cookie present")
            
    except Exception as e:
        print(f"   ❌ Login error: {e}")
        return False
    
    # Step 2: Try to access /autoria/search
    print("\n2. Access /autoria/search after login...")
    search_url = f"{FRONTEND}/autoria/search"
    
    try:
        r = session.get(search_url, allow_redirects=False, timeout=10)
        print(f"   Status: {r.status_code}")
        print(f"   Cookies sent: {list(session.cookies.keys())}")
        
        if r.status_code == 307 or r.status_code == 308:
            redirect_to = r.headers.get('Location', 'N/A')
            print(f"   ⚠️  Redirected to: {redirect_to}")
            
            if '/login' in redirect_to or '/api/auth/signin' in redirect_to:
                print(f"   ❌ REDIRECT LOOP DETECTED - middleware blocking access")
                return False
            else:
                print(f"   ℹ️  Redirect to: {redirect_to}")
                
        elif r.status_code == 200:
            print(f"   ✅ Access granted - no redirect loop")
            return True
        else:
            print(f"   ⚠️  Unexpected status: {r.status_code}")
            
    except Exception as e:
        print(f"   ❌ Access error: {e}")
        return False
    
    # Step 3: Check if NextAuth session cookie is present
    print("\n3. Check NextAuth session cookie...")
    nextauth_cookies = [k for k in session.cookies.keys() if 'next-auth' in k.lower()]
    
    if nextauth_cookies:
        print(f"   ✅ NextAuth cookies found: {nextauth_cookies}")
    else:
        print(f"   ❌ No NextAuth session cookie - this causes redirect loop")
        print(f"   Available cookies: {list(session.cookies.keys())}")
        return False
    
    return True

if __name__ == "__main__":
    print(f"Frontend: {FRONTEND}")
    print(f"Backend:  {BACKEND}")
    
    success = test_login_and_redirect()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ TEST PASSED - No redirect loop")
        sys.exit(0)
    else:
        print("❌ TEST FAILED - Redirect loop detected")
        print("\nRoot cause: NextAuth session not created after form login")
        print("Fix: Ensure nextAuthSignIn() is awaited before redirect in useLoginForm.ts")
        sys.exit(1)
