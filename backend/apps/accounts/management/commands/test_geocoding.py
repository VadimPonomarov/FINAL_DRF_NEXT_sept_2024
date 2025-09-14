"""
Management command to test geocoding functionality.
"""
import logging
import googlemaps
from django.core.management.base import BaseCommand
from django.conf import settings
from config.extra_config.apis import get_api_config

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Test geocoding functionality with Google Maps API'
    
    def add_arguments(self, parser):
        parser.add_argument('address', nargs='?', default=None, help='Address to geocode')
        parser.add_argument(
            '--test-all',
            action='store_true',
            help='Run all test cases including Ukrainian address and incomplete address',
        )

    def geocode_address(self, address, description=None):
        """Helper method to geocode a single address and return the result."""
        if description:
            self.stdout.write(self.style.MIGRATE_HEADING(f"\n{description}" + "-" * 50))
            self.stdout.write(f"Testing geocoding for address: {address}")
        
        try:
            # Get the API config instance
            api_config = get_api_config()
            api_key = api_config.GOOGLE_MAPS_API_KEY
            
            if not api_key:
                self.stderr.write(self.style.ERROR("❌ Error: Google Maps API key is not configured"))
                return None
                
            # Initialize the Google Maps client
            gmaps = googlemaps.Client(key=api_key)
            
            # Make the geocoding request
            result = gmaps.geocode(address)
            
            if not result:
                self.stderr.write(self.style.WARNING("⚠️  No results returned from geocoding service"))
                return None
                
            # Extract and return the relevant information
            place = result[0]
            return {
                'formatted_address': place.get('formatted_address', 'N/A'),
                'place_id': place.get('place_id', 'N/A'),
                'location': place.get('geometry', {}).get('location', {}),
                'types': place.get('types', []),
                'address_components': place.get('address_components', [])
            }
            
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"❌ Error during geocoding: {str(e)}"))
            if "API key" in str(e):
                self.stderr.write("\nAPI key validation failed. Please check:")
                self.stderr.write("1. The key is correctly set in your .env.local file")
                self.stderr.write("2. The key is properly encrypted")
                self.stderr.write("3. The key has the required Google Maps API permissions")
            return None

    def display_geocoding_result(self, result, address):
        """Display the geocoding result in a formatted way."""
        if not result:
            self.stdout.write(self.style.ERROR(f"❌ No results for: {address}"))
            return
            
        self.stdout.write(self.style.SUCCESS("✅ Geocoding successful!"))
        self.stdout.write(f"  Place ID: {result['place_id']}")
        self.stdout.write(f"  Formatted Address: {result['formatted_address']}")
        
        location = result.get('location', {})
        if location:
            self.stdout.write(f"  Location: {location.get('lat', 'N/A')}, {location.get('lng', 'N/A')}")
        
        # Display address components in a structured way
        components = result.get('address_components', [])
        if components:
            self.stdout.write("\n  Address Components:")
            for component in components:
                name = component.get('long_name', 'N/A')
                types = ', '.join(component.get('types', []))
                self.stdout.write(f"    - {name} ({types})")

    def handle(self, *args, **options):
        verbosity = int(options.get('verbosity', 1))
        test_all = options.get('test_all', False)
        
        # If test_all flag is set, run all test cases
        if test_all:
            self.stdout.write(self.style.MIGRATE_HEADING("\n=== RUNNING ALL GEOCODING TESTS ===\n"))
            
            # Test 1: Standard US address
            us_address = '1600 Amphitheatre Parkway, Mountain View, CA'
            result = self.geocode_address(us_address, "TEST 1: Standard US Address")
            self.display_geocoding_result(result, us_address)
            
            # Test 2: Ukrainian address
            ua_address = 'Хрещатик, 1, Київ, Україна'
            result = self.geocode_address(ua_address, "TEST 2: Ukrainian Address")
            self.display_geocoding_result(result, ua_address)
            
            # Test 3: Incomplete address (just city and country)
            incomplete_address = 'Київ, Україна'
            result = self.geocode_address(incomplete_address, "TEST 3: Incomplete Address (City and Country)")
            self.display_geocoding_result(result, incomplete_address)
            
            # Test 4: Very incomplete address (just country)
            minimal_address = 'Україна'
            result = self.geocode_address(minimal_address, "TEST 4: Minimal Address (Country Only)")
            self.display_geocoding_result(result, minimal_address)
            
            self.stdout.write(self.style.MIGRATE_HEADING("\n=== ALL TESTS COMPLETED ===\n"))
            return
            
        # If a specific address was provided, just test that one
        test_address = options['address'] or '1600 Amphitheatre Parkway, Mountain View, CA'
        result = self.geocode_address(test_address, f"Testing address: {test_address}")
        self.display_geocoding_result(result, test_address)
