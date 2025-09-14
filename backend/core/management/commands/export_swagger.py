"""
Django management command to export Swagger documentation to static files.
Usage: python manage.py export_swagger
"""

import json
import yaml
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from drf_yasg.generators import OpenAPISchemaGenerator
from drf_yasg import openapi
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory


class Command(BaseCommand):
    help = 'Export Swagger documentation to static YAML and JSON files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            default='docs/swagger',
            help='Output directory for exported files (default: docs/swagger)'
        )
        parser.add_argument(
            '--filename',
            type=str,
            default='api_documentation',
            help='Base filename for exported files (default: api_documentation)'
        )

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        filename = options['filename']
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        self.stdout.write(
            self.style.SUCCESS('🚀 Starting Swagger documentation export...')
        )
        
        try:
            # Create a fake request for schema generation
            factory = RequestFactory()
            request = factory.get('/')
            request.user = AnonymousUser()
            
            # Generate OpenAPI schema
            generator = OpenAPISchemaGenerator(
                info=openapi.Info(
                    title="Car Sales Platform API",
                    default_version="v1",
                    description="Complete API documentation for the car sales platform",
                    contact=openapi.Contact(email="pvs.versia@gmail.com"),
                    license=openapi.License(name="BSD License"),
                ),
                url='http://localhost:8000',
            )
            
            schema = generator.get_schema(request, public=True)
            
            # Convert to dictionary
            schema_dict = schema.as_dict() if hasattr(schema, 'as_dict') else dict(schema)
            
            # Export to YAML
            yaml_path = os.path.join(output_dir, f'{filename}.yaml')
            with open(yaml_path, 'w', encoding='utf-8') as yaml_file:
                yaml.dump(
                    schema_dict, 
                    yaml_file, 
                    default_flow_style=False, 
                    allow_unicode=True,
                    sort_keys=False
                )
            
            self.stdout.write(
                self.style.SUCCESS(f'✅ YAML exported to: {yaml_path}')
            )
            
            # Export to JSON
            json_path = os.path.join(output_dir, f'{filename}.json')
            with open(json_path, 'w', encoding='utf-8') as json_file:
                json.dump(
                    schema_dict, 
                    json_file, 
                    indent=2, 
                    ensure_ascii=False
                )
            
            self.stdout.write(
                self.style.SUCCESS(f'✅ JSON exported to: {json_path}')
            )
            
            # Create summary file
            summary_path = os.path.join(output_dir, 'export_summary.md')
            with open(summary_path, 'w', encoding='utf-8') as summary_file:
                summary_file.write(f"""# 📋 Swagger Documentation Export Summary

## 📁 Exported Files:
- **YAML**: `{filename}.yaml`
- **JSON**: `{filename}.json`

## 🌐 Live Documentation URLs:
- **Swagger UI**: http://localhost:8000/api/doc/
- **ReDoc**: http://localhost:8000/api/doc/redoc/
- **Dynamic YAML**: http://localhost:8000/api/doc/?format=yaml
- **Dynamic JSON**: http://localhost:8000/api/doc/?format=json

## 📊 Export Details:
- Export Date: {self._get_current_datetime()}
- Total Paths: {len(schema_dict.get('paths', {}))}
- API Version: {schema_dict.get('info', {}).get('version', 'N/A')}
- API Title: {schema_dict.get('info', {}).get('title', 'N/A')}

## 🎯 Usage:
These static files can be used for:
- Documentation hosting
- API client generation
- Version control tracking
- Offline documentation access

## 🔄 Regeneration:
To update these files, run:
```bash
python manage.py export_swagger
```
""")
            
            self.stdout.write(
                self.style.SUCCESS(f'✅ Summary created: {summary_path}')
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'🎉 Export completed successfully!\n'
                    f'📁 Files saved to: {output_dir}\n'
                    f'📊 Total paths exported: {len(schema_dict.get("paths", {}))}'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Export failed: {str(e)}')
            )
            raise
    
    def _get_current_datetime(self):
        from datetime import datetime
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')
