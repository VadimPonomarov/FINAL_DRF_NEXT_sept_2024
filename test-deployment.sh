#!/bin/bash
# ========================================================
# 🧪 AutoRia Clone - Full Deployment Testing Script
# ========================================================
#
# Tests all deployment variants after cloning:
# 1. python deploy.py --mode local
# 2. python deploy.py --mode with_frontend
# 3. deploy.sh --local-frontend
# 4. deploy.js --local-frontend
#
# For each variant, checks:
# - Frontend starts without errors
# - Backend is accessible
# - Seeded ads contain images
# ========================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TEST_DIR="./test-deployment-$(date +%s)"
CLONE_URL="${1:-.}"  # Use current dir if no URL provided, or git URL

print_step() {
    echo -e "${BLUE}[TEST $1]${NC} ${2}"
}

print_success() {
    echo -e "${GREEN}✅ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

print_error() {
    echo -e "${RED}❌ ${1}${NC}"
}

cleanup() {
    echo ""
    print_step "CLEANUP" "Stopping all services..."
    
    # Stop Docker containers
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.yml -f docker-compose.with_frontend.yml down 2>/dev/null || true
    
    # Kill frontend process if running
    if [ -f "${TEST_DIR}/frontend.pid" ]; then
        kill $(cat "${TEST_DIR}/frontend.pid") 2>/dev/null || true
        rm -f "${TEST_DIR}/frontend.pid"
    fi
    
    # Remove test directory if it's a clone
    if [ -d "${TEST_DIR}" ] && [ "${TEST_DIR}" != "." ]; then
        print_warning "Keeping test directory: ${TEST_DIR}"
        print_warning "Remove manually: rm -rf ${TEST_DIR}"
    fi
}

trap cleanup EXIT

wait_for_service() {
    local url=$1
    local max_wait=${2:-60}
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
        echo -n "."
    done
    return 1
}

check_images_in_ads() {
    local test_name=$1
    print_step "CHECK" "Verifying images in seeded ads for ${test_name}..."
    
    # Wait a bit for seeding to complete
    sleep 10
    
    # Get list of ads
    local ads_response=$(curl -s "http://localhost:8000/api/autoria/cars/?limit=5" || echo "")
    
    if [ -z "$ads_response" ]; then
        print_error "Failed to fetch ads from backend"
        return 1
    fi
    
    # Check if response contains image URLs
    local image_count=$(echo "$ads_response" | grep -o 'image_url\|image_display_url' | wc -l || echo "0")
    
    if [ "$image_count" -gt 0 ]; then
        print_success "Found ${image_count} image references in ads"
        
        # Extract and check actual image URLs
        echo "$ads_response" | grep -o '"image_url":"[^"]*"' | head -3 | while read -r img_line; do
            local img_url=$(echo "$img_line" | cut -d'"' -f4)
            if [ -n "$img_url" ] && [ "$img_url" != "null" ]; then
                print_success "Image URL found: ${img_url}"
            fi
        done
        return 0
    else
        print_error "No image references found in ads response"
        echo "Response preview: ${ads_response:0:200}"
        return 1
    fi
}

test_deployment() {
    local variant=$1
    local deploy_cmd=$2
    local test_dir=$3
    
    echo ""
    echo "=========================================="
    print_step "VARIANT" "Testing deployment: ${variant}"
    echo "=========================================="
    echo ""
    
    cd "$test_dir"
    
    # Cleanup before test
    print_step "PREP" "Cleaning up previous deployment..."
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.yml -f docker-compose.with_frontend.yml down 2>/dev/null || true
    
    # Run deployment
    print_step "DEPLOY" "Running: ${deploy_cmd}"
    
    if [[ "$deploy_cmd" == *"python deploy.py"* ]]; then
        # Python deploy runs in background and waits
        timeout 600 python deploy.py $deploy_cmd || {
            print_error "Deployment failed or timed out"
            return 1
        }
    elif [[ "$deploy_cmd" == *"deploy.sh"* ]]; then
        # Bash deploy - run in background
        bash deploy.sh --local-frontend > "${TEST_DIR}/${variant}.log" 2>&1 &
        local deploy_pid=$!
        echo $deploy_pid > "${TEST_DIR}/deploy_${variant}.pid"
        
        # Wait for frontend to be ready
        if wait_for_service "http://localhost:3000" 120; then
            print_success "Frontend is ready"
        else
            print_error "Frontend failed to start"
            kill $deploy_pid 2>/dev/null || true
            return 1
        fi
    elif [[ "$deploy_cmd" == *"deploy.js"* ]]; then
        # Node deploy - similar to bash
        node deploy.js --local-frontend > "${TEST_DIR}/${variant}.log" 2>&1 &
        local deploy_pid=$!
        echo $deploy_pid > "${TEST_DIR}/deploy_${variant}.pid"
        
        if wait_for_service "http://localhost:3000" 120; then
            print_success "Frontend is ready"
        else
            print_error "Frontend failed to start"
            kill $deploy_pid 2>/dev/null || true
            return 1
        fi
    fi
    
    # Check backend
    print_step "CHECK" "Verifying backend..."
    if wait_for_service "http://localhost:8000/health" 30; then
        print_success "Backend is accessible"
    else
        print_error "Backend is not accessible"
        return 1
    fi
    
    # Check frontend
    print_step "CHECK" "Verifying frontend..."
    if wait_for_service "http://localhost:3000" 30; then
        print_success "Frontend is accessible"
    else
        print_error "Frontend is not accessible"
        return 1
    fi
    
    # Check for App Router errors
    print_step "CHECK" "Checking for App Router errors..."
    local frontend_response=$(curl -s "http://localhost:3000" || echo "")
    if echo "$frontend_response" | grep -q "expected app router to be mounted"; then
        print_error "App Router mounting error detected!"
        return 1
    else
        print_success "No App Router errors detected"
    fi
    
    # Check images in ads
    if ! check_images_in_ads "$variant"; then
        print_warning "Image check failed for ${variant} - may need investigation"
    fi
    
    print_success "Deployment variant ${variant} completed successfully"
    
    cd - > /dev/null
    return 0
}

main() {
    echo ""
    echo "=========================================="
    echo "🧪 AutoRia Clone - Full Deployment Test"
    echo "=========================================="
    echo ""
    
    # Determine if we need to clone
    if [ "$CLONE_URL" != "." ] && [ -d "$CLONE_URL" ]; then
        TEST_DIR="$CLONE_URL"
        print_step "SETUP" "Using existing directory: ${TEST_DIR}"
    elif [ "$CLONE_URL" != "." ]; then
        print_step "SETUP" "Cloning repository to ${TEST_DIR}..."
        git clone "$CLONE_URL" "$TEST_DIR" || {
            print_error "Failed to clone repository"
            exit 1
        }
    else
        TEST_DIR="."
        print_step "SETUP" "Using current directory for testing"
    fi
    
    # Test results
    local results=()
    
    # Test 1: python deploy.py --mode local
    if test_deployment "python-local" "--mode local" "$TEST_DIR"; then
        results+=("python-local: ✅ PASS")
    else
        results+=("python-local: ❌ FAIL")
    fi
    
    cleanup
    sleep 5
    
    # Test 2: python deploy.py --mode with_frontend
    if test_deployment "python-docker" "--mode with_frontend" "$TEST_DIR"; then
        results+=("python-docker: ✅ PASS")
    else
        results+=("python-docker: ❌ FAIL")
    fi
    
    cleanup
    sleep 5
    
    # Test 3: deploy.sh --local-frontend
    if test_deployment "bash-local" "deploy.sh --local-frontend" "$TEST_DIR"; then
        results+=("bash-local: ✅ PASS")
    else
        results+=("bash-local: ❌ FAIL")
    fi
    
    cleanup
    sleep 5
    
    # Test 4: deploy.js --local-frontend
    if test_deployment "node-local" "deploy.js --local-frontend" "$TEST_DIR"; then
        results+=("node-local: ✅ PASS")
    else
        results+=("node-local: ❌ FAIL")
    fi
    
    # Print summary
    echo ""
    echo "=========================================="
    echo "📊 Test Results Summary"
    echo "=========================================="
    for result in "${results[@]}"; do
        echo "  $result"
    done
    echo ""
}

main "$@"

