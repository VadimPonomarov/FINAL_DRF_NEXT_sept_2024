#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Remove duplicate string-keyed entries from locale files (en.ts, ru.ts)"""
import os, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src')

def fix_locale(rel):
    path = os.path.normpath(os.path.join(BASE, rel))
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Track seen string keys (flat: `  "key":` pattern)
    seen_string_keys = set()
    # Track seen identifier keys within their parent scope (by indentation level)
    # We'll use a simpler approach: track (indent_level, key) pairs
    seen_ident_keys = {}  # (indent_spaces, key) -> first line index

    result = []
    removed = 0

    # Pattern for string key: `  "some.key": value`
    str_key_pat = re.compile(r'^(\s*)"([^"]+)"\s*:')
    # Pattern for identifier key: `  someKey:` or `  someKey?: ` - but NOT inside a value
    ident_key_pat = re.compile(r'^(\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:(?!\s*//)')

    for i, line in enumerate(lines):
        # Check string key duplicates (flat-keyed locale entries)
        m = str_key_pat.match(line)
        if m:
            indent = len(m.group(1))
            key = m.group(2)
            k = (indent, key)
            if k in seen_string_keys:
                removed += 1
                print(f'  Remove dup at line {i+1}: {repr(line[:70])}')
                continue
            seen_string_keys.add(k)
            result.append(line)
            continue

        # Check identifier key duplicates (nested object keys)
        m2 = ident_key_pat.match(line)
        if m2:
            indent = len(m2.group(1))
            key = m2.group(2)
            # Skip common single-char keys or language keywords
            if key in ('true', 'false', 'null', 'undefined', 'return'):
                result.append(line)
                continue
            k = (indent, key)
            if k in seen_ident_keys:
                # Duplicate! Skip this line AND its block if it opens {
                removed += 1
                print(f'  Remove dup ident at line {i+1}: {repr(line[:70])}')
                # If line opens a block, we need to skip until closing
                if '{' in line and '}' not in line:
                    # Multi-line block - skip until matching }
                    depth = line.count('{') - line.count('}')
                    while depth > 0 and i + 1 < len(lines):
                        i += 1
                        depth += lines[i].count('{') - lines[i].count('}')
                        removed += 1
                continue
            seen_ident_keys[k] = i
            result.append(line)
            continue

        result.append(line)

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(result)
    print(f'[OK] {rel}: removed {removed} duplicate entries')

fix_locale('locales/en.ts')
fix_locale('locales/ru.ts')
print('\nDone!')
