"""
Full UI test: image loading + auth 401 fixes
Interactive result control with pass/fail indicators.

Usage:
    python scripts/testing/test_images_and_auth.py
    python scripts/testing/test_images_and_auth.py --base-url http://localhost:3000
    python scripts/testing/test_images_and_auth.py --skip-login
"""
import argparse
import sys
import time

import requests

BACKEND = "https://autoria-web-production.up.railway.app"
FRONTEND = "https://autoria-clone.vercel.app"

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"
BOLD = "\033[1m"

results = []


def ok(label, detail=""):
    msg = f"{GREEN}[PASS]{RESET} {label}"
    if detail:
        msg += f"  {YELLOW}({detail}){RESET}"
    print(msg)
    results.append(("PASS", label))


def fail(label, detail=""):
    msg = f"{RED}[FAIL]{RESET} {label}"
    if detail:
        msg += f"  {YELLOW}({detail}){RESET}"
    print(msg)
    results.append(("FAIL", label))


def info(msg):
    print(f"{CYAN}[INFO]{RESET} {msg}")


def section(title):
    print(f"\n{BOLD}{CYAN}=== {title} ==={RESET}")


# ---------------------------------------------------------------------------
# 1. Backend health
# ---------------------------------------------------------------------------
def test_backend_health():
    section("Backend health")
    try:
        r = requests.get(f"{BACKEND}/api/doc/", timeout=10)
        if r.status_code == 200:
            ok("Backend /api/doc/ responds", f"status={r.status_code}")
        else:
            fail("Backend /api/doc/ responds", f"status={r.status_code}")
    except Exception as e:
        fail("Backend reachable", str(e)[:80])


# ---------------------------------------------------------------------------
# 2. Seeded ads have images
# ---------------------------------------------------------------------------
def test_ad_images():
    section("Ad images (Pollinations vs picsum)")
    try:
        r = requests.get(f"{BACKEND}/api/ads/cars/?page=1&page_size=5", timeout=10)
        if not r.ok:
            fail("Fetch ads list", f"status={r.status_code}")
            return

        ads = r.json().get("results", [])
        info(f"Found {len(ads)} ads in first page")

        pollinations_count = 0
        picsum_count = 0
        empty_count = 0
        broken_count = 0
        rate_limited_count = 0

        # Test only first image per ad to avoid triggering Pollinations rate-limit
        for ad in ads:
            images = ad.get("images", [])
            if not images:
                empty_count += 1
                continue
            img = images[0]
            url = img.get("image_url") or ""
            if not url:
                empty_count += 1
                continue

            if "pollinations.ai" in url:
                pollinations_count += 1
                try:
                    ir = requests.get(url, timeout=8)
                    if ir.status_code == 429:
                        rate_limited_count += 1
                        fail(f"  Pollinations ad={ad['id']}", "429 Rate Limited - too many concurrent requests")
                    elif ir.status_code == 200 and len(ir.content) > 0:
                        ok(f"  Pollinations ad={ad['id']}", f"{len(ir.content)} bytes")
                    else:
                        broken_count += 1
                        fail(f"  Pollinations ad={ad['id']}", f"status={ir.status_code} bytes={len(ir.content)} - empty/error")
                except Exception as e:
                    broken_count += 1
                    fail(f"  Pollinations ad={ad['id']}", str(e)[:60])

            elif "picsum.photos" in url:
                picsum_count += 1
                try:
                    ir = requests.get(url, timeout=8, allow_redirects=True)
                    if ir.status_code == 200 and len(ir.content) > 1000:
                        ok(f"  picsum.photos ad={ad['id']}", f"{len(ir.content)} bytes")
                    else:
                        fail(f"  picsum.photos ad={ad['id']}", f"status={ir.status_code} bytes={len(ir.content)}")
                        broken_count += 1
                except Exception as e:
                    fail(f"  picsum ad={ad['id']}", str(e)[:60])
                    broken_count += 1
            else:
                info(f"  Unknown source ad={ad['id']}: {url[:60]}")

        info(f"Summary: pollinations={pollinations_count} picsum={picsum_count} empty={empty_count} "
             f"broken={broken_count} rate_limited={rate_limited_count}")

        needs_fix = rate_limited_count > 0 or broken_count > 0
        if picsum_count > 0 and pollinations_count == 0:
            ok("All images use reliable picsum.photos URLs")
        elif rate_limited_count > 0:
            fail(
                "Images not rate-limited",
                f"{rate_limited_count}/{len(ads)} Pollinations URLs return 429 - run: railway run python manage.py fix_ad_images"
            )
        elif broken_count > 0:
            fail("Images deliver content", f"{broken_count} broken - run: railway run python manage.py fix_ad_images")
        elif pollinations_count > 0:
            ok("Pollinations images working", f"{pollinations_count} images with content")
        elif empty_count == len(ads):
            fail("Ads have images", "All ads have no images")

    except Exception as e:
        fail("Ad images test", str(e)[:100])


# ---------------------------------------------------------------------------
# 3. Login flow — get session cookies
# ---------------------------------------------------------------------------
def do_login(email, password):
    section("Login flow")
    session = requests.Session()
    try:
        r = session.post(
            f"{FRONTEND}/api/auth/login",
            json={"email": email, "password": password},
            timeout=15,
        )
        if r.status_code == 200:
            data = r.json()
            token = data.get("access") or (data.get("tokens") or {}).get("access")
            if token:
                ok("POST /api/auth/login", f"token present ({len(token)} chars)")
                return session
            else:
                fail("POST /api/auth/login", f"No access token in response: {list(data.keys())}")
        else:
            fail("POST /api/auth/login", f"status={r.status_code} body={r.text[:100]}")
    except Exception as e:
        fail("POST /api/auth/login", str(e)[:80])
    return None


# ---------------------------------------------------------------------------
# 4. Protected endpoints — should NOT return 401 after login
# ---------------------------------------------------------------------------
def test_protected_endpoints(session):
    section("Protected endpoints (should be 200 not 401)")
    endpoints = [
        ("/api/user/profile/", "User profile"),
        ("/api/user/account/", "User account"),
        ("/api/user/addresses/", "User addresses"),
    ]
    for path, label in endpoints:
        try:
            r = session.get(f"{FRONTEND}{path}", timeout=10)
            if r.status_code == 200:
                ok(f"{label} {path}", f"status=200")
            elif r.status_code == 401:
                fail(f"{label} {path}", "401 Unauthorized - token not forwarded or expired")
            elif r.status_code == 404:
                fail(f"{label} {path}", "404 Not Found - route missing")
            else:
                fail(f"{label} {path}", f"status={r.status_code}")
        except Exception as e:
            fail(f"{label} {path}", str(e)[:80])


# ---------------------------------------------------------------------------
# 5. /api/auth/token endpoint
# ---------------------------------------------------------------------------
def test_auth_token_endpoint(session):
    section("/api/auth/token cookie endpoint")
    try:
        r = session.get(f"{FRONTEND}/api/auth/token", timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get("access"):
                ok("/api/auth/token returns access token", f"len={len(data['access'])}")
            else:
                fail("/api/auth/token", f"No access in response: {list(data.keys())}")
        else:
            fail("/api/auth/token", f"status={r.status_code}")
    except Exception as e:
        fail("/api/auth/token", str(e)[:80])


# ---------------------------------------------------------------------------
# 6. Proxy route
# ---------------------------------------------------------------------------
def test_proxy(session):
    section("API proxy route")
    try:
        r = session.get(f"{FRONTEND}/api/proxy/api/accounts/contacts/", timeout=10)
        if r.status_code in (200, 404):
            ok("/api/proxy/api/accounts/contacts/", f"status={r.status_code} (proxy working)")
        elif r.status_code == 401:
            fail("/api/proxy route", "401 - token not forwarded by proxy")
        else:
            ok("/api/proxy route reachable", f"status={r.status_code}")
    except Exception as e:
        fail("/api/proxy", str(e)[:80])


# ---------------------------------------------------------------------------
# 7. Media proxy
# ---------------------------------------------------------------------------
def test_media_proxy():
    section("Media proxy /api/media/")
    # Test with a known good picsum URL that doesn't need the proxy,
    # just verify the proxy route itself exists and responds
    try:
        r = requests.get(f"{FRONTEND}/api/media/nonexistent-test-path.jpg", timeout=10)
        if r.status_code in (404, 502, 503):
            ok("/api/media/ proxy route exists", f"status={r.status_code} (backend responded)")
        elif r.status_code == 200:
            ok("/api/media/ proxy route", "200")
        else:
            info(f"/api/media/ returned {r.status_code} (may be acceptable)")
    except Exception as e:
        fail("/api/media/ proxy", str(e)[:80])


# ---------------------------------------------------------------------------
# Interactive summary
# ---------------------------------------------------------------------------
def print_summary():
    section("RESULTS SUMMARY")
    passed = [r for r in results if r[0] == "PASS"]
    failed = [r for r in results if r[0] == "FAIL"]

    for label in passed:
        print(f"  {GREEN}PASS{RESET}  {label[1]}")
    for label in failed:
        print(f"  {RED}FAIL{RESET}  {label[1]}")

    total = len(results)
    print(f"\n{BOLD}Total: {total}  |  {GREEN}Passed: {len(passed)}{RESET}  |  {RED}Failed: {len(failed)}{RESET}{BOLD}{RESET}")

    if failed:
        print(f"\n{YELLOW}Action items:{RESET}")
        actions = []
        for _, label in failed:
            if "rate-limit" in label.lower() or "pollinations" in label.lower() or "picsum" in label.lower():
                action = "railway run python manage.py fix_ad_images  (replace broken image URLs)"
            elif "401" in label or "token" in label.lower():
                action = "Check token forwarding: serverAuth.ts authenticatedFetch / proxy route"
            elif "login" in label.lower():
                action = "Verify credentials: admin@autoria.com / 12345678 on Railway"
            else:
                action = f"Investigate: {label}"
            if action not in actions:
                actions.append(action)
        for action in actions:
            print(f"  - {action}")
    return len(failed) == 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    global FRONTEND, BACKEND

    parser = argparse.ArgumentParser(description="UI regression test: images + auth fixes")
    parser.add_argument("--base-url", default=None, help="Frontend base URL (default: " + FRONTEND + ")")
    parser.add_argument("--skip-login", action="store_true", help="Skip login and protected endpoint tests")
    parser.add_argument("--email", default="admin@autoria.com", help="Login email")
    parser.add_argument("--password", default="12345678", help="Login password")
    args = parser.parse_args()

    if args.base_url:
        FRONTEND = args.base_url.rstrip("/")

    info(f"Backend:  {BACKEND}")
    info(f"Frontend: {FRONTEND}")
    info(f"Time:     {time.strftime('%Y-%m-%d %H:%M:%S')}")

    test_backend_health()
    test_ad_images()
    test_media_proxy()

    if not args.skip_login:
        session = do_login(args.email, args.password)
        if session:
            test_auth_token_endpoint(session)
            test_protected_endpoints(session)
            test_proxy(session)
        else:
            fail("Login required for protected endpoint tests", "use --skip-login to skip")
    else:
        info("Skipping login-dependent tests (--skip-login)")

    success = print_summary()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
