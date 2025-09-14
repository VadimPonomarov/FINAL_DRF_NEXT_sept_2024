#!/usr/bin/env python
"""
Script to add '_model' suffix to model files.
"""
import os
import re
from pathlib import Path

def rename_model_files():
    # Get the models directory
    models_dir = Path(__file__).parent.parent / 'apps' / 'ads' / 'models'
    
    # Get all Python files in the models directory
    model_files = [f for f in models_dir.glob('*.py') if f.name != '__init__.py']
    
    # Track renames for updating imports
    renames = {}
    
    # Rename files
    for file_path in model_files:
        if not file_path.name.endswith('_model.py'):
            new_name = file_path.stem + '_model.py'
            new_path = file_path.with_name(new_name)
            
            # Skip if the target file already exists
            if new_path.exists():
                print(f"Skipping {file_path.name} - {new_name} already exists")
                continue
                
            # Rename the file
            try:
                file_path.rename(new_path)
                renames[file_path.name] = new_name
                print(f"Renamed: {file_path.name} → {new_name}")
            except Exception as e:
                print(f"Error renaming {file_path}: {e}")
    
    # Update imports in all Python files
    for file_path in models_dir.glob('*.py'):
        if file_path.name == '__init__.py':
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            updated_content = content
            for old_name, new_name in renames.items():
                # Update relative imports
                updated_content = re.sub(
                    fr'from\s+\.\s+import\s+{re.escape(old_name[:-3])}\b',
                    f'from . import {new_name[:-3]}',
                    updated_content
                )
                updated_content = re.sub(
                    fr'from\s+\.{re.escape(old_name[:-3])}\s+import',
                    f'from .{new_name[:-3]} import',
                    updated_content
                )
                
                # Update imports from the models package
                updated_content = re.sub(
                    fr'from\s+apps\.ads\.models\.{re.escape(old_name[:-3])}\s+import',
                    f'from apps.ads.models.{new_name[:-3]} import',
                    updated_content
                )
            
            if updated_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
                print(f"Updated imports in {file_path.name}")
                
        except Exception as e:
            print(f"Error updating imports in {file_path}: {e}")
    
    # Update __init__.py
    init_file = models_dir / '__init__.py'
    try:
        with open(init_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        updated_content = content
        for old_name, new_name in renames.items():
            updated_content = re.sub(
                fr'from\s+\.{re.escape(old_name[:-3])}\s+import',
                f'from .{new_name[:-3]} import',
                updated_content
            )
        
        if updated_content != content:
            with open(init_file, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            print("Updated __init__.py with new module names")
            
    except Exception as e:
        print(f"Error updating __init__.py: {e}")

if __name__ == "__main__":
    rename_model_files()
