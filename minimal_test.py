# -*- coding: utf-8 -*-
import requests
import json

url = "http://localhost:8000/api/chat/generate-car-images/"
data = {
    "car_data": {
        "brand": "Renault",
        "model": "Clio",
        "year": 2019,
        "color": "blue",
        "vehicle_type_name": "легкові",
        "body_type": "hatchback"
    },
    "angles": ["front"],
    "use_mock_algorithm": True
}

print("Sending request...")
try:
    r = requests.post(url, json=data, timeout=30)
    print(f"Status: {r.status_code}")
    result = r.json()
    print(f"Success: {result.get('success')}")
    print(f"Images: {len(result.get('images', []))}")
    if result.get('images'):
        img = result['images'][0]
        print(f"Prompt preview: {img.get('prompt', '')[:100]}...")
except Exception as e:
    print(f"Error: {e}")

