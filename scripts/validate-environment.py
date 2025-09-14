#!/usr/bin/env python3
"""
Canonical Environment Validation Script
========================================

This script validates the canonical environment configuration for the DRF-Next.js project.
It ensures that:
1. Docker environments use ONLY .env.docker from project root
2. All required variables are present
3. No conflicting environment files exist
4. Environment detection works correctly
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Set
import re

# Colors for output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'  # No Color

def print_colored(message: str, color: str):
    print(f"{color}{message}{Colors.NC}")

def print_success(message: str):
    print_colored(f"✅ {message}", Colors.GREEN)

def print_error(message: str):
    print_colored(f"❌ {message}", Colors.RED)

def print_warning(message: str):
    print_colored(f"⚠️  {message}", Colors.YELLOW)

def print_info(message: str):
    print_colored(f"ℹ️  {message}", Colors.BLUE)

def print_header(message: str):
    print_colored(f"\n{'='*60}", Colors.CYAN)
    print_colored(f"{message}", Colors.CYAN)
    print_colored(f"{'='*60}", Colors.CYAN)

class EnvironmentValidator:
    def __init__(self):
        self.project_root = Path(__file__).resolve().parent.parent
        self.errors: List[str] = []
        self.warnings: List[str] = []
        
        # Required variables for Docker environment
        self.required_docker_vars = {
            'IS_DOCKER': 'true',
            'DOCKER_ENV': 'true',
            'DJANGO_ENV': 'production',
            'POSTGRES_DB': None,
            'POSTGRES_USER': None,
            'POSTGRES_PASSWORD': None,
            'POSTGRES_HOST': 'pg',
            'REDIS_HOST': 'redis',
            'REDIS_PORT': '6379',
            'RABBITMQ_HOST': 'rabbitmq',
            'RABBITMQ_DEFAULT_USER': None,
            'RABBITMQ_DEFAULT_PASS': None,
            'SECRET_KEY': None,
            'NEXTAUTH_SECRET': None,
        }
        
        # Files that should NOT exist in Docker environment
        self.forbidden_docker_files = [
            'backend/.env.docker',
            'mailing/.env.docker',
            'frontend/.env.docker',
        ]

    def validate_docker_environment(self) -> bool:
        """Validate Docker environment configuration."""
        print_header("DOCKER ENVIRONMENT VALIDATION")
        
        success = True
        
        # Check for canonical .env.docker file
        docker_env_path = self.project_root / '.env.docker'
        if not docker_env_path.exists():
            self.errors.append("Canonical .env.docker file not found in project root")
            print_error("Canonical .env.docker file not found in project root")
            return False
        
        print_success("Found canonical .env.docker file")
        
        # Load and validate variables
        env_vars = self._load_env_file(docker_env_path)
        
        # Check required variables
        missing_vars = []
        incorrect_vars = []
        
        for var, expected_value in self.required_docker_vars.items():
            if var not in env_vars:
                missing_vars.append(var)
            elif expected_value and env_vars[var] != expected_value:
                incorrect_vars.append(f"{var}={env_vars[var]} (expected: {expected_value})")
        
        if missing_vars:
            self.errors.extend([f"Missing required variable: {var}" for var in missing_vars])
            print_error(f"Missing required variables: {', '.join(missing_vars)}")
            success = False
        else:
            print_success("All required variables present")
        
        if incorrect_vars:
            self.errors.extend([f"Incorrect variable: {var}" for var in incorrect_vars])
            print_error(f"Incorrect variables: {', '.join(incorrect_vars)}")
            success = False
        else:
            print_success("All required variables have correct values")
        
        # Check for forbidden files
        forbidden_found = []
        for forbidden_file in self.forbidden_docker_files:
            if (self.project_root / forbidden_file).exists():
                forbidden_found.append(forbidden_file)
        
        if forbidden_found:
            self.errors.extend([f"Forbidden file exists: {f}" for f in forbidden_found])
            print_error(f"Forbidden service-specific .env files found: {', '.join(forbidden_found)}")
            print_error("Remove these files - use only canonical .env.docker")
            success = False
        else:
            print_success("No forbidden service-specific .env files found")
        
        return success

    def validate_docker_compose(self) -> bool:
        """Validate docker-compose.yml configuration."""
        print_header("DOCKER-COMPOSE VALIDATION")
        
        compose_path = self.project_root / 'docker-compose.yml'
        if not compose_path.exists():
            self.errors.append("docker-compose.yml not found")
            print_error("docker-compose.yml not found")
            return False
        
        with open(compose_path, 'r') as f:
            compose_content = f.read()
        
        success = True
        
        # Check that all services use .env.docker
        if 'env_file:' in compose_content and '.env.docker' in compose_content:
            print_success("Services configured to use .env.docker")
        else:
            self.errors.append("Not all services configured to use .env.docker")
            print_error("Not all services configured to use .env.docker")
            success = False
        
        # Check for hardcoded values that should be variables
        hardcoded_patterns = [
            r'IS_DOCKER:\s*true',
            r'POSTGRES_DB:\s*[^$]',
            r'REDIS_HOST:\s*redis',
        ]
        
        hardcoded_found = []
        for pattern in hardcoded_patterns:
            if re.search(pattern, compose_content):
                hardcoded_found.append(pattern)
        
        if hardcoded_found:
            self.warnings.extend([f"Potential hardcoded value: {p}" for p in hardcoded_found])
            print_warning("Some values might be hardcoded instead of using variables")
        else:
            print_success("No obvious hardcoded values found")
        
        return success

    def validate_backend_config(self) -> bool:
        """Validate backend configuration files."""
        print_header("BACKEND CONFIGURATION VALIDATION")
        
        success = True
        
        # Check manage.py
        manage_py = self.project_root / 'backend' / 'manage.py'
        if manage_py.exists():
            with open(manage_py, 'r') as f:
                content = f.read()
            
            if 'root_dir / \'.env.docker\'' in content:
                print_success("manage.py configured for canonical .env.docker")
            else:
                self.errors.append("manage.py not configured for canonical .env.docker")
                print_error("manage.py not configured for canonical .env.docker")
                success = False
        
        # Check settings.py
        settings_py = self.project_root / 'backend' / 'config' / 'settings.py'
        if settings_py.exists():
            with open(settings_py, 'r') as f:
                content = f.read()
            
            if 'root_dir / ".env.docker"' in content:
                print_success("settings.py configured for canonical .env.docker")
            else:
                self.errors.append("settings.py not configured for canonical .env.docker")
                print_error("settings.py not configured for canonical .env.docker")
                success = False
        
        return success

    def _load_env_file(self, env_path: Path) -> Dict[str, str]:
        """Load environment variables from file."""
        env_vars = {}
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
        return env_vars

    def run_validation(self) -> bool:
        """Run complete validation."""
        print_header("CANONICAL ENVIRONMENT VALIDATION")
        print_info("Validating canonical Docker environment configuration...")
        
        all_success = True
        
        # Run all validations
        all_success &= self.validate_docker_environment()
        all_success &= self.validate_docker_compose()
        all_success &= self.validate_backend_config()
        
        # Print summary
        print_header("VALIDATION SUMMARY")
        
        if self.errors:
            print_error(f"Found {len(self.errors)} errors:")
            for error in self.errors:
                print_error(f"  - {error}")
        
        if self.warnings:
            print_warning(f"Found {len(self.warnings)} warnings:")
            for warning in self.warnings:
                print_warning(f"  - {warning}")
        
        if all_success and not self.errors:
            print_success("✨ All validations passed! Environment is correctly configured.")
            return True
        else:
            print_error("❌ Validation failed. Please fix the errors above.")
            return False

def main():
    """Main function."""
    validator = EnvironmentValidator()
    success = validator.run_validation()
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
