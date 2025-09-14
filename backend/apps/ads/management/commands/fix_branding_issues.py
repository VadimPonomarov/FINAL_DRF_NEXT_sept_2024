"""
Management command to fix branding issues in existing car advertisements.
Identifies and regenerates images for ads with incorrect brand-vehicle type combinations.
"""
import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.ads.models import CarAd, AddImageModel
from apps.ads.models.reference import CarMarkModel

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fix branding issues in existing car advertisements by regenerating problematic images'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Maximum number of ads to process (default: 50)'
        )
        parser.add_argument(
            '--regenerate-images',
            action='store_true',
            help='Regenerate images for problematic ads'
        )

    def handle(self, *args, **options):
        """Main command handler."""
        dry_run = options['dry_run']
        limit = options['limit']
        regenerate_images = options['regenerate_images']
        
        self.stdout.write('🔍 Analyzing car advertisements for branding issues...')
        
        # Define brand categories
        automotive_brands = [
            'bmw', 'mercedes-benz', 'mercedes', 'audi', 'toyota', 'honda', 'ford', 
            'volkswagen', 'vw', 'nissan', 'hyundai', 'kia', 'mazda', 'subaru', 
            'mitsubishi', 'lexus', 'infiniti', 'acura', 'volvo', 'peugeot', 
            'renault', 'citroen', 'fiat', 'alfa romeo', 'skoda', 'seat', 'opel', 
            'jaguar', 'land rover', 'mini', 'smart', 'porsche'
        ]
        
        special_equipment_brands = [
            'atlas', 'caterpillar', 'cat', 'komatsu', 'liebherr', 'hitachi', 
            'kobelco', 'doosan', 'case', 'new holland', 'jcb', 'bobcat', 'kubota', 
            'john deere', 'claas', 'atlas copco', 'volvo construction', 
            'hyundai construction', 'takeuchi', 'yanmar', 'wacker neuson', 
            'bomag', 'dynapac', 'hamm', 'wirtgen', 'vogele', 'kleemann', 
            'benninghoven', 'terex', 'grove', 'manitowoc', 'tadano', 'demag', 
            'sany', 'xcmg', 'zoomlion', 'liugong', 'lonking', 'sdlg', 'shantui'
        ]
        
        # Find problematic ads
        problematic_ads = []
        total_ads = CarAd.objects.count()
        
        self.stdout.write(f'📊 Analyzing {total_ads} car advertisements...')
        
        for ad in CarAd.objects.select_related('mark').all()[:limit]:
            brand_name = ad.mark.name.lower() if ad.mark else 'unknown'
            vehicle_type = self._get_vehicle_type_from_ad(ad)
            
            issue_type = self._detect_branding_issue(brand_name, vehicle_type, automotive_brands, special_equipment_brands)
            
            if issue_type:
                problematic_ads.append({
                    'ad': ad,
                    'brand': brand_name,
                    'vehicle_type': vehicle_type,
                    'issue': issue_type,
                    'images_count': ad.images.count()
                })
        
        self.stdout.write(f'🚨 Found {len(problematic_ads)} ads with branding issues:')
        
        for item in problematic_ads:
            ad = item['ad']
            self.stdout.write(
                f'  - Ad #{ad.id}: {item["brand"]} ({item["vehicle_type"]}) - {item["issue"]} - {item["images_count"]} images'
            )
        
        if dry_run:
            self.stdout.write('🔍 DRY RUN: No changes made. Use --regenerate-images to fix these issues.')
            return
        
        if regenerate_images and problematic_ads:
            self.stdout.write(f'🔧 Regenerating images for {len(problematic_ads)} problematic ads...')
            self._regenerate_images_for_ads(problematic_ads)
        
        self.stdout.write('✅ Branding analysis completed!')

    def _get_vehicle_type_from_ad(self, ad):
        """Extract vehicle type from ad data."""
        # Try to get from dynamic_fields first
        if hasattr(ad, 'dynamic_fields') and ad.dynamic_fields:
            vehicle_type = ad.dynamic_fields.get('vehicle_type_name') or ad.dynamic_fields.get('vehicle_type')
            if vehicle_type:
                return vehicle_type.lower()
        
        # Try to infer from body_type
        body_type = ad.dynamic_fields.get('body_type', '').lower() if ad.dynamic_fields else ''
        
        if any(x in body_type for x in ['truck', 'грузов', 'тягач']):
            return 'truck'
        elif any(x in body_type for x in ['bus', 'автобус']):
            return 'bus'
        elif any(x in body_type for x in ['motorcycle', 'мотоцикл']):
            return 'motorcycle'
        elif any(x in body_type for x in ['trailer', 'прицеп']):
            return 'trailer'
        elif any(x in body_type for x in ['special', 'спец', 'экскаватор', 'кран']):
            return 'special'
        else:
            return 'car'  # default

    def _detect_branding_issue(self, brand_name, vehicle_type, automotive_brands, special_equipment_brands):
        """Detect if there's a branding issue with this combination."""
        if not brand_name or brand_name == 'unknown':
            return None  # No issue with unknown brands
        
        vehicle_type_lower = vehicle_type.lower()
        
        # Check for special equipment brand on passenger vehicle
        if brand_name in special_equipment_brands and vehicle_type_lower in ['car', 'passenger', 'sedan', 'hatchback', 'suv', 'crossover', 'coupe', 'convertible', 'wagon', 'minivan']:
            return f"Special equipment brand '{brand_name}' on passenger vehicle"
        
        # Check for automotive brand on special equipment
        if brand_name in automotive_brands and vehicle_type_lower in ['special', 'construction', 'industrial', 'excavator', 'bulldozer', 'crane', 'loader', 'tractor', 'agricultural']:
            return f"Automotive brand '{brand_name}' on special equipment"
        
        return None

    def _regenerate_images_for_ads(self, problematic_ads):
        """Regenerate images for problematic ads using the corrected branding system."""
        from apps.chat.views.image_generation_views import generate_car_images_with_mock_algorithm
        from django.http import HttpRequest
        
        success_count = 0
        
        for item in problematic_ads:
            ad = item['ad']
            try:
                self.stdout.write(f'🎨 Regenerating images for ad #{ad.id} ({item["brand"]})...')
                
                # Delete existing images
                ad.images.all().delete()
                
                # Prepare car data for regeneration
                car_data = {
                    'brand': ad.mark.name if ad.mark else 'Generic',
                    'model': ad.model.name if ad.model else 'Vehicle',
                    'year': ad.dynamic_fields.get('year', 2020) if ad.dynamic_fields else 2020,
                    'color': ad.dynamic_fields.get('color', 'silver') if ad.dynamic_fields else 'silver',
                    'body_type': ad.dynamic_fields.get('body_type', 'sedan') if ad.dynamic_fields else 'sedan',
                    'condition': ad.dynamic_fields.get('condition', 'good') if ad.dynamic_fields else 'good',
                    'vehicle_type_name': item['vehicle_type']
                }
                
                # Create a mock request for the generation function
                request = HttpRequest()
                request.method = 'POST'
                request.data = {
                    'car_data': car_data,
                    'angles': ['front', 'side'],
                    'style': 'realistic'
                }
                
                # Generate new images with corrected branding
                response = generate_car_images_with_mock_algorithm(request, car_data, ['front', 'side'], 'realistic')
                
                if hasattr(response, 'data') and response.data.get('success'):
                    success_count += 1
                    self.stdout.write(f'  ✅ Successfully regenerated images for ad #{ad.id}')
                else:
                    self.stdout.write(f'  ❌ Failed to regenerate images for ad #{ad.id}')
                
            except Exception as e:
                self.stdout.write(f'  ❌ Error regenerating images for ad #{ad.id}: {e}')
                continue
        
        self.stdout.write(f'🎉 Successfully regenerated images for {success_count}/{len(problematic_ads)} ads')
