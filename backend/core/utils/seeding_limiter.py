"""
Seeding limiter utility to prevent auto-generation from exceeding configured limits.
Provides hard limits enforcement for seeding operations.
"""

import os
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from pathlib import Path

from config.extra_config.constants_config import SEEDING_CONFIG
from .seeding_tracker import seeding_tracker


class SeedingLimiter:
    """
    Enforces seeding limits to prevent auto-generation from exceeding configured limits.
    Provides both hard limits and cooldown period enforcement.
    """
    
    def __init__(self):
        """Initialize the seeding limiter with configuration."""
        self.config = SEEDING_CONFIG
        self.tracker = seeding_tracker
        
        # Initialize daily counter
        if os.name == 'nt':  # Windows
            self._daily_counter_file = Path("C:/temp/seeding_daily_counter.json")
        else:  # Unix/Linux
            self._daily_counter_file = Path("/tmp/seeding_daily_counter.json")
        
        self._ensure_daily_counter()
    
    def _ensure_daily_counter(self):
        """Ensure daily counter file exists."""
        try:
            if not self._daily_counter_file.exists():
                self._reset_daily_counter()
        except OSError:
            # Fallback to backend directory if temp directory is not writable
            base_dir = Path(__file__).resolve().parent.parent.parent
            self._daily_counter_file = base_dir / "media" / "seeding_daily_counter.json"
            if not self._daily_counter_file.exists():
                self._reset_daily_counter()
    
    def _reset_daily_counter(self):
        """Reset daily counter for new day."""
        today = datetime.now().strftime("%Y-%m-%d")
        counter_data = {
            "date": today,
            "ads_generated": 0,
            "images_generated": 0,
            "last_reset": datetime.now().isoformat()
        }
        import json
        with open(self._daily_counter_file, 'w') as f:
            json.dump(counter_data, f, indent=2)
    
    def _get_daily_counter(self) -> Dict:
        """Get current daily counter, reset if new day."""
        import json
        
        try:
            with open(self._daily_counter_file, 'r') as f:
                counter = json.load(f)
            
            today = datetime.now().strftime("%Y-%m-%d")
            if counter.get("date") != today:
                self._reset_daily_counter()
                return self._get_daily_counter()
            
            return counter
        except (FileNotFoundError, json.JSONDecodeError):
            self._reset_daily_counter()
            return self._get_daily_counter()
    
    def _update_daily_counter(self, ads: int = 0, images: int = 0):
        """Update daily counter with new generation counts."""
        import json
        
        counter = self._get_daily_counter()
        counter["ads_generated"] += ads
        counter["images_generated"] += images
        counter["last_updated"] = datetime.now().isoformat()
        
        with open(self._daily_counter_file, 'w') as f:
            json.dump(counter, f, indent=2)
    
    def check_auto_generation_enabled(self) -> Tuple[bool, str]:
        """
        Check if auto-generation is enabled in configuration.
        
        Returns:
            Tuple[bool, str]: (allowed, reason_if_not_allowed)
        """
        if not self.config.get('ENABLE_AUTO_GENERATION', False):
            return False, "Auto-generation is disabled in configuration (SEEDING_ENABLE_AUTO_GENERATION=false)"
        
        return True, "Auto-generation is enabled"
    
    def check_image_generation_enabled(self) -> Tuple[bool, str]:
        """
        Check if image generation is enabled in configuration.
        
        Returns:
            Tuple[bool, str]: (allowed, reason_if_not_allowed)
        """
        if not self.config.get('ENABLE_IMAGE_GENERATION', False):
            return False, "Image generation is disabled in configuration (SEEDING_ENABLE_IMAGE_GENERATION=false)"
        
        return True, "Image generation is enabled"
    
    def check_daily_limits(self, ads_to_generate: int = 0, images_to_generate: int = 0) -> Tuple[bool, str]:
        """
        Check if daily generation limits would be exceeded.
        
        Args:
            ads_to_generate: Number of ads planned to generate
            images_to_generate: Number of images planned to generate
            
        Returns:
            Tuple[bool, str]: (allowed, reason_if_not_allowed)
        """
        counter = self._get_daily_counter()
        max_daily = self.config.get('MAX_DAILY_GENERATIONS', 100)
        
        current_ads = counter.get("ads_generated", 0)
        current_images = counter.get("images_generated", 0)
        
        new_total_ads = current_ads + ads_to_generate
        new_total_images = current_images + images_to_generate
        
        if new_total_ads > max_daily:
            return False, f"Daily ads limit would be exceeded: {new_total_ads} > {max_daily} (current: {current_ads})"
        
        max_images_per_ad = self.config.get('MAX_IMAGES_PER_AD', 10)
        if images_to_generate > max_images_per_ad:
            return False, f"Images per ad limit exceeded: {images_to_generate} > {max_images_per_ad}"
        
        return True, f"Daily limits check passed (ads: {current_ads}/{max_daily}, images: {current_images})"
    
    def check_cooldown_period(self, last_operation_time: Optional[str] = None) -> Tuple[bool, str]:
        """
        Check if cooldown period has passed since last operation.
        
        Args:
            last_operation_time: ISO timestamp of last operation
            
        Returns:
            Tuple[bool, str]: (allowed, reason_if_not_allowed)
        """
        cooldown_minutes = self.config.get('COOLDOWN_PERIOD_MINUTES', 5)
        
        if cooldown_minutes <= 0:
            return True, "No cooldown period configured"
        
        if not last_operation_time:
            return True, "No previous operation found"
        
        try:
            last_time = datetime.fromisoformat(last_operation_time.replace('Z', '+00:00'))
            now = datetime.now()
            
            if now.tzinfo is None:
                now = now.replace(tzinfo=last_time.tzinfo)
            
            time_diff = now - last_time
            cooldown_seconds = cooldown_minutes * 60
            
            if time_diff.total_seconds() < cooldown_seconds:
                remaining_seconds = cooldown_seconds - time_diff.total_seconds()
                remaining_minutes = remaining_seconds / 60
                return False, f"Cooldown period active: wait {remaining_minutes:.1f} more minutes"
            
            return True, f"Cooldown period passed ({time_diff.total_seconds():.0f}s ago)"
            
        except (ValueError, TypeError) as e:
            return True, f"Could not parse cooldown time: {e}, allowing operation"
    
    def check_per_run_limits(self, current_count: int, planned_count: int) -> Tuple[bool, str]:
        """
        Check if per-run generation limits would be exceeded.
        
        Args:
            current_count: Number of items already generated in current run
            planned_count: Number of items planned to generate
            
        Returns:
            Tuple[bool, str]: (allowed, reason_if_not_allowed)
        """
        max_per_run = self.config.get('MAX_ADS_PER_RUN', 50)
        new_total = current_count + planned_count
        
        if new_total > max_per_run:
            return False, f"Per-run limit would be exceeded: {new_total} > {max_per_run} (current: {current_count})"
        
        return True, f"Per-run limits check passed ({current_count}/{max_per_run})"
    
    def can_generate_ads(self, count: int = 1, check_cooldown: bool = True) -> Tuple[bool, str]:
        """
        Comprehensive check if ads can be generated.
        
        Args:
            count: Number of ads to generate
            check_cooldown: Whether to check cooldown period
            
        Returns:
            Tuple[bool, str]: (allowed, reason_if_not_allowed)
        """
        # Check auto-generation enabled
        allowed, reason = self.check_auto_generation_enabled()
        if not allowed:
            return False, reason
        
        # Check daily limits
        allowed, reason = self.check_daily_limits(ads_to_generate=count)
        if not allowed:
            return False, reason
        
        # Check per-run limits (get current run count from tracker)
        status = self.tracker.get_seeding_status()
        current_running = status["overview"].get("running", 0)
        allowed, reason = self.check_per_run_limits(current_running, count)
        if not allowed:
            return False, reason
        
        # Check cooldown period
        if check_cooldown:
            operations = status.get("operations", {})
            last_completed_time = None
            
            for op in operations.values():
                if op.get("status") == "completed":
                    last_completed_time = op.get("completed_at")
                    break
            
            allowed, reason = self.check_cooldown_period(last_completed_time)
            if not allowed:
                return False, reason
        
        return True, "All checks passed - can generate ads"
    
    def can_generate_images(self, count: int = 1) -> Tuple[bool, str]:
        """
        Comprehensive check if images can be generated.
        
        Args:
            count: Number of images to generate
            
        Returns:
            Tuple[bool, str]: (allowed, reason_if_not_allowed)
        """
        # Check image generation enabled
        allowed, reason = self.check_image_generation_enabled()
        if not allowed:
            return False, reason
        
        # Check daily limits for images
        allowed, reason = self.check_daily_limits(images_to_generate=count)
        if not allowed:
            return False, reason
        
        # Check per-ad image limit
        max_images_per_ad = self.config.get('MAX_IMAGES_PER_AD', 10)
        if count > max_images_per_ad:
            return False, f"Images per ad limit exceeded: {count} > {max_images_per_ad}"
        
        return True, "Image generation checks passed"
    
    def record_generation(self, ads: int = 0, images: int = 0):
        """
        Record successful generation to update counters.
        
        Args:
            ads: Number of ads generated
            images: Number of images generated
        """
        self._update_daily_counter(ads, images)
    
    def get_status(self) -> Dict:
        """
        Get current limiter status.
        
        Returns:
            Dict with current limits and usage
        """
        counter = self._get_daily_counter()
        status = self.tracker.get_seeding_status()
        
        return {
            "config": self.config,
            "daily_usage": {
                "ads_generated": counter.get("ads_generated", 0),
                "images_generated": counter.get("images_generated", 0),
                "max_daily": self.config.get('MAX_DAILY_GENERATIONS', 100),
                "date": counter.get("date"),
                "last_updated": counter.get("last_updated")
            },
            "current_run": {
                "running_operations": status["overview"].get("running", 0),
                "max_per_run": self.config.get('MAX_ADS_PER_RUN', 50)
            },
            "limits_status": {
                "auto_generation_enabled": self.config.get('ENABLE_AUTO_GENERATION', False),
                "image_generation_enabled": self.config.get('ENABLE_IMAGE_GENERATION', False),
                "cooldown_minutes": self.config.get('COOLDOWN_PERIOD_MINUTES', 5)
            }
        }


# Global instance
seeding_limiter = SeedingLimiter()
