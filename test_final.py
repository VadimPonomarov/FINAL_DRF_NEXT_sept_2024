import requests
import sys

BASE = "https://autoria-clone.vercel.app"
CREDS = {"email": "admin@autoria.com", "password": "12345678"}
s = requests.Session()
results = []

def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    results.append((name, status, detail))
    msg = "  [" + status + "] " + name
    if detail:
        msg += ": " + str(detail)
    print(msg)

print("=== STEP 1: Token before login ===")
r = s.get(BASE + "/api/auth/token")
d = r.json()
check("No token before login", d.get("access") is None)

print("=== STEP 2: Login ===")
r = s.post(BASE + "/api/auth/login", json=CREDS, headers={"Content-Type": "application/json"})
check("Login status 200", r.status_code == 200, "status=" + str(r.status_code))
if r.status_code != 200:
    print("FATAL: " + r.text[:200])
    sys.exit(1)
ld = r.json()
check("Login returns access token", bool(ld.get("access")))
check("Login returns user", bool(ld.get("user")))
check("access_token cookie set", "access_token" in s.cookies)
check("refresh_token cookie set", "refresh_token" in s.cookies)
user_email = ld.get("user", {}).get("email", "?")
print("  user: " + user_email)

print("=== STEP 3: Token after login ===")
r = s.get(BASE + "/api/auth/token")
d = r.json()
check("Token present after login", bool(d.get("access")))

print("=== STEP 4: Protected /api/user/profile/ ===")
r = s.get(BASE + "/api/user/profile/")
check("/api/user/profile 200", r.status_code == 200, "status=" + str(r.status_code))
if r.status_code == 200:
    profile_email = r.json().get("email", "?")
    check("Profile has email", bool(profile_email), profile_email)

print("=== STEP 5: Protected /api/proxy/api/accounts/contacts/ ===")
r = s.get(BASE + "/api/proxy/api/accounts/contacts/")
check("/api/proxy contacts not 401", r.status_code != 401, "status=" + str(r.status_code))
check("/api/proxy contacts 200 or 404", r.status_code in (200, 404), "status=" + str(r.status_code))

print("=== STEP 6: Auth status ===")
r = s.get(BASE + "/api/auth/status")
if r.status_code == 200:
    sd = r.json().get("data", {})
    check("hasBackendTokens=True", sd.get("hasBackendTokens") is True)
    check("backendTokensValid=True", sd.get("backendTokensValid") is True)

print("=== STEP 7: Access before login (new session) ===")
s2 = requests.Session()
r = s2.get(BASE + "/api/user/profile/")
check("No 401 flood: profile returns 401 without cookie (expected)", r.status_code == 401, "status=" + str(r.status_code))
r = s2.get(BASE + "/api/proxy/api/accounts/contacts/")
check("No 401 flood: contacts returns 401 without cookie (expected)", r.status_code == 401, "status=" + str(r.status_code))

print()
print("=== SUMMARY ===")
passed = sum(1 for _, st, _ in results if st == "PASS")
failed = sum(1 for _, st, _ in results if st == "FAIL")
print("PASSED: " + str(passed) + "/" + str(len(results)) + "  FAILED: " + str(failed))
if failed:
    print("FAILED tests:")
    for name, st, detail in results:
        if st == "FAIL":
            print("  - " + name + ": " + detail)
sys.exit(0 if failed == 0 else 1)
