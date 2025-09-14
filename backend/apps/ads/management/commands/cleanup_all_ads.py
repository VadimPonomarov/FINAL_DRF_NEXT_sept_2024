from django.core.management.base import BaseCommand
from apps.ads.models.car_ad_model import CarAd


class Command(BaseCommand):
    help = 'Удаляет все объявления из базы данных'

    def handle(self, *args, **options):
        # Получаем все объявления
        all_ads = CarAd.objects.all()
        total_count = all_ads.count()
        
        self.stdout.write(f'🧹 Найдено {total_count} объявлений для удаления...')
        
        if total_count == 0:
            self.stdout.write(self.style.SUCCESS('✅ База данных уже пуста'))
            return
        
        # Удаляем все объявления
        deleted_count, deleted_details = all_ads.delete()
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Успешно удалено {total_count} объявлений')
        )
        self.stdout.write(f'📊 Детали: {deleted_details}')
