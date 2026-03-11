"""
Management command to check current seeding limits and status.
"""
from django.core.management.base import BaseCommand
from core.utils.seeding_limiter import seeding_limiter


class Command(BaseCommand):
    help = 'Check current seeding limits and generation status'

    def handle(self, *args, **options):
        self.stdout.write("Checking seeding limits and status...")
        
        # Get limiter status
        status = seeding_limiter.get_status()
        
        # Display configuration
        config = status["config"]
        self.stdout.write("\nConfiguration:")
        self.stdout.write(f"   Max ads per run: {config.get('MAX_ADS_PER_RUN', 50)}")
        self.stdout.write(f"   Max images per ad: {config.get('MAX_IMAGES_PER_AD', 10)}")
        self.stdout.write(f"   Max daily generations: {config.get('MAX_DAILY_GENERATIONS', 100)}")
        self.stdout.write(f"   Cooldown period: {config.get('COOLDOWN_PERIOD_MINUTES', 5)} minutes")
        self.stdout.write(f"   Auto-generation enabled: {config.get('ENABLE_AUTO_GENERATION', False)}")
        self.stdout.write(f"   Image generation enabled: {config.get('ENABLE_IMAGE_GENERATION', False)}")
        
        # Display daily usage
        daily = status["daily_usage"]
        self.stdout.write(f"\nDaily Usage ({daily.get('date', 'Unknown')}):")
        self.stdout.write(f"   Ads generated: {daily.get('ads_generated', 0)}/{daily.get('max_daily', 100)}")
        self.stdout.write(f"   Images generated: {daily.get('images_generated', 0)}")
        self.stdout.write(f"   Last updated: {daily.get('last_updated', 'Never')}")
        
        # Display current run status
        current = status["current_run"]
        self.stdout.write(f"\nCurrent Run:")
        self.stdout.write(f"   Running operations: {current.get('running_operations', 0)}/{current.get('max_per_run', 50)}")
        
        # Display limits status
        limits = status["limits_status"]
        self.stdout.write(f"\nLimits Status:")
        enabled_text = "Enabled" if limits.get('auto_generation_enabled') else "Disabled"
        self.stdout.write(f"   Auto-generation: {enabled_text}")
        enabled_text = "Enabled" if limits.get('image_generation_enabled') else "Disabled"
        self.stdout.write(f"   Image generation: {enabled_text}")
        self.stdout.write(f"   Cooldown: {limits.get('cooldown_minutes', 5)} minutes")
        
        # Test current permissions
        self.stdout.write(f"\nPermission Tests:")
        
        # Test ad generation
        can_generate, reason = seeding_limiter.can_generate_ads(1)
        status_text = "ALLOWED" if can_generate else "BLOCKED"
        self.stdout.write(f"   Can generate 1 ad: {status_text} - {reason}")
        
        # Test image generation
        can_generate_images, images_reason = seeding_limiter.can_generate_images(3)
        status_text = "ALLOWED" if can_generate_images else "BLOCKED"
        self.stdout.write(f"   Can generate 3 images: {status_text} - {images_reason}")
        
        # Warnings if limits are approached
        ads_usage_percent = (daily.get('ads_generated', 0) / daily.get('max_daily', 100)) * 100
        if ads_usage_percent > 80:
            self.stdout.write(
                self.style.WARNING(f"\nWARNING: Daily ad usage is {ads_usage_percent:.1f}% ({daily.get('ads_generated', 0)}/{daily.get('max_daily', 100)})")
            )
        
        if current.get('running_operations', 0) > current.get('max_per_run', 50) * 0.8:
            run_usage_percent = (current.get('running_operations', 0) / current.get('max_per_run', 50)) * 100
            self.stdout.write(
                self.style.WARNING(f"WARNING: Current run usage is {run_usage_percent:.1f}% ({current.get('running_operations', 0)}/{current.get('max_per_run', 50)})")
            )
        
        self.stdout.write("\nSeeding limits check completed")
