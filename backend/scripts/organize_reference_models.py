#!/usr/bin/env python
"""
Script to move reference/dictionary models to a dedicated reference directory.
"""
import os
import re
import shutil
from pathlib import Path

# Define reference models to be moved
REFERENCE_MODELS = [
    'car_make_model.py',
    'car_model.py',
    'car_generation_model.py',
    'car_modification_model.py',
    'car_color_model.py',
    'region_model.py',
    'city_model.py'
]

def create_reference_dir(models_dir):
    """Create reference directory if it doesn't exist."""
    reference_dir = models_dir / 'reference'
    if not reference_dir.exists():
        reference_dir.mkdir()
        print(f"Created directory: {reference_dir}")
    return reference_dir

def move_model_files(models_dir, reference_dir):
    """Move reference model files to the reference directory."""
    moved_files = []
    for model_file in REFERENCE_MODELS:
        src = models_dir / model_file
        if src.exists():
            dst = reference_dir / model_file
            shutil.move(str(src), str(dst))
            moved_files.append(model_file)
            print(f"Moved: {src} -> {dst}")
    return moved_files

def update_imports(models_dir, reference_dir):
    """Update imports in all Python files to reflect the new locations."""
    # Get all Python files in the models directory
    python_files = list(models_dir.glob('*.py')) + list(reference_dir.glob('*.py'))
    
    for file_path in python_files:
        if file_path.name in ['__init__.py', 'reference/__init__.py']:
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            updated_content = content
            
            # Update relative imports for reference models
            for model in REFERENCE_MODELS:
                model_name = model.replace('.py', '')
                # Update relative imports
                updated_content = re.sub(
                    fr'from\s+\.\s+import\s+{re.escape(model_name)}\b',
                    f'from .reference import {model_name}',
                    updated_content
                )
                updated_content = re.sub(
                    fr'from\s+\.{re.escape(model_name)}\s+import',
                    f'from .reference.{model_name} import',
                    updated_content
                )
                
                # Update absolute imports
                updated_content = re.sub(
                    fr'from\s+apps\.ads\.models\.{re.escape(model_name)}\s+import',
                    f'from apps.ads.models.reference.{model_name} import',
                    updated_content
                )
            
            if updated_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
                print(f"Updated imports in: {file_path}")
                
        except Exception as e:
            print(f"Error updating imports in {file_path}: {e}")

def update_init_files(models_dir, reference_dir):
    """Update __init__.py files to reflect the new structure."""
    # Update main models/__init__.py
    init_file = models_dir / '__init__.py'
    if init_file.exists():
        with open(init_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove imports for reference models
        updated_content = content
        for model in REFERENCE_MODELS:
            model_name = model.replace('_model.py', '')
            updated_content = re.sub(
                fr'from\s+\.{re.escape(model_name)}_model\s+import\s+\w+\s*\n',
                '',
                updated_content
            )
        
        if updated_content != content:
            with open(init_file, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            print(f"Updated: {init_file}")
    
    # Create reference/__init__.py if it doesn't exist
    ref_init_file = reference_dir / '__init__.py'
    if not ref_init_file.exists():
        with open(ref_init_file, 'w', encoding='utf-8') as f:
            f.write("# Reference models for the ads app\n\n")
            for model in REFERENCE_MODELS:
                model_name = model.replace('.py', '')
                class_name = ''.join(word.capitalize() for word in model_name.split('_'))
                f.write(f'from .{model_name} import {class_name}\n')
            
            f.write('\n__all__ = [\n')
            for model in REFERENCE_MODELS:
                model_name = model.replace('.py', '')
                class_name = ''.join(word.capitalize() for word in model_name.split('_'))
                f.write(f"    '{class_name}',\n")
            f.write(']\n')
        
        print(f"Created: {ref_init_file}")

def main():
    # Get the models directory
    base_dir = Path(__file__).parent.parent
    models_dir = base_dir / 'apps' / 'ads' / 'models'
    
    if not models_dir.exists():
        print(f"Error: Models directory not found at {models_dir}")
        return
    
    print("Organizing reference models...\n")
    
    # Create reference directory
    reference_dir = create_reference_dir(models_dir)
    
    # Move reference model files
    print("\nMoving reference model files:")
    moved_files = move_model_files(models_dir, reference_dir)
    
    if not moved_files:
        print("No reference model files were moved.")
        return
    
    # Update imports in all Python files
    print("\nUpdating imports...")
    update_imports(models_dir, reference_dir)
    
    # Update __init__.py files
    print("\nUpdating __init__.py files...")
    update_init_files(models_dir, reference_dir)
    
    print("\nDone! Reference models have been organized.")
    print(f"Moved {len(moved_files)} files to {reference_dir}")

if __name__ == "__main__":
    main()
