#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Remove EXACT duplicate lines from locale files based on tsc error line numbers.
For each error line: if the line is a simple property, delete it.
If the line opens a block ({...}), delete the whole block.
"""
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src')

def remove_lines(rel, lines_to_remove_1based):
    """Remove specific 1-based line numbers from file.
    If a line opens a block, also removes the entire block.
    """
    path = os.path.normpath(os.path.join(BASE, rel))
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    to_skip = set()
    for ln in lines_to_remove_1based:
        idx = ln - 1
        if idx >= len(lines):
            print(f'  [WARN] line {ln} out of range ({len(lines)} lines)')
            continue
        line = lines[idx]
        to_skip.add(idx)
        print(f'  Remove line {ln}: {repr(line[:80])}')

        # If this line opens a block without closing it, remove the whole block
        opens = line.count('{')
        closes = line.count('}')
        if opens > closes:
            depth = opens - closes
            j = idx + 1
            while depth > 0 and j < len(lines):
                to_skip.add(j)
                depth += lines[j].count('{') - lines[j].count('}')
                j += 1

    result = [lines[i] for i in range(len(lines)) if i not in to_skip]

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(result)
    print(f'[OK] {rel}: removed {len(to_skip)} lines (from {len(lines)} to {len(result)})')

# en.ts duplicate line numbers (1-based) from tsc output
en_errors = [679, 680, 681, 683, 684, 686, 688, 691, 692, 695, 888, 1691, 1727]

# ru.ts duplicate line numbers (1-based) from tsc output
ru_errors = [
    2835,
    2919, 2920, 2921, 2922,
    3089, 3090, 3091, 3092, 3093, 3094, 3095, 3096, 3097, 3098, 3099, 3100,
    3101, 3102, 3103, 3104, 3105, 3106,
    3115,
    3178, 3179, 3180, 3181, 3182, 3183, 3184, 3185, 3186,
    3189, 3190,
    3196,
    3203, 3204, 3205,
    3208, 3209, 3210, 3211
]

print('=== en.ts ===')
remove_lines('locales/en.ts', en_errors)
print('\n=== ru.ts ===')
remove_lines('locales/ru.ts', ru_errors)
print('\nDone!')
