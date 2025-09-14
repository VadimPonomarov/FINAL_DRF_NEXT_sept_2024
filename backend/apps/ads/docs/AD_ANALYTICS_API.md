# Ad Analytics API Documentation

## Overview

The Ad Analytics API provides detailed information about car advertisements for premium account holders. This implements **Task 4: Advertisement Information** from the requirements.

## Features

### Account Type Restrictions
- **Basic Account**: No access to detailed analytics (receives upgrade message)
- **Premium Account**: Full access to analytics data including:
  - View counts (total, daily, weekly, monthly)
  - Price comparison with regional and national averages
  - Price position percentiles

## API Endpoints

### Get Ad Analytics

**Endpoint:** `GET /api/ads/{ad_id}/analytics`

**Authentication:** Required (JWT Token)

**Permissions:** 
- User must be authenticated
- User must own the advertisement
- Premium account required for detailed data

#### Request Example
```http
GET /api/ads/123/analytics
Authorization: Bearer <jwt_token>
```

#### Response Examples

##### Basic Account Response
```json
{
  "ad_id": 123,
  "title": "Toyota Camry 2020",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z",
  "is_premium": false,
  "message": "Upgrade to premium to view detailed analytics"
}
```

##### Premium Account Response
```json
{
  "ad_id": 123,
  "title": "Toyota Camry 2020",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z",
  "is_premium": true,
  "views": {
    "total": 245,
    "today": 12,
    "this_week": 67,
    "this_month": 189,
    "daily": [
      {"date": "2024-01-15", "count": 12},
      {"date": "2024-01-14", "count": 8}
    ],
    "weekly": [
      {"week": "2024-01-08", "count": 67},
      {"week": "2024-01-01", "count": 45}
    ],
    "monthly": [
      {"month": "2024-01-01", "count": 189},
      {"month": "2023-12-01", "count": 156}
    ]
  },
  "pricing": {
    "your_price": {
      "amount": 25000.00,
      "currency": "UAH"
    },
    "region_average": {
      "amount": 27500.00,
      "currency": "UAH",
      "count": 15,
      "position_percentile": 25.5
    },
    "ukraine_average": {
      "amount": 26800.00,
      "currency": "UAH", 
      "count": 234,
      "position_percentile": 32.1
    }
  }
}
```

#### Error Responses

##### Permission Denied (403)
```json
{
  "error": "You don't have permission to view analytics for this ad"
}
```

##### Ad Not Found (404)
```json
{
  "detail": "Not found."
}
```

## View Tracking

### Automatic View Tracking
- Views are automatically tracked when users access the ad detail page
- Duplicate views from the same IP/session within 1 hour are filtered out
- Tracks IP address, user agent, referrer, and session information

### View Analytics Data
- **Total views**: All-time view count
- **Today**: Views from today (00:00 - 23:59)
- **This week**: Views from Monday to Sunday of current week
- **This month**: Views from 1st to last day of current month
- **Historical data**: Daily, weekly, and monthly breakdowns

## Price Analytics

### Regional Comparison
- Average price for same mark/model in the same region
- Your ad's price position as percentile (0-100%)
- Count of comparable ads in the region

### National Comparison  
- Average price for same mark/model across all Ukraine
- Your ad's price position as percentile (0-100%)
- Count of comparable ads nationally

### Price Position Interpretation
- **0-25%**: Your price is in the lowest 25% (very competitive)
- **25-50%**: Your price is below average
- **50-75%**: Your price is above average
- **75-100%**: Your price is in the highest 25% (premium pricing)

## Implementation Details

### Services Used
- `AdAnalyticsService`: Main analytics logic
- `AdViewTracker`: View tracking and deduplication
- Account type validation via `AccountTypeEnum`

### Models Involved
- `CarAd`: Main advertisement model
- `AdViewModel`: View tracking records
- `AddsAccount`: Account type information

### Security Features
- JWT authentication required
- Owner-only access (users can only view analytics for their own ads)
- Account type validation
- Input sanitization and validation

## Usage Examples

### Check if user has premium access
```python
from apps.ads.services.analytics import AdAnalyticsService

result = AdAnalyticsService.get_ad_analytics(ad, user)
if result.get('is_premium'):
    # Show detailed analytics
    views = result['views']
    pricing = result['pricing']
else:
    # Show upgrade message
    message = result['message']
```

### Track ad view manually
```python
from apps.ads.services.view_tracker import AdViewTracker

view = AdViewTracker.track_view(
    ad=ad,
    ip_address='192.168.1.1',
    user_agent='Mozilla/5.0...',
    session_key='session_key'
)
```

## Testing

Run the analytics tests:
```bash
python manage.py test apps.ads.tests.test_ad_analytics
```

## Related Documentation
- [Account Types Documentation](../accounts/docs/ACCOUNT_TYPES.md)
- [Car Ads API Documentation](./CAR_ADS_API.md)
- [Authentication Documentation](../auth/docs/JWT_AUTH.md)
