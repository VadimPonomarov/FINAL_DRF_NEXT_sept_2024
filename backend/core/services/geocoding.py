"""
Geocoding service module.
GoogleMapsGeocoder class has been removed - geocoding is now handled directly in RawAccountAddress model.
"""

import logging
from apps.accounts.models import RawAccountAddress

logger = logging.getLogger(__name__)

# GoogleMapsGeocoder class removed - geocoding is now integrated into RawAccountAddress model
# All geocoding functionality is handled automatically when saving RawAccountAddress instances
