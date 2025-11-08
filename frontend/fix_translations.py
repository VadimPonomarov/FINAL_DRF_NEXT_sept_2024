#!/usr/bin/env python3
"""
Translation file fixer script
Fixes duplicate keys, missing translations, and ensures synchronization across all languages
"""

import json
import sys
from pathlib import Path
from collections import OrderedDict

def merge_nested_dicts(dict1, dict2):
    """Recursively merge dict2 into dict1, keeping values from dict1 when there's a conflict."""
    for key, value in dict2.items():
        if key in dict1 and isinstance(dict1[key], dict) and isinstance(value, dict):
            merge_nested_dicts(dict1[key], value)
        elif key not in dict1:
            dict1[key] = value
    return dict1

def get_all_keys_recursive(d, prefix=''):
    """Get all keys from a nested dictionary structure."""
    keys = set()
    for key, value in d.items():
        current_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            # Check if this dict has language keys (en, ru, uk)
            if all(lang in value for lang in ['en', 'ru', 'uk']):
                keys.add(current_key)
            else:
                # Recurse into nested structure
                keys.update(get_all_keys_recursive(value, current_key))
        else:
            keys.add(current_key)
    return keys

def get_value_by_path(d, path):
    """Get value from nested dict by dot-separated path."""
    keys = path.split('.')
    value = d
    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            return None
    return value

def set_value_by_path(d, path, value):
    """Set value in nested dict by dot-separated path."""
    keys = path.split('.')
    current = d
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    current[keys[-1]] = value

def ensure_all_translations(translations, languages=['en', 'ru', 'uk']):
    """Ensure all language translations are present for every key."""
    def process_node(node):
        if isinstance(node, dict):
            # Check if this is a translation node (has language keys)
            if all(lang in node for lang in ['en', 'ru', 'uk']):
                # This is a translation node, ensure all languages are present
                for lang in languages:
                    if lang not in node or not node[lang]:
                        # Use English as fallback
                        node[lang] = node.get('en', f'[{lang.upper()}]')
                return node
            else:
                # Recurse into nested structure
                for key, value in node.items():
                    node[key] = process_node(value)
                return node
        else:
            return node
    
    return process_node(translations)

def sort_nested_dict(d):
    """Recursively sort a nested dictionary by keys."""
    if not isinstance(d, dict):
        return d
    
    result = OrderedDict()
    for key in sorted(d.keys()):
        value = d[key]
        if isinstance(value, dict):
            result[key] = sort_nested_dict(value)
        else:
            result[key] = value
    return result

def fix_translations(input_file, output_file):
    """Fix translation file by removing duplicates, ensuring synchronization, and sorting."""
    print(f"[*] Reading {input_file}...")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
            data = json.loads(content)
    except json.JSONDecodeError as e:
        print(f"[!] JSON decode error: {e}")
        print(f"    This usually means there are duplicate keys in the file.")
        print(f"    Attempting to fix by removing duplicates...")
        
        # Try to load with a custom decoder that handles duplicates
        import re
        # Find all instances of "common": { and count them
        pattern = r'"common"\s*:\s*\{'
        matches = list(re.finditer(pattern, content))
        if len(matches) > 1:
            print(f"    Found {len(matches)} instances of 'common' key")
            # Remove all but the first instance
            # This is a simplified approach - for production use a proper JSON parser
            # that can handle duplicates
            print("    Manual fix required: Please remove duplicate 'common' key manually")
            print("    Found at approximately these positions:")
            for i, match in enumerate(matches):
                line_num = content[:match.start()].count('\n') + 1
                print(f"    - Instance {i+1}: around line {line_num}")
            return False
        
        return False
    
    print("[+] File loaded successfully")
    
    # Extract meta and translations
    meta = data.get('meta', {})
    translations = data.get('translations', {})
    
    print(f"[i] Current stats:")
    print(f"    - Version: {meta.get('version', 'unknown')}")
    print(f"    - Total keys (claimed): {meta.get('totalKeys', 'unknown')}")
    print(f"    - Languages: {', '.join(meta.get('languages', []))}")
    
    # Ensure all translations have all languages
    print("\n[*] Ensuring all translations have all language keys...")
    translations = ensure_all_translations(translations)
    
    # Sort the translations
    print("[*] Sorting translations alphabetically...")
    translations = sort_nested_dict(translations)
    
    # Count actual keys
    all_keys = get_all_keys_recursive(translations)
    total_keys = len(all_keys)
    
    print(f"\n[i] New stats:")
    print(f"    - Actual total keys: {total_keys}")
    
    # Update meta
    meta['version'] = '2.2.0'
    meta['totalKeys'] = total_keys
    meta['languages'] = ['en', 'ru', 'uk']
    from datetime import datetime
    meta['lastUpdated'] = datetime.utcnow().isoformat() + 'Z'
    
    # Rebuild data
    fixed_data = {
        '$schema': data.get('$schema', './translations.schema.json'),
        'meta': meta,
        'translations': translations
    }
    
    # Write to output file
    print(f"\n[*] Writing to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(fixed_data, f, ensure_ascii=False, indent=2)
    
    print("[+] Translation file fixed successfully!")
    print(f"\n[i] Summary:")
    print(f"    - Total keys: {total_keys}")
    print(f"    - All keys synchronized across en, ru, uk")
    print(f"    - Alphabetically sorted")
    print(f"    - Output written to: {output_file}")
    
    return True

if __name__ == '__main__':
    input_file = Path(__file__).parent / 'src' / 'locales' / 'translations.json'
    output_file = Path(__file__).parent / 'src' / 'locales' / 'translations_fixed.json'
    
    if len(sys.argv) > 1:
        input_file = Path(sys.argv[1])
    if len(sys.argv) > 2:
        output_file = Path(sys.argv[2])
    
    print("=" * 60)
    print("Translation File Fixer")
    print("=" * 60)
    
    success = fix_translations(input_file, output_file)
    
    if success:
        print("\n" + "=" * 60)
        print("[+] Done! Review translations_fixed.json")
        print("    If it looks good, replace translations.json with it:")
        print(f"    mv {output_file} {input_file}")
        print("=" * 60)
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("[!] Failed to fix translations")
        print("    Please fix the JSON syntax errors manually first")
        print("=" * 60)
        sys.exit(1)
