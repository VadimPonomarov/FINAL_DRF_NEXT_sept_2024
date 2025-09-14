#!/usr/bin/env python
"""
Test script to verify geocode generation for CarAd based on region and city.
This script demonstrates the geocode generation process and validates the results.
"""
import os
import sys
import json
import hashlib
import logging
from django.conf import settings

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.ads.models import CarAd, Region, City
from core.services.geocoding import GoogleMapsGeocoder

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def test_geocode_generation(region_name, city_name):
    """
    Test geocode generation for a given region and city.
    """
    try:
        logger.info(f"Testing geocode generation for: {city_name}, {region_name}")
        
        # Create or get region and city
        region, _ = Region.objects.get_or_create(name=region_name)
        city, _ = City.objects.get_or_create(name=city_name, region=region)
        
        # Create a test ad
        ad = CarAd.objects.create(
            title='Test Ad',
            description='Test Description',
            region=region,
            city=city
        )
        
        # Get the full address
        address = ad.get_full_address()
        logger.info(f"Generated address: {address}")
        
        # Update geocode
        if ad.update_geocode():
            logger.info(f"Successfully generated geocode: {ad.geocode}")
            
            # Get the raw geocode data from Google Maps API
            geocoder = GoogleMapsGeocoder()
            geocode_result = geocoder.client.geocode(address, region='ua')
            
            if geocode_result:
                # Extract relevant data for hashing
                geocode_data = {
                    'place_id': geocode_result[0].get('place_id', ''),
                    'formatted_address': geocode_result[0].get('formatted_address', ''),
                    'location': geocode_result[0]['geometry']['location']
                }
                
                # Generate expected hash
                geocode_str = json.dumps(geocode_data, sort_keys=True)
                expected_hash = hashlib.md5(geocode_str.encode('utf-8')).hexdigest()
                
                # Compare hashes
                if ad.geocode == expected_hash:
                    logger.info("✅ Geocode hash matches expected value")
                else:
                    logger.error("❌ Geocode hash does not match expected value")
                    logger.info(f"Expected: {expected_hash}")
                    logger.info(f"Actual:   {ad.geocode}")
                
                # Print geocode details
                logger.info("\nGeocode Details:")
                logger.info(f"Place ID: {geocode_data['place_id']}")
                logger.info(f"Formatted Address: {geocode_data['formatted_address']}")
                logger.info(f"Location: {geocode_data['location']}")
                
                return True, ad.geocode, geocode_data
            else:
                logger.error("❌ No geocode results from Google Maps API")
                return False, None, None
        else:
            logger.error("❌ Failed to generate geocode")
            return False, None, None
            
    except Exception as e:
        logger.error(f"❌ Error during geocode test: {str(e)}", exc_info=True)
        return False, None, None

if __name__ == "__main__":
    # Test with some example locations
    test_locations = [
        ("Київська область", "Київ"),
        ("Львівська область", "Львів"),
        ("Одеська область", "Одеса"),
        ("Харківська область", "Харків"),
        ("Дніпропетровська область", "Дніпро"),
    ]
    
    logger.info("Starting geocode generation tests...\n")
    
    results = []
    for region, city in test_locations:
        logger.info("=" * 80)
        success, geocode, details = test_geocode_generation(region, city)
        results.append((region, city, success, geocode, details))
    
    # Print summary
    logger.info("\n" + "=" * 80)
    logger.info("TEST SUMMARY")
    logger.info("=" * 80)
    
    for region, city, success, geocode, _ in results:
        status = "✅ PASS" if success else "❌ FAIL"
        logger.info(f"{status} - {city}, {region}: {geocode or 'No geocode generated'}")
    
    # Print any failures
    failures = [f"{city}, {region}" for region, city, success, _, _ in results if not success]
    if failures:
        logger.warning("\nFailed locations:" + "\n- " + "\n- ".join(failures))
    
    logger.info("\nTesting complete!")
