# -*- coding: utf-8 -*-
"""Direct test of async functions"""
import sys
sys.path.insert(0, 'backend')

import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.chat.utils.async_image_generation import sync_generate_all_prompts

print("Testing async_generate_all_prompts...")

try:
    result = sync_generate_all_prompts(
        brand="Renault",
        model="Clio",
        year=2019,
        color="blue",
        body_type="hatchback",
        angles=["front"]
    )
    
    print(f"✅ Success! Generated {len(result)} prompts")
    if result:
        print(f"Prompt preview: {result[0].get('prompt', '')[:150]}...")
        print(f"Session ID: {result[0].get('session_id')}")
        print(f"Seed: {result[0].get('seed')}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

