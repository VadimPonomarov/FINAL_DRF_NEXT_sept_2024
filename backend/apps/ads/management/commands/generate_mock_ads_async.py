"""
⚡ АСИНХРОННА ГЕНЕРАЦІЯ MOCK ОГОЛОШЕНЬ
Management command для запуску через Celery
"""
from django.core.management.base import BaseCommand
from apps.ads.tasks.mock_generation_tasks import generate_bulk_mock_ads


class Command(BaseCommand):
    help = '⚡ Генерує mock оголошення АСИНХРОННО через Celery (швидко!)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Кількість оголошень для генерації (за замовчуванням: 50)'
        )
        parser.add_argument(
            '--user-id',
            type=int,
            default=None,
            help='ID користувача (якщо не вказано, створить нового)'
        )

    def handle(self, *args, **options):
        count = options['count']
        user_id = options['user_id']

        self.stdout.write(f'⚡ Запускаємо АСИНХРОННУ генерацію {count} оголошень...')
        
        # Запускаємо Celery task
        result = generate_bulk_mock_ads.delay(count=count, user_id=user_id)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Генерація запущена!\n'
                f'📊 Task ID: {result.id}\n'
                f'💡 Оголошення будуть створюватися в фоновому режимі\n'
                f'🔍 Перевірте логи Celery worker для прогресу\n'
            )
        )
        
        self.stdout.write('\n📝 Для перевірки статусу:')
        self.stdout.write('   docker logs celery-worker -f')
