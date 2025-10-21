import requests
import json
import redis

# Получаем токен из Redis
r = redis.Redis(host='redis', port=6379, db=0)
auth_data = json.loads(r.get('backend_auth').decode())
token = auth_data['access']

# Тестируем API напрямую
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

response = requests.get('http://localhost:8000/api/ads/cars/moderation/queue', headers=headers)
print(f'Status: {response.status_code}')
if response.status_code == 200:
    data = response.json()
    print(f'Found {len(data.get("results", []))} ads')
    for ad in data.get('results', [])[:3]:
        print(f'- {ad.get("title", "No title")} (Status: {ad.get("status", "Unknown")})')
else:
    print(f'Error: {response.text}')
