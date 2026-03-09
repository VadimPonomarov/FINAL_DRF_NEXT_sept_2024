"""
Management command to replace broken Pollinations.ai image URLs with
reliable picsum.photos placeholder images for all seeded ads.

Usage:
    python manage.py fix_ad_images
    python manage.py fix_ad_images --dry-run
"""
from django.core.management.base import BaseCommand
from apps.ads.models import AddImageModel


class Command(BaseCommand):
    help = 'Replace Pollinations.ai image URLs with reliable picsum.photos placeholders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without saving',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        qs = AddImageModel.objects.filter(
            image_url__icontains='pollinations.ai'
        ).select_related('ad')

        total = qs.count()
        self.stdout.write(f'Found {total} images with Pollinations.ai URLs')

        if total == 0:
            self.stdout.write(self.style.SUCCESS('Nothing to fix.'))
            return

        updated = 0
        for img in qs:
            seed = f"{img.ad_id}_{img.order}_{img.id}"
            new_url = f"https://picsum.photos/seed/{seed}/800/600"

            if dry_run:
                self.stdout.write(f'  [DRY] #{img.id} ad={img.ad_id} → {new_url}')
            else:
                img.image_url = new_url
                img.save(update_fields=['image_url'])
                updated += 1

        if dry_run:
            self.stdout.write(self.style.WARNING(f'Dry run: {total} images would be updated.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Updated {updated}/{total} images successfully.'))
