"""
⚡ АСИНХРОННА ГЕНЕРАЦІЯ MOCK ОГОЛОШЕНЬ
Celery tasks для швидкої генерації тестових даних в фоновому режимі
"""
import logging
from celery import shared_task, group
from django.contrib.auth import get_user_model
from django.db import transaction

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(bind=True, max_retries=2)
def generate_single_mock_ad(
    self,
    user_id: int,
    brand_id: int,
    model_id: int,
    generation_id: int = None,
    color_id: int = None,
    **kwargs
):
    """
    ⚡ Генерує одне mock оголошення асинхронно
    
    Args:
        user_id: ID користувача-власника
        brand_id: ID марки авто
        model_id: ID моделі авто
        generation_id: ID покоління (опціонально)
        color_id: ID кольору (опціонально)
        **kwargs: Додаткові параметри (year, price, mileage, etc.)
    
    Returns:
        dict: Інформація про створене оголошення
    """
    try:
        from apps.ads.models import CarAd, CarMarkModel, CarModel, AddsAccount
        from apps.ads.models.reference import CarGenerationModel, CarColorModel
        from core.enums.ads import AdStatusEnum
        import random
        from decimal import Decimal
        
        logger.info(f"[MockGen] Генеруємо оголошення для user={user_id}, brand={brand_id}, model={model_id}")
        
        # Отримуємо дані
        user = User.objects.get(id=user_id)
        brand = CarMarkModel.objects.get(id=brand_id)
        model = CarModel.objects.get(id=model_id)
        
        # Створюємо або отримуємо account
        account, _ = AddsAccount.objects.get_or_create(
            user=user,
            defaults={'account_type': 'private'}
        )
        
        # Генеруємо дані
        year = kwargs.get('year', random.randint(2015, 2024))
        price = kwargs.get('price', Decimal(random.randint(5000, 50000)))
        mileage = kwargs.get('mileage', random.randint(10000, 150000))
        
        # Отримуємо покоління та колір
        generation = None
        if generation_id:
            generation = CarGenerationModel.objects.filter(id=generation_id).first()
        
        color = None
        if color_id:
            color = CarColorModel.objects.filter(id=color_id).first()
        elif CarColorModel.objects.exists():
            color = CarColorModel.objects.order_by('?').first()
        
        # Створюємо оголошення
        with transaction.atomic():
            ad = CarAd.objects.create(
                account=account,
                mark=brand,
                model=model,
                generation=generation,
                color=color,
                year=year,
                price=price,
                mileage=mileage,
                title=f"{brand.name} {model.name} {year}",
                description=f"Mock оголошення для {brand.name} {model.name}. Згенеровано автоматично.",
                status=AdStatusEnum.DRAFT,
                **{k: v for k, v in kwargs.items() if k not in ['year', 'price', 'mileage']}
            )
        
        logger.info(f"[MockGen] ✅ Створено оголошення #{ad.id}: {ad.title}")
        
        return {
            'status': 'success',
            'ad_id': ad.id,
            'title': ad.title,
            'brand': brand.name,
            'model': model.name
        }
        
    except Exception as exc:
        logger.error(f"[MockGen] ❌ Помилка: {exc}")
        raise self.retry(exc=exc, countdown=30)


@shared_task
def generate_bulk_mock_ads(count: int = 50, user_id: int = None):
    """
    ⚡ Генерує багато mock оголошень паралельно через Celery
    
    Args:
        count: Кількість оголошень для генерації
        user_id: ID користувача (якщо None, створить нового)
    
    Returns:
        dict: Статистика генерації
    """
    try:
        from apps.ads.models import CarMarkModel, CarModel
        import random
        
        logger.info(f"[MockGen] Початок генерації {count} оголошень")
        
        # Створюємо або отримуємо користувача
        if user_id is None:
            user, _ = User.objects.get_or_create(
                username='mock_user',
                defaults={
                    'email': 'mock@example.com',
                    'is_active': True
                }
            )
            user_id = user.id
        
        # Отримуємо доступні марки та моделі
        brands = list(CarMarkModel.objects.all().values_list('id', flat=True))
        if not brands:
            return {'status': 'error', 'message': 'Немає доступних марок авто'}
        
        # Створюємо tasks для паралельної генерації
        tasks = []
        for i in range(count):
            brand_id = random.choice(brands)
            
            # Отримуємо моделі для цієї марки
            models = list(CarModel.objects.filter(mark_id=brand_id).values_list('id', flat=True))
            if not models:
                continue
                
            model_id = random.choice(models)
            
            # Додаємо task в групу
            task = generate_single_mock_ad.s(
                user_id=user_id,
                brand_id=brand_id,
                model_id=model_id,
                year=random.randint(2015, 2024),
                price=random.randint(5000, 50000)
            )
            tasks.append(task)
        
        # Запускаємо всі tasks паралельно
        job = group(tasks)
        result = job.apply_async()
        
        logger.info(f"[MockGen] ✅ Запущено {len(tasks)} паралельних tasks")
        
        return {
            'status': 'started',
            'total_tasks': len(tasks),
            'group_id': result.id,
            'message': f'Генерація {len(tasks)} оголошень розпочата'
        }
        
    except Exception as exc:
        logger.error(f"[MockGen] ❌ Помилка bulk генерації: {exc}")
        return {'status': 'error', 'message': str(exc)}


@shared_task
def generate_mock_images_for_ad(ad_id: int):
    """
    ⚡ Генерує зображення для оголошення асинхронно
    ✅ З ПРАВИЛЬНИМИ ШИЛЬДИКАМИ
    
    Args:
        ad_id: ID оголошення
    
    Returns:
        dict: Результат генерації зображень
    """
    try:
        from apps.ads.models import CarAd
        from apps.chat.services.image_gen import generate_car_image_pollinations
        
        logger.info(f"[ImageGen] Генеруємо зображення для оголошення #{ad_id}")
        
        ad = CarAd.objects.select_related('mark', 'model', 'color', 'body_type').get(id=ad_id)
        
        # Дані для генерації
        brand = ad.mark.name if ad.mark else "Unknown"
        model = ad.model.name if ad.model else "Unknown"
        year = ad.year or 2020
        color = ad.color.name if ad.color else "silver"
        body_type = ad.body_type.name if ad.body_type else "sedan"  # ⚡ ДОДАНО: тип кузова
        
        # ⚡ УНІВЕРСАЛЬНИЙ СПИСОК safe brands (DRY - синхронізовано з image_generation_views.py)
        # Показуємо шильдики ТІЛЬКИ для брендів, які AI точно знає
        safe_brands_for_badges = [
            # Японські бренди з унікальними логотипами
            'toyota', 'honda', 'nissan', 'mazda', 'subaru', 'lexus', 'infiniti', 'acura', 'mitsubishi',
            # Німецькі преміум-бренди
            'bmw', 'mercedes-benz', 'mercedes', 'audi', 'volkswagen', 'vw', 'porsche',
            # Американські масові бренди
            'ford', 'chevrolet', 'chevy', 'dodge', 'jeep', 'chrysler', 'gmc', 'ram',
            # Корейські бренди
            'hyundai', 'kia', 'genesis',
            # Популярні європейські
            'volvo', 'peugeot', 'renault', 'fiat', 'citroen', 'opel', 'seat', 'skoda',
            # Преміум бренди
            'ferrari', 'lamborghini', 'bentley', 'rolls-royce', 'aston martin', 'maserati',
            # Британські
            'land rover', 'range rover', 'mini', 'jaguar'
        ]
        
        brand_lower = brand.lower()
        show_badges = brand_lower in safe_brands_for_badges
        
        if not show_badges:
            logger.info(f"[ImageGen] ⚠️ Бренд '{brand}' не в списку safe_brands - БЕЗ шильдиків")
        
        # Генеруємо 4 ракурси
        angles = ['front', 'side', 'rear', 'interior']
        generated_urls = []
        
        for angle in angles:
            try:
                # ⚡ ВИПРАВЛЕНО: Додано body_type для точної генерації
                if show_badges:
                    prompt = (
                        f"Professional photo of {brand} {model} {year}, {body_type} body type, {color} color, "
                        f"{angle} view, with {brand} brand badges and logos clearly visible, "
                        f"photorealistic, studio lighting, high quality automotive photography"
                    )
                else:
                    prompt = (
                        f"Professional photo of {brand} {model} {year}, {body_type} body type, {color} color, "
                        f"{angle} view, clean unmarked vehicle without any brand badges, "
                        f"photorealistic, studio lighting, high quality automotive photography"
                    )
                
                # Генеруємо через Pollinations або інший сервіс
                # (тут має бути виклик вашого сервісу генерації)
                image_url = f"https://image.pollinations.ai/prompt/{prompt.replace(' ', '%20')}"
                
                generated_urls.append({
                    'angle': angle,
                    'url': image_url,
                    'has_badges': show_badges
                })
                
                logger.info(f"[ImageGen] ✅ Згенеровано {angle}: badges={show_badges}")
                
            except Exception as e:
                logger.error(f"[ImageGen] ❌ Помилка для {angle}: {e}")
        
        return {
            'status': 'success',
            'ad_id': ad_id,
            'images': generated_urls,
            'brand': brand,
            'badges_enabled': show_badges
        }
        
    except Exception as exc:
        logger.error(f"[ImageGen] ❌ Помилка генерації зображень: {exc}")
        return {'status': 'error', 'message': str(exc)}
