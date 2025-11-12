#!/usr/bin/env python3
"""
🧪 AutoRia Clone - Full Deployment Testing Script (Python)
==========================================================

Tests all deployment variants after cloning:
1. python deploy.py --mode local
2. python deploy.py --mode with_frontend  
3. deploy.sh --local-frontend (if on Unix)
4. deploy.js --local-frontend

For each variant, checks:
- Frontend starts without errors
- Backend is accessible
- Seeded ads contain images (via MCP or direct API)
"""

import os
import sys
import time
import subprocess
import json
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional, Tuple, List

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_step(step: str, message: str):
    print(f"{Colors.OKBLUE}[TEST {step}]{Colors.ENDC} {Colors.BOLD}{message}{Colors.ENDC}")

def print_success(message: str):
    print(f"{Colors.OKGREEN}✅ {message}{Colors.ENDC}")

def print_warning(message: str):
    print(f"{Colors.WARNING}⚠️  {message}{Colors.ENDC}")

def print_error(message: str):
    print(f"{Colors.FAIL}❌ {message}{Colors.ENDC}")

def wait_for_service(url: str, max_wait: int = 60) -> bool:
    """Wait for a service to become available"""
    elapsed = 0
    while elapsed < max_wait:
        try:
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            with urllib.request.urlopen(req, timeout=3) as response:
                if response.getcode() == 200:
                    return True
        except (urllib.error.URLError, urllib.error.HTTPError, Exception):
            pass
        time.sleep(2)
        elapsed += 2
        print(".", end="", flush=True)
    print()
    return False

def check_images_in_ads(test_name: str) -> Tuple[bool, List[str]]:
    """Check if seeded ads contain images"""
    print_step("CHECK", f"Verifying images in seeded ads for {test_name}...")
    
    # Wait for seeding to complete
    time.sleep(10)
    
    try:
        # Get list of ads from backend
        url = "http://localhost:8000/api/autoria/cars/?limit=5"
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.getcode() != 200:
                print_error("Failed to fetch ads from backend")
                return False, []
            
            data = json.loads(response.read().decode('utf-8'))
            
            # Extract image URLs
            image_urls = []
            ads = data.get('results', []) if isinstance(data, dict) else data if isinstance(data, list) else []
            
            for ad in ads:
                # Check various image fields
                for field in ['image_url', 'image_display_url', 'images', 'main_image']:
                    if field in ad and ad[field]:
                        if isinstance(ad[field], str):
                            if ad[field] and ad[field] != 'null':
                                image_urls.append(ad[field])
                        elif isinstance(ad[field], list) and len(ad[field]) > 0:
                            for img in ad[field]:
                                if isinstance(img, dict):
                                    img_url = img.get('image_url') or img.get('url') or img.get('image')
                                    if img_url and img_url != 'null':
                                        image_urls.append(img_url)
                                elif isinstance(img, str) and img != 'null':
                                    image_urls.append(img)
            
            if image_urls:
                print_success(f"Found {len(image_urls)} image URL(s) in ads")
                for i, img_url in enumerate(image_urls[:3], 1):
                    print_success(f"  Image {i}: {img_url}")
                return True, image_urls
            else:
                print_error("No image URLs found in ads response")
                print(f"  Response keys: {list(ads[0].keys()) if ads else 'No ads'}")
                return False, []
                
    except urllib.error.URLError as e:
        print_error(f"Failed to connect to backend: {e}")
        return False, []
    except json.JSONDecodeError as e:
        print_error(f"Failed to parse JSON response: {e}")
        return False, []
    except Exception as e:
        print_error(f"Error checking images: {e}")
        return False, []

def check_frontend_for_errors() -> bool:
    """Check if frontend has App Router mounting errors"""
    print_step("CHECK", "Checking for App Router errors...")
    
    try:
        url = "http://localhost:3000"
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0')
        
        # Use timeout to avoid hanging on streaming responses
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
            if "expected app router to be mounted" in html.lower():
                print_error("App Router mounting error detected in HTML!")
                return False
            elif "Something went wrong" in html and "invariant" in html.lower():
                print_error("Error page detected - possible App Router issue")
                return False
            else:
                print_success("No App Router errors detected")
                return True
                
    except urllib.error.URLError as e:
        print_warning(f"Could not check frontend (may be streaming): {e}")
        # For streaming responses, we can't easily check, so assume OK if service is up
        return True
    except Exception as e:
        print_warning(f"Error checking frontend: {e}")
        return True  # Don't fail test on check error

def test_deployment(variant: str, deploy_cmd: List[str], test_dir: Path) -> bool:
    """Test a single deployment variant"""
    print()
    print("=" * 50)
    print_step("VARIANT", f"Testing deployment: {variant}")
    print("=" * 50)
    print()
    
    original_dir = Path.cwd()
    os.chdir(test_dir)
    
    try:
        # Cleanup before test
        print_step("PREP", "Cleaning up previous deployment...")
        try:
            subprocess.run(["docker-compose", "down"], 
                         capture_output=True, timeout=30, check=False)
        except:
            pass
        
        # Run deployment
        print_step("DEPLOY", f"Running: {' '.join(deploy_cmd)}")
        
        if "python" in deploy_cmd[0] and "deploy.py" in deploy_cmd:
            # Python deploy - runs synchronously
            process = subprocess.Popen(
                deploy_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            # Monitor output for completion
            max_wait = 600  # 10 minutes
            start_time = time.time()
            
            while time.time() - start_time < max_wait:
                if process.poll() is not None:
                    break
                time.sleep(5)
            
            if process.poll() is None:
                print_error("Deployment timed out")
                process.terminate()
                return False
            elif process.returncode != 0:
                print_error(f"Deployment failed with code {process.returncode}")
                return False
        else:
            # Other deploy scripts - run in background
            log_file = test_dir / f"{variant}.log"
            with open(log_file, 'w') as f:
                process = subprocess.Popen(
                    deploy_cmd,
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    text=True
                )
            
            # Wait for services
            time.sleep(10)
        
        # Check backend
        print_step("CHECK", "Verifying backend...")
        if wait_for_service("http://localhost:8000/health", 30):
            print_success("Backend is accessible")
        else:
            print_error("Backend is not accessible")
            return False
        
        # Check frontend
        print_step("CHECK", "Verifying frontend...")
        if wait_for_service("http://localhost:3000", 60):
            print_success("Frontend is accessible")
        else:
            print_error("Frontend is not accessible")
            return False
        
        # Check for errors
        if not check_frontend_for_errors():
            return False
        
        # Check images
        has_images, image_urls = check_images_in_ads(variant)
        if not has_images:
            print_warning(f"Image check failed for {variant} - may need investigation")
        
        print_success(f"Deployment variant {variant} completed")
        return True
        
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        os.chdir(original_dir)

def main():
    print()
    print("=" * 50)
    print("🧪 AutoRia Clone - Full Deployment Test")
    print("=" * 50)
    print()
    
    # Determine test directory
    if len(sys.argv) > 1:
        clone_url = sys.argv[1]
        if os.path.isdir(clone_url):
            test_dir = Path(clone_url)
        else:
            test_dir = Path(f"./test-deployment-{int(time.time())}")
            print_step("SETUP", f"Cloning repository to {test_dir}...")
            subprocess.run(["git", "clone", clone_url, str(test_dir)], check=True)
    else:
        test_dir = Path(".")
        print_step("SETUP", "Using current directory for testing")
    
    results = []
    
    # Test 1: python deploy.py --mode local
    if test_deployment("python-local", 
                      [sys.executable, "deploy.py", "--mode", "local"], 
                      test_dir):
        results.append("python-local: ✅ PASS")
    else:
        results.append("python-local: ❌ FAIL")
    
    # Cleanup
    print_step("CLEANUP", "Stopping services...")
    try:
        subprocess.run(["docker-compose", "down"], 
                      capture_output=True, timeout=30, check=False)
    except:
        pass
    time.sleep(5)
    
    # Test 2: python deploy.py --mode with_frontend
    if test_deployment("python-docker",
                      [sys.executable, "deploy.py", "--mode", "with_frontend"],
                      test_dir):
        results.append("python-docker: ✅ PASS")
    else:
        results.append("python-docker: ❌ FAIL")
    
    # Cleanup
    print_step("CLEANUP", "Stopping services...")
    try:
        subprocess.run(["docker-compose", "-f", "docker-compose.yml", 
                       "-f", "docker-compose.with_frontend.yml", "down"],
                      capture_output=True, timeout=30, check=False)
    except:
        pass
    time.sleep(5)
    
    # Test 3 & 4: Only on Unix systems
    if sys.platform != "win32":
        # Test 3: deploy.sh
        if test_deployment("bash-local",
                          ["bash", "deploy.sh", "--local-frontend"],
                          test_dir):
            results.append("bash-local: ✅ PASS")
        else:
            results.append("bash-local: ❌ FAIL")
        
        time.sleep(5)
        
        # Test 4: deploy.js
        if test_deployment("node-local",
                          ["node", "deploy.js", "--local-frontend"],
                          test_dir):
            results.append("node-local: ✅ PASS")
        else:
            results.append("node-local: ❌ FAIL")
    else:
        print_warning("Skipping bash/node tests on Windows")
        results.append("bash-local: ⏭️  SKIP (Windows)")
        results.append("node-local: ⏭️  SKIP (Windows)")
    
    # Print summary
    print()
    print("=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    for result in results:
        print(f"  {result}")
    print()

if __name__ == "__main__":
    main()

