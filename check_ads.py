from apps.ads.models import CarAd
from django.db import models

print(f'Total ads: {CarAd.objects.count()}')
print('Ads by status:')
for status, count in CarAd.objects.values_list('status').annotate(count=models.Count('status')).values_list('status', 'count'):
    print(f'  {status}: {count}')

print('\nFirst 5 ads:')
for ad in CarAd.objects.all()[:5]:
    print(f'  ID: {ad.id}, Title: {ad.title}, Status: {ad.status}')
