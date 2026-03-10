#!/usr/bin/env python3
# -*- coding: utf-8 -*-
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

# ── 1. carAdDataMapper.ts: remove duplicate block lines 517-533 ──────────────
mapper = read('modules/autoria/shared/utils/carAdDataMapper.ts')

old_dup_block = '''    // ✅ СИНХРОНИЗАЦИЯ: Технические характеристики (соответствуют CarSpecificationModel)
    year: formData.year ? parseInt(String(formData.year)) : undefined,
    mileage_km: formData.mileage ? parseInt(String(formData.mileage)) : undefined, // Frontend mileage -> Backend mileage_km
    engine_volume: formData.engine_volume ? parseFloat(String(formData.engine_volume)) : undefined,
    engine_power: formData.engine_power ? parseInt(String(formData.engine_power)) : undefined,
    fuel_type: formData.fuel_type,
    transmission_type: formData.transmission || formData.transmission_type, // Frontend transmission -> Backend transmission_type
    drive_type: formData.drive_type,
    body_type: formData.body_type,
    color: formData.color,
    steering_wheel: formData.steering_wheel,
    condition: (() => {
      const m = formData.mileage ? parseInt(String(formData.mileage)) : undefined;
      const cond = formData.condition;
      if (cond === 'damaged') return 'damaged';
      if (typeof m === 'number' && !isNaN(m)) return m < 5000 ? 'new' : 'used';
      return cond || 'used';
    })(),
    vin_code: formData.vin_code,
    license_plate: formData.license_plate,
    number_of_doors: formData.number_of_doors ? parseInt(String(formData.number_of_doors)) : undefined,
    number_of_seats: formData.number_of_seats ? parseInt(String(formData.number_of_seats)) : undefined,
    generation: formData.generation,
    modification: formData.modification,'''

new_dup_block = '''    // ✅ Технические характеристики с parseInt/parseFloat
    year: formData.year ? parseInt(String(formData.year)) : undefined,
    mileage_km: formData.mileage ? parseInt(String(formData.mileage)) : undefined,
    engine_volume: formData.engine_volume ? parseFloat(String(formData.engine_volume)) : undefined,
    engine_power: formData.engine_power ? parseInt(String(formData.engine_power)) : undefined,
    generation: formData.generation,
    modification: formData.modification,'''

if old_dup_block in mapper:
    mapper = mapper.replace(old_dup_block, new_dup_block, 1)
    print('[OK] Removed duplicate tech specs block')
else:
    print('[SKIP] Duplicate block not found exactly, trying line-by-line approach')
    lines = mapper.split('\n')
    # Find the second occurrence of "year: formData.year ? parseInt" and remove lines 
    count = 0
    new_lines = []
    skip_next = 0
    for i, line in enumerate(lines):
        if skip_next > 0:
            skip_next -= 1
            continue
        if '// ✅ СИНХРОНИЗАЦИЯ: Технические характеристики (соответствуют CarSpecificationModel)' in line:
            count += 1
            if count == 1:
                # This is the duplicate block - skip next 21 lines
                skip_next = 21
                print(f'  Skipping duplicate block starting at line {i+1}')
                continue
        new_lines.append(line)
    mapper = '\n'.join(new_lines)

# Fix images assignment in apiData->formData direction (line ~291):
# Cast to CarAdImage[] to avoid type mismatch
mapper = mapper.replace(
    '    images: (apiData.images || []).map((img: any) => {',
    '    images: ((apiData.images || []).map((img: any) => {'
)
# Find the closing of that map and cast it
# This is complex, let's instead cast the images field result
mapper = mapper.replace(
    '''      };
    }),
    existing_images: (apiData.existing_images || apiData.images || []).map''',
    '''      };
    })) as any[],
    existing_images: (apiData.existing_images || apiData.images || []).map'''
)
mapper = mapper.replace(
    '''      };
    }),

    // Dynamic fields для совместимости''',
    '''      };
    })) as any[],

    // Dynamic fields для совместимости'''
)

# Fix line ~347: (img as any).image_display_url / (img as any).url
mapper = mapper.replace(
    "const resolvedUrl = img?.image_display_url || img?.image_url || img?.url || img?.image;",
    "const resolvedUrl = (img as any)?.image_display_url || (img as any)?.image_url || (img as any)?.url || (img as any)?.image;",
    1  # only first occurrence (the apiData -> formData one)
)

# Fix vehicle_type possibly null (line ~121)
mapper = mapper.replace(
    "apiData.vehicle_type",
    "(apiData.vehicle_type as any)"
)
# Fix model possibly null
mapper = mapper.replace(
    "apiData.model",
    "(apiData.model as any)"
)

write('modules/autoria/shared/utils/carAdDataMapper.ts', mapper)

# ── 2. autoria.ts: make CarAdImage.created_at optional ───────────────────────
autoria = read('modules/autoria/shared/types/autoria.ts')
autoria = autoria.replace(
    '  created_at: string;\n  [key: string]: any;\n}',
    '  created_at?: string;\n  [key: string]: any;\n}',
    1  # only first occurrence (CarAdImage)
)
write('modules/autoria/shared/types/autoria.ts', autoria)

# ── 3. uk.ts: remove duplicate string-keyed entries ──────────────────────────
uk_error_lines = [762, 870, 3043, 3044, 3045, 3048, 3049, 3215, 3308, 3561]

def remove_lines(rel, lines_to_remove_1based):
    path = os.path.normpath(os.path.join(BASE, rel))
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    to_skip = set()
    for ln in lines_to_remove_1based:
        idx = ln - 1
        if idx >= len(lines): continue
        to_skip.add(idx)
        if '{' in lines[idx] and '}' not in lines[idx]:
            depth = lines[idx].count('{') - lines[idx].count('}')
            j = idx + 1
            while depth > 0 and j < len(lines):
                to_skip.add(j)
                depth += lines[j].count('{') - lines[j].count('}')
                j += 1
    result = [lines[i] for i in range(len(lines)) if i not in to_skip]
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(result)
    print(f'[OK] {rel}: removed {len(to_skip)} lines')

remove_lines('locales/uk.ts', uk_error_lines)
print('\nDone!')
