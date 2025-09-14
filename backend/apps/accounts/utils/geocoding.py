import logging
import hashlib
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def geocode_address_simple(address: str, api_key: str) -> Optional[Dict[str, Any]]:
    """
    Simple geocoding function using requests library.

    Args:
        address: Full address string
        api_key: Google Maps API key

    Returns:
        Dict with geocoding result or None if failed
    """
    endpoint = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": address,
        "key": api_key
    }

    try:
        response = requests.get(endpoint, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        logger.debug(f"Geocoding API response status: {data.get('status')}")

        if data["status"] == "OK" and data.get("results"):
            result = data["results"][0]
            logger.info(f"Geocoding successful for: {address}")
            return result
        else:
            logger.warning(f"Geocoding failed for '{address}': {data.get('status')} - {data.get('error_message', 'No error message')}")
            return None

    except requests.exceptions.RequestException as e:
        logger.error(f"Network error during geocoding: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during geocoding: {e}")
        return None


def get_geocode(**address_components) -> Optional[str]:
    """
    Get geocode hash from Google Maps API using address components.
    
    Args:
        **address_components: Dict containing address components (country, region, city, street, etc.)
        
    Returns:
        str: Geocode hash (place_id) or None if geocoding failed
    """
    try:
        # Get the API key directly from environment/settings
        api_key = settings.GOOGLE_MAPS_API_KEY
        if not api_key:
            logger.warning("Google Maps API key is not configured")
            return None
            
        # Initialize the Google Maps client
        gmaps = googlemaps.Client(key=api_key)
        
        # Format the address string from components
        address_parts = [
            address_components.get('street', ''),
            address_components.get('building', ''),
            address_components.get('locality', ''),
            address_components.get('region', ''),
            address_components.get('country', 'Україна')  # Default to Ukraine
        ]
        address = ', '.join(filter(None, address_parts))
        
        if not address.strip():
            logger.warning("No valid address components provided for geocoding")
            return None
        
        # Make the geocoding request
        geocode_result = gmaps.geocode(address)
        
        if geocode_result and len(geocode_result) > 0:
            # Return the place_id as a unique identifier for the location
            place_id = geocode_result[0].get('place_id')
            logger.debug(f"Geocoding successful for address: {address} -> {place_id}")
            return place_id
        else:
            logger.warning(f"No geocode results for address: {address}")
            
    except Exception as e:
        # Log error but don't fail the request
        logger.error(f"Geocoding failed: {str(e)}", exc_info=True)
        
    return None


def get_minimal_geocode(**address_components) -> Optional[Dict[str, Any]]:
    """
    Minimal geocoding for geographical grouping.
    Returns only region, locality and coordinates.

    Args:
        **address_components: Dict containing region, locality and locale

    Returns:
        Dict containing minimal standardized geographical data
    """
    locale = address_components.pop('locale', 'uk')  # Default to Ukrainian locale

    try:
        # Get the API key using key manager
        from core.security.key_manager import key_manager

        api_key = key_manager.google_maps_api_key
        if not api_key:
            logger.warning("Google Maps API key is not available")
            return None

        # Format minimal address string for geocoding
        region = address_components.get('region', '')
        locality = address_components.get('locality', '')

        if not region or not locality:
            logger.warning("Region and locality are required for minimal geocoding")
            return None

        # Create address string: "locality, region, Ukraine"
        address = f"{locality}, {region}, Україна"

        # Make the geocoding request with locale
        endpoint = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "address": address,
            "key": api_key,
            "language": locale,  # Set language for consistent locale
            "region": "ua"  # Bias results towards Ukraine
        }

        response = requests.get(endpoint, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        logger.debug(f"Minimal geocoding API response status: {data.get('status')}")

        if data["status"] != "OK" or not data.get("results"):
            logger.warning(f"Minimal geocoding failed for '{address}': {data.get('status')}")
            return None

        # Get the first (best) result
        result = data["results"][0]

        # Extract relevant data from geocoding result
        geometry = result.get('geometry', {})
        location = geometry.get('location', {})

        # Parse address components from Google Maps response
        parsed_components = _parse_google_address_components(result.get('address_components', []))

        # Extract region and locality with fallbacks for Ukrainian addresses
        region = (
            parsed_components.get('administrative_area_level_1', '') or
            parsed_components.get('administrative_area_level_2', '') or
            ''
        )

        locality = (
            parsed_components.get('locality', '') or
            parsed_components.get('sublocality', '') or
            parsed_components.get('administrative_area_level_3', '') or
            ''
        )

        # Extract place_id for geographical grouping
        place_id = result.get('place_id', '')

        # Prepare minimal result for geographical grouping
        geocode_data = {
            # Coordinates for map display
            'latitude': location.get('lat'),
            'longitude': location.get('lng'),

            # Standardized geographical components for grouping
            'region': region,
            'locality': locality,

            # Google Maps place_id for unique geographical identification
            'place_id': place_id,
        }

        logger.debug(f"Minimal geocoding successful for: {address} (locale: {locale})")
        return geocode_data

    except Exception as e:
        logger.error(f"Minimal geocoding failed: {str(e)}")

    return None


def get_full_geocode_with_locale(**address_components) -> Optional[Dict[str, Any]]:
    """
    Get complete geocoding information from Google Maps API with specified locale.
    Returns all standardized address components in specified locale plus coordinates and hash.

    Args:
        **address_components: Dict containing address components and locale

    Returns:
        Dict containing standardized address data in specified locale
    """
    locale = address_components.pop('locale', 'uk')  # Default to Ukrainian locale

    try:
        # Get the API key using direct decryption
        from core.utils.encryption import encryption_service
        import os

        encrypted_key = os.getenv('ENCRYPTED_GOOGLE_MAPS_API_KEY')
        if not encrypted_key:
            logger.warning("Encrypted Google Maps API key is not configured")
            return None

        api_key = encryption_service.decrypt_api_key(encrypted_key, 'GOOGLE_MAPS_API_KEY')
        if not api_key:
            logger.warning("Failed to decrypt Google Maps API key")
            return None

        # Format the address string from components
        address_parts = [
            address_components.get('street', ''),
            address_components.get('building', ''),
            address_components.get('locality', ''),
            address_components.get('region', ''),
            address_components.get('country', 'Україна')  # Default to Ukraine
        ]
        address = ', '.join(filter(None, address_parts))

        if not address.strip():
            logger.warning("No valid address components provided for geocoding")
            return None

        # Make the geocoding request with locale
        endpoint = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "address": address,
            "key": api_key,
            "language": locale,  # Set language for consistent locale
            "region": "ua"  # Bias results towards Ukraine
        }

        response = requests.get(endpoint, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        logger.debug(f"Geocoding API response status: {data.get('status')}")

        if data["status"] != "OK" or not data.get("results"):
            logger.warning(f"Geocoding failed for '{address}': {data.get('status')} - {data.get('error_message', 'No error message')}")
            return None

        # Get the first (best) result
        result = data["results"][0]

        # Extract relevant data from geocoding result
        geometry = result.get('geometry', {})
        location = geometry.get('location', {})

        # Parse address components from Google Maps response
        parsed_components = _parse_google_address_components(result.get('address_components', []))

        # Generate address hash from standardized components
        address_hash = _generate_address_hash(parsed_components)

        # Prepare the clean result with only necessary fields
        geocode_data = {
            # Coordinates
            'latitude': location.get('lat'),
            'longitude': location.get('lng'),

            # Standardized address components in specified locale
            'country': parsed_components.get('country', ''),
            'country_code': parsed_components.get('country_code', ''),
            'region': parsed_components.get('administrative_area_level_1', ''),
            'district': parsed_components.get('administrative_area_level_2', ''),
            'locality': parsed_components.get('locality', ''),
            'street': parsed_components.get('route', ''),
            'building': parsed_components.get('street_number', ''),
            'postal_code': parsed_components.get('postal_code', ''),

            # Copy apartment from original input (Google Maps doesn't provide this)
            'apartment': address_components.get('apartment', ''),

            # Hash for grouping and analytics
            'address_hash': address_hash,
        }

        logger.debug(f"Full geocoding successful for address: {address} (locale: {locale})")
        return geocode_data

    except Exception as e:
        logger.error(f"Full geocoding failed: {str(e)}")

    return None


def get_full_geocode(**address_components) -> Optional[Dict[str, Any]]:
    """
    Get complete geocoding information from Google Maps API.
    Returns all standardized address components in Latin format plus coordinates and hash.

    Args:
        **address_components: Dict containing address components (country, region, locality, street, building, etc.)

    Returns:
        Dict containing:
        - place_id: Unique Google Maps identifier
        - formatted_address: Complete formatted address
        - latitude, longitude: Coordinates
        - country, region, locality, street, building: Standardized components in Latin
        - address_hash: SHA-256 hash for grouping identical addresses
        - All other Google Maps components
    """
    try:
        # Get the API key using direct decryption
        from core.utils.encryption import encryption_service
        import os

        encrypted_key = os.getenv('ENCRYPTED_GOOGLE_MAPS_API_KEY')
        if not encrypted_key:
            logger.warning("Encrypted Google Maps API key is not configured")
            return None

        api_key = encryption_service.decrypt_api_key(encrypted_key, 'GOOGLE_MAPS_API_KEY')
        if not api_key:
            logger.warning("Failed to decrypt Google Maps API key")
            return None

        # Format the address string from components
        address_parts = [
            address_components.get('street', ''),
            address_components.get('building', ''),
            address_components.get('locality', ''),
            address_components.get('region', ''),
            address_components.get('country', 'Україна')  # Default to Ukraine
        ]
        address = ', '.join(filter(None, address_parts))

        if not address.strip():
            logger.warning("No valid address components provided for geocoding")
            return None

        # Make the geocoding request using simple requests
        result = geocode_address_simple(address, api_key)

        if not result:
            logger.warning(f"No geocode results for address: {address}")
            return None

        # Extract basic information
        place_id = result.get('place_id')
        formatted_address = result.get('formatted_address', '')
        geometry = result.get('geometry', {})
        location = geometry.get('location', {})

        # Parse address components
        parsed_components = _parse_google_address_components(result.get('address_components', []))

        # Generate address hash from standardized components
        address_hash = _generate_address_hash(parsed_components)

        # Prepare the clean result with only necessary fields
        geocode_data = {
            # Coordinates
            'latitude': location.get('lat'),
            'longitude': location.get('lng'),

            # Standardized address components (matching FormattedAccountAddress fields)
            'country': parsed_components.get('country', ''),
            'country_code': parsed_components.get('country_code', ''),
            'region': parsed_components.get('administrative_area_level_1', ''),
            'district': parsed_components.get('administrative_area_level_2', ''),
            'locality': parsed_components.get('locality', ''),
            'street': parsed_components.get('route', ''),
            'building': parsed_components.get('street_number', ''),
            'postal_code': parsed_components.get('postal_code', ''),

            # Copy apartment from original input (Google Maps doesn't provide this)
            'apartment': address_components.get('apartment', ''),

            # Hash for grouping and analytics
            'address_hash': address_hash,
        }

        logger.debug(f"Full geocoding successful for address: {address} -> {place_id}")
        return geocode_data

    except Exception as e:
        logger.error(f"Full geocoding failed: {str(e)}", exc_info=True)

    return None


def _parse_google_address_components(address_components: list) -> Dict[str, str]:
    """
    Parse Google Maps address components into a standardized dictionary.

    Args:
        address_components: List of address components from Google Maps API response

    Returns:
        Dictionary with parsed components
    """
    parsed = {}

    for component in address_components:
        types = component.get('types', [])
        long_name = component.get('long_name', '')
        short_name = component.get('short_name', '')

        # Map Google Maps component types to our standardized fields
        if 'street_number' in types:
            parsed['street_number'] = long_name
        elif 'route' in types:
            parsed['route'] = long_name
        elif 'locality' in types:
            parsed['locality'] = long_name
        elif 'sublocality' in types or 'sublocality_level_1' in types:
            parsed['sublocality'] = long_name
        elif 'administrative_area_level_1' in types:
            parsed['administrative_area_level_1'] = long_name
        elif 'administrative_area_level_2' in types:
            parsed['administrative_area_level_2'] = long_name
        elif 'country' in types:
            parsed['country'] = long_name
            parsed['country_code'] = short_name
        elif 'postal_code' in types:
            parsed['postal_code'] = long_name

    return parsed


def _generate_address_hash(parsed_components: Dict[str, str]) -> str:
    """
    Generate SHA-256 hash from standardized address components.
    This hash is used for grouping identical addresses regardless of input format.

    Args:
        parsed_components: Dictionary of parsed address components

    Returns:
        SHA-256 hash string
    """
    # Use standardized components for hash generation
    components = [
        parsed_components.get('country', '').lower().strip(),
        parsed_components.get('administrative_area_level_1', '').lower().strip(),
        parsed_components.get('administrative_area_level_2', '').lower().strip(),
        parsed_components.get('locality', '').lower().strip(),
        parsed_components.get('route', '').lower().strip(),
        parsed_components.get('street_number', '').lower().strip(),
    ]

    # Filter out empty components and join
    address_string = '|'.join(filter(None, components))

    # Generate SHA-256 hash
    return hashlib.sha256(address_string.encode('utf-8')).hexdigest()


def get_detailed_geocode(region, locality, locale='uk'):
    """
    Get detailed geocoding information with both Latin and Ukrainian components.

    Args:
        region: Region name
        locality: City/locality name
        locale: Language locale for geocoding (default: 'uk')

    Returns:
        Dict containing detailed geocoding information with Latin and Ukrainian components
    """
    try:
        # Get the API key using direct decryption
        from core.utils.encryption import encryption_service
        import os

        encrypted_key = os.getenv('ENCRYPTED_GOOGLE_MAPS_API_KEY')
        if not encrypted_key:
            logger.warning("Encrypted Google Maps API key is not configured")
            return None

        try:
            api_key = encryption_service.decrypt(encrypted_key)
        except Exception as e:
            logger.error(f"Failed to decrypt Google Maps API key: {e}")
            return None

        if not api_key or api_key == 'YOUR_GOOGLE_MAPS_API_KEY_HERE':
            logger.warning("Google Maps API key is not properly configured")
            return None

        # Create address string
        address = f"{locality}, {region}, Україна"

        # Get geocoding data in Ukrainian
        result_uk = geocode_address_simple(address, api_key, locale='uk')
        if not result_uk:
            return None

        # Get geocoding data in English for Latin components
        result_en = geocode_address_simple(address, api_key, locale='en')

        # Extract basic information
        place_id = result_uk.get('place_id')
        formatted_address = result_uk.get('formatted_address', '')
        geometry = result_uk.get('geometry', {})
        location = geometry.get('location', {})

        # Parse address components for both locales
        components_uk = _parse_google_address_components(result_uk.get('address_components', []))
        components_en = _parse_google_address_components(result_en.get('address_components', [])) if result_en else {}

        # Generate address hash
        address_hash = _generate_address_hash(components_uk)

        # Prepare detailed result
        detailed_result = {
            'place_id': place_id,
            'formatted_address': formatted_address,
            'latitude': location.get('lat'),
            'longitude': location.get('lng'),
            'address_hash': address_hash,

            # Ukrainian components
            'country_uk': components_uk.get('country', ''),
            'region_uk': components_uk.get('administrative_area_level_1', ''),
            'locality_uk': components_uk.get('locality', ''),
            'street_uk': components_uk.get('route', ''),
            'building_uk': components_uk.get('street_number', ''),

            # Latin components (English locale)
            'country': components_en.get('country', components_uk.get('country', '')),
            'region': components_en.get('administrative_area_level_1', components_uk.get('administrative_area_level_1', '')),
            'locality': components_en.get('locality', components_uk.get('locality', '')),
            'street': components_en.get('route', components_uk.get('route', '')),
            'building': components_en.get('street_number', components_uk.get('street_number', '')),
        }

        logger.debug(f"Detailed geocoding successful for: {address}")
        return detailed_result

    except Exception as e:
        logger.error(f"Detailed geocoding failed: {str(e)}", exc_info=True)
        return None
