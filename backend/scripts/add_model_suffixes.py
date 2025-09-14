#!/usr/bin/env python
"""
Script to add 'Model' suffix to all model classes in the specified files.
"""
import os
import re
from pathlib import Path

# List of files to process (relative to the script's location)
MODEL_FILES = [
    'apps/ads/models/ad_statistics.py',
    'apps/ads/models/car_ad.py',
    'apps/ads/models/car_color.py',
    'apps/ads/models/car_generation.py',
    'apps/ads/models/car_make.py',
    'apps/ads/models/car_metadata.py',
    'apps/ads/models/car_model.py',
    'apps/ads/models/car_moderation.py',
    'apps/ads/models/car_modification.py',
    'apps/ads/models/car_pricing.py',
    'apps/ads/models/car_specification.py',
    'apps/ads/models/city.py',
    'apps/ads/models/exchange_rate.py',
    'apps/ads/models/exchange_rates.py',
    'apps/ads/models/image.py',
    'apps/ads/models/moderation.py',
    'apps/ads/models/price_history.py',
    'apps/ads/models/region.py',
]

def add_model_suffix(file_path):
    """Add 'Model' suffix to model classes in the specified file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all class definitions that inherit from models.Model or BaseModel
        pattern = r'class\s+(\w+)\s*\(\s*(?:models\.Model|BaseModel)\b'
        
        def replace_match(match):
            class_name = match.group(1)
            if not class_name.endswith('Model'):
                return f'class {class_name}Model('
            return match.group(0)
        
        new_content = re.sub(pattern, replace_match, content)
        
        # Update imports if needed
        new_content = re.sub(
            r'from\s+\.\w+\s+import\s+([^\n,]+)(?=,|\s*$)',
            lambda m: m.group(0) if 'Model' in m.group(1) else f'{m.group(0)}, {m.group(1)}Model',
            new_content
        )
        
        # Update references in ForeignKey, OneToOneField, etc.
        new_content = re.sub(
            r'(ForeignKey|OneToOneField|ManyToManyField|GenericForeignKey)\s*\(\s*([\'"])?([^\'"\s,]+)([\'"])?',
            lambda m: f"{m.group(1)}({m.group(2) or ''}{m.group(3)}Model{m.group(4) or ''}"
            if not m.group(3).endswith('Model') and not m.group(3).startswith("'") and not m.group(3).startswith('"')
            else m.group(0),
            new_content
        )
        
        # Only write if changes were made
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        return False
    
    except Exception as e:
        print(f"Error processing {file_path}: {str(e)}")
        return False

def main():
    # Get the project root directory (one level up from the script's directory)
    base_dir = Path(__file__).parent.parent
    updated_files = []
    
    for rel_path in MODEL_FILES:
        # Convert path to use the correct separator for the current OS
        rel_path = Path(rel_path)
        file_path = base_dir / rel_path
        
        if file_path.exists():
            print(f"Processing: {file_path}")
            if add_model_suffix(file_path):
                updated_files.append(str(rel_path))
                print(f"✅ Updated: {rel_path}")
            else:
                print(f"ℹ️  No changes needed: {rel_path}")
        else:
            print(f"❌ File not found: {file_path}")
            print(f"   Current working directory: {os.getcwd()}")
            print(f"   Looking in: {file_path.absolute()}")
    
    print("\nSummary:")
    if updated_files:
        print("\nUpdated files:")
        for file in updated_files:
            print(f"- {file}")
    else:
        print("No files were updated.")

if __name__ == "__main__":
    main()
