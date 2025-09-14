from django.core.management.base import BaseCommand
from apps.users.models import UserModel


class Command(BaseCommand):
    help = 'Копирует хеш пароля от pvs.versia@gmail.com всем остальным пользователям'

    def handle(self, *args, **options):
        self.stdout.write("🔧 Копирование хеша пароля от pvs.versia@gmail.com всем пользователям...")
        self.stdout.write("=" * 60)
        
        # Получаем хеш пароля от pvs.versia@gmail.com
        try:
            pvs_user = UserModel.objects.get(email='pvs.versia@gmail.com')
            source_password_hash = pvs_user.password
            self.stdout.write(f"✅ Найден пользователь: {pvs_user.email}")
            self.stdout.write(f"📝 Исходный хеш пароля: {source_password_hash[:50]}...")
        except UserModel.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Пользователь pvs.versia@gmail.com не найден!"))
            return
        
        # Получаем всех остальных пользователей
        other_users = UserModel.objects.exclude(email='pvs.versia@gmail.com')
        self.stdout.write(f"\n👥 Найдено других пользователей: {other_users.count()}")
        
        if other_users.count() == 0:
            self.stdout.write("ℹ️ Нет других пользователей для обновления")
            return
        
        # Копируем хеш пароля всем остальным
        updated_count = 0
        for user in other_users:
            if user.password != source_password_hash:
                user.password = source_password_hash
                user.save()
                updated_count += 1
                self.stdout.write(f"🔄 Обновлен хеш для {user.email}")
            else:
                self.stdout.write(f"✅ Хеш уже актуален для {user.email}")
        
        self.stdout.write(f"\n🎉 Готово!")
        self.stdout.write(f"📊 Обновлено пользователей: {updated_count}")
        self.stdout.write(f"📊 Всего пользователей: {UserModel.objects.count()}")
        self.stdout.write(f"🔑 Теперь все пользователи имеют тот же хеш пароля, что и pvs.versia@gmail.com")
        self.stdout.write(f"🔑 Пароль для всех: 12345678")
        
        # Проверяем результат
        self.stdout.write("\n🔍 Проверка результата (первые 10 пользователей):")
        for user in UserModel.objects.all()[:10]:
            status = "✅" if user.password == source_password_hash else "❌"
            self.stdout.write(f"{status} {user.email} - активен: {user.is_active} - суперюзер: {user.is_superuser}")
