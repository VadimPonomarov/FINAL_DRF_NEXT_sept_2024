#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix remaining TypeScript errors: CarAdFormData index signature + locale duplicates"""
import os, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src')

def read(rel):
    p = os.path.normpath(os.path.join(BASE, rel))
    with open(p, 'r', encoding='utf-8') as f: return f.read()

def write(rel, content):
    p = os.path.normpath(os.path.join(BASE, rel))
    with open(p, 'w', encoding='utf-8') as f: f.write(content)
    print(f'[OK] {rel}')

# ── 1. autoria.ts: add index signature + missing fields to CarAdFormData ─────
autoria = read('modules/autoria/shared/types/autoria.ts')

# Add missing fields and index signature to CarAdFormData (before closing })
old_end = '''  is_urgent?: boolean;
  is_highlighted?: boolean;

  contact_name?: string;
  additional_info?: string;
  contacts?: AdContact[];
  use_profile_contacts?: boolean;

  phone?: string;
}'''

new_end = '''  is_urgent?: boolean;
  is_highlighted?: boolean;

  contact_name?: string;
  additional_info?: string;
  contacts?: AdContact[];
  use_profile_contacts?: boolean;

  phone?: string;

  status?: AdStatus;
  tags?: string[];
  auto_renewal?: boolean;
  visibility_settings?: Record<string, any>;
  metadata?: Record<string, any>;

  [key: string]: any;
}'''

if old_end in autoria:
    autoria = autoria.replace(old_end, new_end)
    write('modules/autoria/shared/types/autoria.ts', autoria)
else:
    print('[SKIP] autoria.ts: pattern not found, showing end of CarAdFormData:')
    idx = autoria.find('export interface CarAdFormData')
    end = autoria.find('\n}', idx) + 2
    print(repr(autoria[end-100:end+5]))

# ── 2. locales/en.ts: remove duplicate top-level keys ────────────────────────
def remove_duplicate_top_keys(content, filepath):
    """Remove duplicate top-level object keys in a nested object literal"""
    lines = content.split('\n')
    seen_at_depth = {}  # depth -> set of keys seen
    result = []
    depth = 0
    skip_until_depth = None
    skip_count = 0

    for i, line in enumerate(lines):
        opens = line.count('{')
        closes = line.count('}')

        # Check if we're in skip mode
        if skip_until_depth is not None:
            result.append(f'// [REMOVED DUPLICATE] {line}')
            depth += opens - closes
            if depth <= skip_until_depth:
                skip_until_depth = None
            continue

        # Count depth change BEFORE checking
        # Check for duplicate key at current depth
        # Pattern: whitespace + key + ": {" or whitespace + key + ":"
        m = re.match(r'^(\s+)(\w+)\s*:', line)
        if m:
            indent = len(m.group(1))
            key = m.group(2)
            depth_key = (depth, indent)

            if depth_key not in seen_at_depth:
                seen_at_depth[depth_key] = set()

            if key in seen_at_depth[depth_key]:
                skip_count += 1
                print(f'  [{filepath}] Removing duplicate key "{key}" at line {i+1}')
                # If this opens a block, skip until matching }
                if '{' in line and '}' not in line:
                    skip_until_depth = depth
                result.append(f'// [REMOVED DUPLICATE] {line}')
                depth += opens - closes
                continue
            else:
                seen_at_depth[depth_key].add(key)

        result.append(line)
        depth += opens - closes

    return '\n'.join(result), skip_count

for locale_file in ['locales/en.ts', 'locales/ru.ts']:
    content = read(locale_file)
    fixed, count = remove_duplicate_top_keys(content, locale_file)
    if count > 0:
        write(locale_file, fixed)
        print(f'  Removed {count} duplicate keys')
    else:
        print(f'[INFO] {locale_file}: no duplicates found by algorithm')
        # Try simpler approach - find lines around known error lines
        if locale_file == 'locales/en.ts':
            lines = content.split('\n')
            # Show lines around 679 and 888
            for err_line in [678, 887, 1690, 1726]:
                if err_line < len(lines):
                    print(f'  Line {err_line+1}: {repr(lines[err_line][:80])}')

print('\nDone!')
