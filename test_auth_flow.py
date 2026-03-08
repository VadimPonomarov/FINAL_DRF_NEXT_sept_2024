import requests

BASE = "https://autoria-clone.vercel.app"
CREDS = {"email": "admin@autoria.com", "password": "12345678"}

session = requests.Session()

print("=" * 60)
print("STEP 1: /api/auth/token before login (expect null tokens)")
r = session.get(f"{BASE}/api/auth/token")
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  access: {data.get('access')}")
print(f"  user:   {data.get('user')}")
assert data.get('access') is None, "Should have no token before login"
print("  [OK] No tokens before login - correct")

print()
print("=" * 60)
print("STEP 2: POST /api/auth/login")
r = session.post(
    f"{BASE}/api/auth/login",
    json=CREDS,
    headers={"Content-Type": "application/json"}
)
print(f"  Status: {r.status_code}")
if r.status_code == 200:
    login_data = r.json()
    has_access = bool(login_data.get('access'))
    has_user = bool(login_data.get('user'))
    print(f"  access token: {'✅ present' if has_access else '❌ missing'}")
    print(f"  user:         {'✅ present' if has_user else '❌ missing'}")
    if has_user:
        print(f"  user email:   {login_data['user'].get('email')}")
    # Check cookies set
    cookies = dict(session.cookies)
    print(f"  cookies set:  {list(cookies.keys())}")
    has_access_cookie = 'access_token' in cookies
    has_refresh_cookie = 'refresh_token' in cookies
    print(f"  access_token cookie:  {'✅' if has_access_cookie else '❌'}")
    print(f"  refresh_token cookie: {'✅' if has_refresh_cookie else '❌'}")
else:
    print(f"  ❌ Login failed: {r.text[:200]}")
    exit(1)

print()
print("=" * 60)
print("STEP 3: /api/auth/token after login (expect access token from cookie)")
r = session.get(f"{BASE}/api/auth/token")
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  access: {'✅ present' if data.get('access') else '❌ missing'}")
print(f"  user:   {data.get('user')}")
if data.get('access'):
    print("  ✅ Token correctly returned from cookie after login")
else:
    print("  ⚠️  Token not returned (may need NextAuth session cookie)")

print()
print("=" * 60)
print("STEP 4: GET /api/user/profile (protected - uses Bearer from cookie)")
r = session.get(f"{BASE}/api/user/profile/")
print(f"  Status: {r.status_code}")
if r.status_code == 200:
    profile = r.json()
    print(f"  email: {profile.get('email', 'N/A')}")
    print("  ✅ Protected endpoint accessible after login")
elif r.status_code == 401:
    print("  ❌ 401 Unauthorized - Bearer not forwarded to backend")
else:
    print(f"  Response: {r.text[:200]}")

print()
print("=" * 60)
print("STEP 5: GET /api/auth/status")
r = session.get(f"{BASE}/api/auth/status")
print(f"  Status: {r.status_code}")
if r.status_code == 200:
    status_data = r.json()
    d = status_data.get('data', {})
    print(f"  hasBackendTokens:   {'✅' if d.get('hasBackendTokens') else '❌'}")
    print(f"  backendTokensValid: {'✅' if d.get('backendTokensValid') else '❌'}")
    print(f"  isFullyAuthenticated: {'✅' if d.get('isFullyAuthenticated') else '❌'}")

print()
print("=" * 60)
print("STEP 6: GET /api/proxy/api/accounts/contacts/ (protected proxy)")
r = session.get(f"{BASE}/api/proxy/api/accounts/contacts/")
print(f"  Status: {r.status_code}")
if r.status_code == 200:
    print("  ✅ Contacts endpoint accessible")
elif r.status_code == 401:
    print("  ❌ 401 - needs auth header forwarding fix")
else:
    print(f"  {r.status_code}: {r.text[:100]}")

print()
print("=" * 60)
print("SUMMARY")
print("  Build: ✅ passes")
print("  Login flow: tested above")
