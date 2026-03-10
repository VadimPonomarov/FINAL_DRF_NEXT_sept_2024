#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix carAdDataMapper.ts type errors and autoria.ts type widening"""
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src')

def read(rel):
    p = os.path.normpath(os.path.join(BASE, rel))
    with open(p, 'r', encoding='utf-8') as f: return f.read()

def write(rel, content):
    p = os.path.normpath(os.path.join(BASE, rel))
    with open(p, 'w', encoding='utf-8') as f: f.write(content)
    print(f'[OK] {rel}')

# ── 1. autoria.ts: fix CarAdImage, CarAdFormData.images/contacts ─────────────
autoria = read('modules/autoria/shared/types/autoria.ts')

# Expand CarAdImage with caption and is_primary
autoria = autoria.replace(
    '''export interface CarAdImage {
  id: number;
  image: string;
  image_url?: string;
  image_display_url?: string;
  url?: string;
  is_main: boolean;
  order: number;
  created_at: string;
}''',
    '''export interface CarAdImage {
  id: number;
  image: string;
  image_url?: string;
  image_display_url?: string;
  url?: string;
  is_main: boolean;
  is_primary?: boolean;
  caption?: string;
  order: number;
  created_at: string;
  [key: string]: any;
}'''
)

# Widen CarAdFormData.images to also allow CarAdImage[]
autoria = autoria.replace(
    '  images?: File[] | string[];',
    '  images?: File[] | string[] | CarAdImage[];'
)

# Widen CarAdFormData.contacts to allow Contact too
autoria = autoria.replace(
    '  contacts?: AdContact[];',
    '  contacts?: (AdContact | Contact)[];'
)

write('modules/autoria/shared/types/autoria.ts', autoria)

# ── 2. carAdDataMapper.ts: remove duplicate keys, fix parseInt ───────────────
mapper = read('modules/autoria/shared/utils/carAdDataMapper.ts')

# Remove duplicate keys at ~lines 516-520 (year, mileage_km, engine_volume, engine_power)
# These appear first at ~lines 453-456 without parseInt, and duplicated below with parseInt.
# The second set (with parseInt) is the correct one — remove the first plain assignment
# by replacing the first occurrence only.

# Replace first (plain) definitions with a comment marker
old_plain = '''    // Технические характеристики
    year: formData.year,
    mileage_km: formData.mileage,
    engine_volume: formData.engine_volume,
    engine_power: formData.engine_power,
    fuel_type: formData.fuel_type,
    transmission_type: formData.transmission,'''

new_plain = '''    // Технические характеристики (точные значения устанавливаются ниже с parseInt/parseFloat)
    fuel_type: formData.fuel_type,
    transmission_type: formData.transmission,'''

if old_plain in mapper:
    mapper = mapper.replace(old_plain, new_plain, 1)
    print('[OK] Removed duplicate year/mileage/engine fields')
else:
    print('[SKIP] Duplicate fields pattern not found')

# Fix parseInt(formData.region) -> parseInt(String(formData.region))
mapper = mapper.replace(
    'const regionId = parseInt(formData.region);',
    'const regionId = parseInt(String(formData.region));'
)
mapper = mapper.replace(
    'const cityId = parseInt(formData.city);',
    'const cityId = parseInt(String(formData.city));'
)

# Fix images type: cast to any[] to avoid File[]|string[] vs {id,...}[] mismatch
mapper = mapper.replace(
    '    images: formData.images || [],\n    existing_images: formData.existing_images || [],',
    '    images: (formData.images || []) as any[],\n    existing_images: (formData.existing_images || []) as any[],'
)

# Fix contacts type: cast to any[] 
mapper = mapper.replace(
    '    contacts: formData.contacts || [],',
    '    contacts: (formData.contacts || []) as any[],'
)

# Fix line 232: apiData.contacts assignment (Contact[] | AdContact[] -> cast)
mapper = mapper.replace(
    '    contacts: apiData.contacts || [],\n    contact_name: extractValue(',
    '    contacts: (apiData.contacts || []) as any[],\n    contact_name: extractValue('
)

# Fix vehicle_type: number return not assignable to string|null (CarAd.vehicle_type is string|null)
# The mapper returns a number from parseInt but CarAd.vehicle_type is string|null
# Cast to any
mapper = mapper.replace(
    '      return n;\n    })(),\n    vehicle_type_name: (formData as any).vehicle_type_name,',
    '      return n as any;\n    })(),\n    vehicle_type_name: (formData as any).vehicle_type_name,'
)

write('modules/autoria/shared/utils/carAdDataMapper.ts', mapper)

# ── 3. Check remaining carAdDataMapper errors ────────────────────────────────
print('\nDone!')
