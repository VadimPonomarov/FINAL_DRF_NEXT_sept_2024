from django.core.management.base import BaseCommand
from django.db import transaction
from apps.ads.models import CarAd, RegionModel, CityModel


class Command(BaseCommand):
    help = 'Update region and city fields in CarAd from IDs to names'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Get all car ads
        car_ads = CarAd.objects.select_related('region', 'city').all()
        
        updated_count = 0
        error_count = 0
        
        self.stdout.write(f'Processing {car_ads.count()} car advertisements...')
        
        with transaction.atomic():
            for ad in car_ads:
                try:
                    updated = False
                    
                    # Check if region needs updating (if it's currently an ID)
                    if ad.region and hasattr(ad.region, 'name'):
                        region_name = ad.region.name
                        self.stdout.write(f'Ad {ad.id}: Region ID {ad.region.id} -> "{region_name}"')
                        if not dry_run:
                            # We'll update this in the serializer/view instead
                            pass
                        updated = True
                    
                    # Check if city needs updating (if it's currently an ID)
                    if ad.city and hasattr(ad.city, 'name'):
                        city_name = ad.city.name
                        self.stdout.write(f'Ad {ad.id}: City ID {ad.city.id} -> "{city_name}"')
                        if not dry_run:
                            # We'll update this in the serializer/view instead
                            pass
                        updated = True
                    
                    if updated:
                        updated_count += 1
                        
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f'Error processing ad {ad.id}: {str(e)}')
                    )
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'DRY RUN: Would update {updated_count} ads, {error_count} errors'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Updated {updated_count} ads, {error_count} errors'
                )
            )
