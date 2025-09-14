"""
Mock geocoding utility for demonstration purposes.
Simulates Google Maps API responses for testing the address system.
"""

import hashlib
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def get_mock_geocode(**address_components) -> Optional[str]:
    """
    Mock version of get_geocode that returns a simulated place_id.
    """
    try:
        # Create a mock place_id based on address components
        address_parts = [
            address_components.get('country', ''),
            address_components.get('region', ''),
            address_components.get('locality', ''),
            address_components.get('street', ''),
            address_components.get('building', '')
        ]
        address_string = '|'.join(filter(None, address_parts))
        
        if not address_string.strip():
            return None
        
        # Generate a mock place_id
        place_id = f"ChIJ{hashlib.md5(address_string.encode()).hexdigest()[:20]}"
        
        logger.debug(f"Mock geocoding successful: {address_string} -> {place_id}")
        return place_id
        
    except Exception as e:
        logger.error(f"Mock geocoding failed: {str(e)}")
        return None


def get_mock_full_geocode(**address_components) -> Optional[Dict[str, Any]]:
    """
    Mock version of get_full_geocode that returns simulated Google Maps API response.
    Creates realistic standardized address data for testing.
    """
    try:
        # Extract input components
        country = address_components.get('country', '')
        region = address_components.get('region', '')
        locality = address_components.get('locality', '')
        street = address_components.get('street', '')
        building = address_components.get('building', '')
        apartment = address_components.get('apartment', '')
        
        if not all([country, locality, street]):
            logger.warning("Insufficient address components for mock geocoding")
            return None
        
        # Create standardized components (simulate Google Maps standardization)
        standardized = _standardize_address_components(
            country, region, locality, street, building
        )
        
        # Generate mock coordinates (somewhere in Ukraine)
        mock_lat = 50.4501 + (hash(locality) % 1000) / 10000  # Around Kyiv
        mock_lng = 30.5234 + (hash(street) % 1000) / 10000
        
        # Generate mock place_id
        address_string = f"{country}|{region}|{locality}|{street}|{building}"
        place_id = f"ChIJ{hashlib.md5(address_string.encode()).hexdigest()[:20]}"
        
        # Generate address hash
        address_hash = _generate_mock_address_hash(standardized)
        
        # Create formatted address
        formatted_address = f"{standardized['building']} {standardized['street']}, {standardized['locality']}, {standardized['region']}, {standardized['country']}"
        
        # Prepare the complete mock result
        geocode_data = {
            # Google Maps identifiers
            'place_id': place_id,
            'formatted_address': formatted_address,
            
            # Coordinates
            'latitude': mock_lat,
            'longitude': mock_lng,
            
            # Standardized address components (in Latin)
            'country': standardized['country'],
            'country_code': standardized['country_code'],
            'region': standardized['region'],
            'district': standardized['district'],
            'locality': standardized['locality'],
            'street': standardized['street'],
            'building': standardized['building'],
            'postal_code': standardized['postal_code'],
            
            # Copy apartment from original input
            'apartment': apartment,
            
            # Google Maps specific components
            'street_number': standardized['building'],
            'route': standardized['street'],
            'sublocality': '',
            'administrative_area_level_1': standardized['region'],
            'administrative_area_level_2': standardized['district'],
            
            # Hash for grouping and analytics
            'address_hash': address_hash,
            
            # Mock raw response
            'raw_response': {
                'status': 'OK',
                'results': [{
                    'place_id': place_id,
                    'formatted_address': formatted_address,
                    'geometry': {
                        'location': {'lat': mock_lat, 'lng': mock_lng}
                    }
                }]
            },
        }
        
        logger.debug(f"Mock full geocoding successful: {locality}, {street} -> {place_id}")
        return geocode_data
        
    except Exception as e:
        logger.error(f"Mock full geocoding failed: {str(e)}")
        return None


def _standardize_address_components(country, region, locality, street, building):
    """
    Simulate Google Maps address standardization.
    Converts Ukrainian addresses to Latin format.
    """
    # Mock translation/standardization mappings
    country_mapping = {
        'Україна': 'Ukraine',
        'Ukraine': 'Ukraine',
        'украина': 'Ukraine'
    }
    
    region_mapping = {
        'Київська область': 'Kyiv Oblast',
        'Київська обл.': 'Kyiv Oblast',
        'Kyiv Oblast': 'Kyiv Oblast',
        'Одеська область': 'Odesa Oblast',
        'Львівська область': 'Lviv Oblast',
        'Харківська область': 'Kharkiv Oblast',
        'Дніпропетровська область': 'Dnipropetrovsk Oblast',
        'Полтавська область': 'Poltava Oblast',
        'Івано-Франківська область': 'Ivano-Frankivsk Oblast'
    }
    
    locality_mapping = {
        'Київ': 'Kyiv',
        'м. Київ': 'Kyiv',
        'Kyiv': 'Kyiv',
        'Одеса': 'Odesa',
        'Львів': 'Lviv',
        'Харків': 'Kharkiv',
        'Дніпро': 'Dnipro',
        'Полтава': 'Poltava',
        'Івано-Франківськ': 'Ivano-Frankivsk'
    }
    
    street_mapping = {
        'вул. Хрещатик': 'Khreshchatyk Street',
        'Хрещатик': 'Khreshchatyk Street',
        'Khreshchatyk Street': 'Khreshchatyk Street',
        'вул. Дерибасівська': 'Deribasivska Street',
        'пр. Свободи': 'Svobody Avenue',
        'вул. Сумська': 'Sumska Street',
        'вул. Соборна': 'Soborna Street',
        'вул. Грушевського': 'Hrushevskogo Street',
        'вул. Миру': 'Myru Street',
        'вул. Незалежності': 'Nezalezhnosti Street'
    }
    
    # Apply standardization
    std_country = country_mapping.get(country, country)
    std_region = region_mapping.get(region, region)
    std_locality = locality_mapping.get(locality, locality)
    std_street = street_mapping.get(street, street)
    
    # Generate mock postal code
    postal_code = f"{hash(locality) % 90000 + 10000:05d}"
    
    return {
        'country': std_country,
        'country_code': 'UA',
        'region': std_region,
        'district': '',  # Usually empty for major cities
        'locality': std_locality,
        'street': std_street,
        'building': building,
        'postal_code': postal_code
    }


def _generate_mock_address_hash(standardized_components):
    """
    Generate SHA-256 hash from standardized address components.
    Same logic as the real version.
    """
    components = [
        standardized_components.get('country', '').lower().strip(),
        standardized_components.get('region', '').lower().strip(),
        standardized_components.get('district', '').lower().strip(),
        standardized_components.get('locality', '').lower().strip(),
        standardized_components.get('street', '').lower().strip(),
        standardized_components.get('building', '').lower().strip(),
    ]
    
    # Filter out empty components and join
    address_string = '|'.join(filter(None, components))
    
    # Generate SHA-256 hash
    return hashlib.sha256(address_string.encode('utf-8')).hexdigest()
