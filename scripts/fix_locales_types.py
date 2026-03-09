#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix all invalid TypeScript interface keys in locales/types.ts"""
import re
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src')
path = os.path.normpath(os.path.join(BASE, 'locales/types.ts'))

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Split into lines and fix each line inside the interface body
lines = content.split('\n')

def needs_quoting(key):
    """Return True if the key contains characters that require quoting in TS interface"""
    # A valid TS identifier: starts with letter/$ /_, followed by letters/digits/$/_
    # Keys with spaces, slashes, special chars, dots, hyphens, @, etc. need quoting
    return bool(re.search(r'[^a-zA-Z0-9_$]', key)) or not re.match(r'^[a-zA-Z_$]', key)

def fix_line(line):
    """Fix a line that contains an invalid interface property key"""
    # Match: INDENT KEY: REST
    # where KEY contains invalid characters (unquoted)
    # Pattern: leading spaces, then key (not starting with quote), then ': ' then rest
    m = re.match(r'^(\s*)([^\'"\s{}\[\]()/*][^:]*?)(\s*:\s*.*)$', line)
    if not m:
        return line, False
    indent = m.group(1)
    key = m.group(2).rstrip()
    rest = m.group(3)
    
    # Skip if key is already valid TS identifier
    if not needs_quoting(key):
        return line, False
    
    # Escape single quotes in key
    escaped_key = key.replace("'", "\\'")
    new_line = f"{indent}'{escaped_key}'{rest}"
    return new_line, True

in_interface = False
fixed_lines = []
fixes = 0

for i, line in enumerate(lines):
    # Track interface start/end
    if re.match(r'^export interface TranslationKeys \{', line):
        in_interface = True
        fixed_lines.append(line)
        continue
    
    # End of interface (closing brace at column 0)
    if in_interface and re.match(r'^\}$', line):
        in_interface = False
        fixed_lines.append(line)
        continue
    
    if in_interface:
        new_line, changed = fix_line(line)
        if changed:
            fixes += 1
        fixed_lines.append(new_line)
    else:
        fixed_lines.append(line)

# Also fix the \\\\n back to \\n (we over-escaped in previous script)
result = '\n'.join(fixed_lines)
if "'\\\\\\\\n'" in result:
    result = result.replace("'\\\\\\\\n'", "'\\\\n'")

# Fix doubled backslash from previous run
result = result.replace("'\\\\\\\\n': string;", "'\\\\n': string;")

# Remove empty-key patterns that can't be fixed
# Pattern: line with just empty quotes
result = re.sub(r"\n\s*''\s*\{[^}]*\}[^\n]*", '', result)

with open(path, 'w', encoding='utf-8') as f:
    f.write(result)

print(f'[OK] locales/types.ts: fixed {fixes} additional invalid keys')

# Verify: check remaining errors
remaining = []
lines2 = result.split('\n')
in_iface = False
for i, line in enumerate(lines2):
    if 'export interface TranslationKeys' in line:
        in_iface = True
        continue
    if in_iface and re.match(r'^\}$', line):
        in_iface = False
        continue
    if in_iface:
        # Check for unquoted keys with special chars
        m = re.match(r'^\s*([^\'"\s{}\[\]()][^:]*?)\s*:\s', line)
        if m:
            key = m.group(1).strip()
            if needs_quoting(key):
                remaining.append(f'  line {i+1}: {repr(line.strip())}')

if remaining:
    print(f'[WARN] Still {len(remaining)} potentially invalid keys:')
    for r in remaining[:20]:
        print(r)
else:
    print('[OK] No more invalid keys detected')
