"""
Reference data models for car advertisements.
Справочные данные для объявлений о продаже автомобилей.
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from datetime import datetime


class CarMarkModel(models.Model):
    """
    Модель марки автомобиля (BMW, Toyota, Mercedes и т.д.)
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Название марки",
        help_text="Название марки автомобиля (например, BMW, Toyota)"
    )
    country = models.CharField(
        max_length=100,
        verbose_name="Страна производитель",
        help_text="Страна, где производится данная марка"
    )
    is_popular = models.BooleanField(
        default=False,
        verbose_name="Популярная марка",
        help_text="Отметить как популярную марку для быстрого доступа"
    )
    logo = models.ImageField(
        upload_to='car_marks/',
        blank=True,
        null=True,
        verbose_name="Логотип марки"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'car_marks'
        verbose_name = "Марка автомобиля"
        verbose_name_plural = "Марки автомобилей"
        ordering = ['name']

    def __str__(self):
        return self.name


class CarModel(models.Model):
    """
    Модель модели автомобиля (X5, Camry, Corolla и т.д.)
    """
    name = models.CharField(
        max_length=100,
        verbose_name="Название модели",
        help_text="Название модели автомобиля (например, X5, Camry)"
    )
    mark = models.ForeignKey(
        CarMarkModel,
        on_delete=models.CASCADE,
        related_name='models',
        verbose_name="Марка автомобиля"
    )
    is_popular = models.BooleanField(
        default=False,
        verbose_name="Популярная модель",
        help_text="Отметить как популярную модель для быстрого доступа"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'car_models'
        verbose_name = "Модель автомобиля"
        verbose_name_plural = "Модели автомобилей"
        ordering = ['mark__name', 'name']
        unique_together = ['name', 'mark']

    def __str__(self):
        return f"{self.mark.name} {self.name}"


class CarColorModel(models.Model):
    """
    Модель цвета автомобиля
    """
    name = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Название цвета",
        help_text="Название цвета (например, Черный, Белый)"
    )
    hex_code = models.CharField(
        max_length=7,
        blank=True,
        verbose_name="HEX код цвета",
        help_text="HEX код цвета для отображения (например, #000000)"
    )
    is_popular = models.BooleanField(
        default=False,
        verbose_name="Популярный цвет",
        help_text="Отметить как популярный цвет для быстрого доступа"
    )
    is_metallic = models.BooleanField(
        default=False,
        verbose_name="Металлик",
        help_text="Цвет с металлическим эффектом"
    )
    is_pearlescent = models.BooleanField(
        default=False,
        verbose_name="Перламутровый",
        help_text="Цвет с перламутровым эффектом"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'car_colors'
        verbose_name = "Цвет автомобиля"
        verbose_name_plural = "Цвета автомобилей"
        ordering = ['name']

    def __str__(self):
        return self.name


class CarGenerationModel(models.Model):
    """
    Модель поколения автомобиля (например, BMW X5 E70, F15, G05)
    """
    name = models.CharField(
        max_length=100,
        verbose_name="Название поколения",
        help_text="Название поколения (например, E70, F15)"
    )
    model = models.ForeignKey(
        CarModel,
        on_delete=models.CASCADE,
        related_name='generations',
        verbose_name="Модель автомобиля"
    )
    year_start = models.PositiveIntegerField(
        validators=[MinValueValidator(1900), MaxValueValidator(datetime.now().year + 5)],
        verbose_name="Год начала выпуска"
    )
    year_end = models.PositiveIntegerField(
        validators=[MinValueValidator(1900), MaxValueValidator(datetime.now().year + 5)],
        blank=True,
        null=True,
        verbose_name="Год окончания выпуска",
        help_text="Оставить пустым, если выпускается до сих пор"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'car_generations'
        verbose_name = "Поколение автомобиля"
        verbose_name_plural = "Поколения автомобилей"
        ordering = ['model__mark__name', 'model__name', 'year_start']
        unique_together = ['name', 'model']

    def __str__(self):
        return f"{self.model} {self.name} ({self.year_start}-{self.year_end or 'н.в.'})"


class CarModificationModel(models.Model):
    """
    Модель модификации автомобиля (двигатель, коробка передач и т.д.)
    """
    FUEL_CHOICES = [
        ('gasoline', 'Бензин'),
        ('diesel', 'Дизель'),
        ('hybrid', 'Гибрид'),
        ('electric', 'Электро'),
        ('gas', 'Газ'),
    ]

    TRANSMISSION_CHOICES = [
        ('manual', 'Механическая'),
        ('automatic', 'Автоматическая'),
        ('cvt', 'Вариатор'),
        ('robot', 'Робот'),
    ]

    name = models.CharField(
        max_length=200,
        verbose_name="Название модификации",
        help_text="Полное название модификации"
    )
    generation = models.ForeignKey(
        CarGenerationModel,
        on_delete=models.CASCADE,
        related_name='modifications',
        verbose_name="Поколение автомобиля"
    )
    engine_volume = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        verbose_name="Объем двигателя",
        help_text="Объем двигателя в литрах (например, 2.0)"
    )
    engine_power = models.PositiveIntegerField(
        blank=True,
        null=True,
        verbose_name="Мощность двигателя",
        help_text="Мощность двигателя в л.с."
    )
    fuel_type = models.CharField(
        max_length=20,
        choices=FUEL_CHOICES,
        verbose_name="Тип топлива"
    )
    transmission = models.CharField(
        max_length=20,
        choices=TRANSMISSION_CHOICES,
        blank=True,
        verbose_name="Коробка передач"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'car_modifications'
        verbose_name = "Модификация автомобиля"
        verbose_name_plural = "Модификации автомобилей"
        ordering = ['generation__model__mark__name', 'generation__model__name', 'name']

    def __str__(self):
        return f"{self.generation} {self.engine_volume}L {self.get_fuel_type_display()}"


class VehicleTypeModel(models.Model):
    """
    Модель типа транспортного средства (седан, хэтчбек, внедорожник и т.д.)
    """
    CATEGORY_CHOICES = [
        ('passenger', 'Легковые'),
        ('commercial', 'Коммерческие'),
        ('motorcycle', 'Мотоциклы'),
        ('special', 'Спецтехника'),
    ]

    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Тип кузова",
        help_text="Тип кузова автомобиля (например, Седан, Хэтчбек)"
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='passenger',
        verbose_name="Категория транспорта"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vehicle_types'
        verbose_name = "Тип транспортного средства"
        verbose_name_plural = "Типы транспортных средств"
        ordering = ['category', 'name']

    def __str__(self):
        return self.name


class RegionModel(models.Model):
    """
    Модель региона Украины
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Название региона",
        help_text="Название региона (например, Киевская область)"
    )
    code = models.CharField(
        max_length=10,
        unique=True,
        verbose_name="Код региона",
        help_text="Короткий код региона (например, KY)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'regions'
        verbose_name = "Регион"
        verbose_name_plural = "Регионы"
        ordering = ['name']

    def __str__(self):
        return self.name


class CityModel(models.Model):
    """
    Модель города
    """
    name = models.CharField(
        max_length=100,
        verbose_name="Название города",
        help_text="Название города"
    )
    region = models.ForeignKey(
        RegionModel,
        on_delete=models.CASCADE,
        related_name='cities',
        verbose_name="Регион"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cities'
        verbose_name = "Город"
        verbose_name_plural = "Города"
        ordering = ['region__name', 'name']
        unique_together = ['name', 'region']

    def __str__(self):
        return f"{self.name} ({self.region.name})"
