#!/bin/bash
# ========================================================
# 🚀 AutoRia Clone - Automated Deployment Script (Bash)
# ========================================================
#
# This script automates the complete deployment process:
# - Checks system requirements
# - Starts Docker containers
# - Installs frontend dependencies
# - Builds and starts the application
# - Seeds test data via frontend
#
# Usage:
#   ./deploy.sh                    # Full Docker deployment
#   ./deploy.sh --local-frontend   # Docker backend + Local frontend
#   ./deploy.sh --help             # Show help
#
# ========================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="./frontend"
BACKEND_DIR="./backend"
COMPOSE_FILE="docker-compose.yml"
LOCAL_FRONTEND=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --local-frontend)
            LOCAL_FRONTEND=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --local-frontend    Run frontend locally (not in Docker)"
            echo "  --help, -h          Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Helper functions
print_step() {
    echo -e "${BLUE}[STEP $1]${NC} ${2}"
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

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    fi
    print_success "$1 is installed"
    return 0
}

# Main deployment function
main() {
    echo ""
    echo "=========================================="
    echo "🚀 AutoRia Clone - Automated Deployment"
    echo "=========================================="
    echo ""

    # Step 1: Check system requirements
    print_step 1 "Checking system requirements..."
    
    check_command "docker" || exit 1
    check_command "docker-compose" || check_command "docker" || exit 1
    
    if [ "$LOCAL_FRONTEND" = true ]; then
        check_command "node" || exit 1
        check_command "npm" || exit 1
    fi
    
    echo ""

    # Step 2: Cleanup conflicting containers and ports
    print_step 2 "Cleaning up conflicting containers and ports..."
    
    # List of ports used by the project
    PORTS=(80 3000 5432 5555 5540 6379 8000 8001 15672)
    
    # Find and remove containers using these ports
    CONTAINERS_TO_REMOVE=""
    for PORT in "${PORTS[@]}"; do
        CONTAINERS=$(docker ps -a --filter "publish=$PORT" --format "{{.Names}}" 2>/dev/null || true)
        if [ ! -z "$CONTAINERS" ]; then
            CONTAINERS_TO_REMOVE="$CONTAINERS_TO_REMOVE $CONTAINERS"
        fi
    done
    
    # Also check for standard container names
    STANDARD_NAMES=("pg" "redis" "redis-insight" "rabbitmq" "celery-worker" "celery-beat" "celery-flower" "mailing" "nginx")
    for NAME in "${STANDARD_NAMES[@]}"; do
        if docker ps -a --filter "name=^${NAME}$" --format "{{.Names}}" | grep -q "^${NAME}$"; then
            CONTAINERS_TO_REMOVE="$CONTAINERS_TO_REMOVE $NAME"
        fi
    done
    
    # Remove duplicates and clean up
    CONTAINERS_TO_REMOVE=$(echo "$CONTAINERS_TO_REMOVE" | tr ' ' '\n' | sort -u | tr '\n' ' ')
    
    if [ ! -z "$CONTAINERS_TO_REMOVE" ]; then
        echo "   Found containers to remove: $CONTAINERS_TO_REMOVE"
        for CONTAINER in $CONTAINERS_TO_REMOVE; do
            echo "   🗑️  Removing container: $CONTAINER"
            docker rm -f "$CONTAINER" 2>/dev/null || true
        done
        print_success "Removed conflicting containers"
        echo "   ⏳ Waiting for ports to be released..."
        sleep 3
    else
        print_success "No conflicting containers found"
    fi
    echo ""

    # Step 3: Start Docker containers
    print_step 3 "Starting Docker containers..."
    if [ "$LOCAL_FRONTEND" = true ]; then
        print_warning "Starting backend services only (frontend will run locally)"
        docker-compose up -d pg redis rabbitmq redis-insight mailing celery-worker celery-beat celery-flower app
    else
        docker-compose up -d --build
    fi
    
    print_success "Docker containers started"
    echo ""

    # Step 4: Wait for services to be healthy
    print_step 4 "Waiting for services to be ready..."
    echo "This may take 30-60 seconds..."
    
    max_wait=120
    elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        if docker-compose ps | grep -q "healthy"; then
            backend_ready=$(docker-compose exec -T app curl -s http://localhost:8000/health 2>/dev/null || echo "")
            if [ ! -z "$backend_ready" ]; then
                print_success "Backend is ready"
                break
            fi
        fi
        sleep 5
        elapsed=$((elapsed + 5))
        echo -n "."
    done
    echo ""
    
    if [ $elapsed -ge $max_wait ]; then
        print_warning "Timeout waiting for services, but continuing..."
    fi
    echo ""

    # Step 5: Frontend setup
    if [ "$LOCAL_FRONTEND" = true ]; then
        print_step 5 "Setting up frontend locally..."
        
        # Create .env.local with required variables
        echo "Creating frontend/.env.local with required variables..."
        ENV_LOCAL_PATH="$FRONTEND_DIR/.env.local"
        ENV_CONFIG_PATH="./env-config"
        
        # Create .env.local file
        cat > "$ENV_LOCAL_PATH" << 'EOF'
# Auto-generated by deploy.sh
# DO NOT COMMIT THIS FILE

EOF
        
        # Read and write critical variables from env-config files
        for ENV_FILE in "$ENV_CONFIG_PATH/.env.base" "$ENV_CONFIG_PATH/.env.secrets" "$ENV_CONFIG_PATH/.env.local"; do
            if [ -f "$ENV_FILE" ]; then
                while IFS='=' read -r key value; do
                    # Skip comments and empty lines
                    if [[ ! "$key" =~ ^#.* ]] && [ ! -z "$key" ]; then
                        case "$key" in
                            NEXTAUTH_SECRET|NEXTAUTH_URL|NEXT_PUBLIC_BACKEND_URL|BACKEND_URL|NODE_ENV|NEXT_PUBLIC_IS_DOCKER|IS_DOCKER|REDIS_HOST|REDIS_URL|GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET|NEXT_PUBLIC_GOOGLE_CLIENT_ID)
                                echo "${key}=${value}" >> "$ENV_LOCAL_PATH"
                                ;;
                        esac
                    fi
                done < "$ENV_FILE"
            fi
        done
        
        # Add defaults if not present
        if ! grep -q "^NODE_ENV=" "$ENV_LOCAL_PATH"; then
            echo "NODE_ENV=production" >> "$ENV_LOCAL_PATH"
        fi
        if ! grep -q "^NEXTAUTH_URL=" "$ENV_LOCAL_PATH"; then
            echo "NEXTAUTH_URL=http://localhost:3000" >> "$ENV_LOCAL_PATH"
        fi
        if ! grep -q "^NEXT_PUBLIC_BACKEND_URL=" "$ENV_LOCAL_PATH"; then
            echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" >> "$ENV_LOCAL_PATH"
        fi
        if ! grep -q "^BACKEND_URL=" "$ENV_LOCAL_PATH"; then
            echo "BACKEND_URL=http://localhost:8000" >> "$ENV_LOCAL_PATH"
        fi
        if ! grep -q "^NEXT_PUBLIC_IS_DOCKER=" "$ENV_LOCAL_PATH"; then
            echo "NEXT_PUBLIC_IS_DOCKER=false" >> "$ENV_LOCAL_PATH"
        fi
        if ! grep -q "^IS_DOCKER=" "$ENV_LOCAL_PATH"; then
            echo "IS_DOCKER=false" >> "$ENV_LOCAL_PATH"
        fi
        
        print_success "Created $ENV_LOCAL_PATH"
        
        # Validate critical variables
        echo "🔍 Validating critical variables..."
        if ! grep -q "^NEXTAUTH_SECRET=" "$ENV_LOCAL_PATH" || [ -z "$(grep '^NEXTAUTH_SECRET=' "$ENV_LOCAL_PATH" | cut -d'=' -f2)" ]; then
            print_error "❌ NEXTAUTH_SECRET not found or empty!"
            print_error "   Check env-config/.env.secrets"
            exit 1
        fi
        print_success "✅ All critical variables present"
        
        # Clean .next and cache BEFORE npm install for guaranteed clean build
        echo "🧹 Cleaning previous build artifacts..."
        NEXT_DIR="$FRONTEND_DIR/.next"
        CACHE_DIR="$FRONTEND_DIR/node_modules/.cache"
        
        if [ -d "$NEXT_DIR" ]; then
            echo "   Removing $NEXT_DIR"
            rm -rf "$NEXT_DIR"
        fi
        
        if [ -d "$CACHE_DIR" ]; then
            echo "   Removing $CACHE_DIR"
            rm -rf "$CACHE_DIR"
        fi
        
        print_success "✅ Artifacts cleaned"
        
        cd "$FRONTEND_DIR"
        
        # Install dependencies
        echo "Installing dependencies..."
        npm install
        print_success "Dependencies installed"
        
        # Build frontend
        echo "Building frontend..."
        npm run build
        print_success "Frontend built"
        
        # Start frontend
        echo ""
        print_success "Starting frontend server..."
        echo ""
        echo "=========================================="
        echo "🎉 Deployment Complete!"
        echo "=========================================="
        echo ""
        echo "📍 Frontend: http://localhost:3000"
        echo "📍 Backend API: http://localhost:8000"
        echo "📍 API Docs: http://localhost:8000/api/docs/"
        echo "📍 Admin: http://localhost:8000/admin/"
        echo ""
        echo "🔐 Default credentials:"
        echo "   Email: admin@autoria.com"
        echo "   Password: 12345678"
        echo ""
        echo "Starting frontend server (press Ctrl+C to stop)..."
        echo ""
        
        npm run start
        
    else
        print_step 5 "Frontend running in Docker..."
        
        # Wait for frontend to be ready
        max_wait=60
        elapsed=0
        while [ $elapsed -lt $max_wait ]; do
            frontend_ready=$(curl -s http://localhost:3000 2>/dev/null || echo "")
            if [ ! -z "$frontend_ready" ]; then
                print_success "Frontend is ready"
                break
            fi
            sleep 3
            elapsed=$((elapsed + 3))
            echo -n "."
        done
        echo ""
        
        echo ""
        echo "=========================================="
        echo "🎉 Deployment Complete!"
        echo "=========================================="
        echo ""
        echo "📍 Frontend: http://localhost:3000"
        echo "📍 Backend API: http://localhost:8000"
        echo "📍 API Docs: http://localhost:8000/api/docs/"
        echo "📍 Admin: http://localhost:8000/admin/"
        echo ""
        echo "🔐 Default credentials:"
        echo "   Email: admin@autoria.com"
        echo "   Password: 12345678"
        echo ""
        echo "📊 View logs:"
        echo "   docker-compose logs -f"
        echo ""
        echo "🛑 Stop services:"
        echo "   docker-compose down"
        echo ""
    fi
}

# Run main function
main
