from django.db import models
from django.utils.translation import gettext_lazy as _

# 📊 Ad status defines the current state of an advertisement in the system
class AdStatusEnum(models.TextChoices):
    DRAFT = 'draft', _('Draft')
    PENDING = 'pending', _('Pending Review')
    ACTIVE = 'active', _('Active')
    NEEDS_REVIEW = 'needs_review', _('Needs Review')
    REJECTED = 'rejected', _('Rejected')
    BLOCKED = 'blocked', _('Blocked')
    SOLD = 'sold', _('Sold')
    ARCHIVED = 'archived', _('Archived')

# ⚙️ Account type used to control features and ad limits
class AccountTypeEnum(models.TextChoices):
    BASIC = "BASIC", "Basic account"
    PREMIUM = "PREMIUM", "Premium account"

# 🔍 Moderation level defines the depth of verification before publishing
class ModerationLevelEnum(models.TextChoices):
    LIGHT = "LIGHT", "Light moderation"
    STRICT = "STRICT", "Strict moderation"
    AUTO = "AUTO", "Automated check only"

# 🧑‍💼 User roles on the platform
class RoleEnum(models.TextChoices):
    SELLER = "seller", "Продавець (звичайний користувач)"
    DEALER = "dealer", "Автосалон"
    MANAGER = "manager", "Менеджер платформи (staff)"
    ADMIN = "admin", "Адміністратор (superuser)"

class ContactTypeEnum(models.TextChoices):
    PHONE = "phone", "📞 Phone"
    EMAIL = "email", "📧 Email"
    TELEGRAM = "telegram", "📲 Telegram"
    WHATSAPP = "whatsapp", "💬 WhatsApp"
    VIBER = "viber", "📡 Viber"
    INSTAGRAM = "instagram", "📸 Instagram"
    WEBSITE = "website", "🌐 Website"
