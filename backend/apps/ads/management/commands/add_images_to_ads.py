"""
Django management command to add images to car ads that don't have any.
Uses pollinations.ai for fast image generation.
"""

import urllib.parse
from django.core.management.base import BaseCommand
from apps.ads.models import CarAd, AddImageModel


class Command(BaseCommand):
    help = 'Add images to car ads that don\'t have any images'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=None,
            help='Maximum number of ads to process (default: all)'
        )

    def handle(self, *args, **options):
        max_count = options.get('count')
        
        self.stdout.write('🖼️  ДОБАВЛЕНИЕ ИЗОБРАЖЕНИЙ К ОБЪЯВЛЕНИЯМ')
        self.stdout.write('=' * 70)
        
        # Получаем все объявления
        all_ads = CarAd.objects.all()
        self.stdout.write(f'\n📊 Всего объявлений: {all_ads.count()}')
        
        # Находим объявления без изображений
        ads_without_images = []
        for ad in all_ads:
            if ad.images.count() == 0:
                ads_without_images.append(ad)
                if max_count and len(ads_without_images) >= max_count:
                    break
        
        self.stdout.write(f'Объявлений без изображений: {len(ads_without_images)}')
        
        if not ads_without_images:
            self.stdout.write(self.style.SUCCESS('\n✅ Все объявления уже имеют изображения!'))
            return
        
        self.stdout.write(f'\n🎨 Добавление изображений для {len(ads_without_images)} объявлений...')
        self.stdout.write('-' * 70)
        
        success_count = 0
        error_count = 0
        
        for i, ad in enumerate(ads_without_images, 1):
            try:
                self.stdout.write(f'\n{i}/{len(ads_without_images)}. ID {ad.id}: {ad.title[:50]}')
                
                # Получаем информацию об автомобиле
                mark_name = ad.mark.name if ad.mark else 'Car'
                model_name = ad.model.name if ad.model else 'Model'
                year = ad.dynamic_fields.get('year', 2020)
                color = ad.dynamic_fields.get('color', 'silver')
                
                self.stdout.write(f'   {mark_name} {model_name} {year}, {color}')
                
                # Генерируем 3 изображения с разных ракурсов
                angles = ['front', 'side', 'rear']
                images_created = 0
                
                for img_num, angle in enumerate(angles):
                    try:
                        # Создаем промпт
                        prompt = f"Professional photo of {year} {mark_name} {model_name}, {color} color, {angle} view, high quality, automotive photography, studio lighting"
                        
                        # Кодируем промпт для URL
                        encoded_prompt = urllib.parse.quote(prompt)
                        
                        # Создаем уникальный seed на основе ID объявления
                        seed = (ad.id * 1000) + img_num
                        
                        # Генерируем URL изображения через pollinations.ai
                        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=768&model=flux&enhance=true&seed={seed}"
                        
                        # Сохраняем изображение в базу
                        AddImageModel.objects.create(
                            ad=ad,
                            image_url=image_url,
                            caption=f"{mark_name} {model_name} - {angle} view",
                            order=img_num,
                            is_primary=(img_num == 0)
                        )
                        
                        images_created += 1
                        self.stdout.write(f'   ✅ Добавлено изображение {img_num + 1}/3 ({angle})')
                        
                    except Exception as img_error:
                        self.stdout.write(self.style.WARNING(f'   ⚠️  Ошибка создания изображения {angle}: {str(img_error)[:50]}'))
                        continue
                
                if images_created > 0:
                    success_count += 1
                    self.stdout.write(self.style.SUCCESS(f'   ✅ Добавлено {images_created} изображений для объявления {ad.id}'))
                else:
                    error_count += 1
                    self.stdout.write(self.style.ERROR(f'   ❌ Не удалось добавить изображения'))
                
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'   ❌ Ошибка: {str(e)[:100]}'))
                continue
        
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS(f'✅ Обработано объявлений: {success_count}/{len(ads_without_images)}'))
        if error_count > 0:
            self.stdout.write(self.style.WARNING(f'⚠️  Ошибок: {error_count}'))
        self.stdout.write(self.style.SUCCESS('\n🎉 Добавление изображений завершено!'))

