"""
Django management command to create default notification templates.
"""
from django.core.management.base import BaseCommand
from apps.moderation.models import NotificationTemplate, ModerationAction


class Command(BaseCommand):
    """Django management command to create default notification templates."""
    
    help = 'Create default notification templates for moderation system'
    
    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of existing templates'
        )
    
    def handle(self, *args, **options):
        """Handle the command execution."""
        self.stdout.write(self.style.SUCCESS('📧 Creating notification templates...'))
        
        templates = [
            {
                'action': ModerationAction.AD_MAX_ATTEMPTS,
                'subject_template': '🚨 Потрібна ручна перевірка оголошення #{{ ad_id }} - {{ site_name }}',
                'html_template': self._get_max_attempts_html_template(),
                'text_template': self._get_max_attempts_text_template(),
                'available_variables': [
                    'ad_id', 'user_id', 'reason', 'attempts_count',
                    'site_name', 'site_url', 'admin_url', 'timestamp'
                ]
            },
            {
                'action': ModerationAction.AD_FLAGGED,
                'subject_template': '⚠️ Оголошення #{{ ad_id }} помічено для перевірки - {{ site_name }}',
                'html_template': self._get_flagged_html_template(),
                'text_template': self._get_flagged_text_template(),
                'available_variables': [
                    'ad_id', 'user_id', 'action', 'reason',
                    'site_name', 'site_url', 'admin_url', 'timestamp'
                ]
            },
            {
                'action': ModerationAction.AD_NEEDS_REVIEW,
                'subject_template': '📋 Оголошення #{{ ad_id }} потребує перевірки - {{ site_name }}',
                'html_template': self._get_needs_review_html_template(),
                'text_template': self._get_needs_review_text_template(),
                'available_variables': [
                    'ad_id', 'user_id', 'reason',
                    'site_name', 'site_url', 'admin_url', 'timestamp'
                ]
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for template_data in templates:
            template, created = NotificationTemplate.objects.get_or_create(
                action=template_data['action'],
                defaults=template_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'✅ Created template for {template.get_action_display()}')
            elif options['force']:
                for key, value in template_data.items():
                    if key != 'action':
                        setattr(template, key, value)
                template.save()
                updated_count += 1
                self.stdout.write(f'🔄 Updated template for {template.get_action_display()}')
            else:
                self.stdout.write(f'⏭️ Template for {template.get_action_display()} already exists')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n📧 Templates setup completed!\n'
                f'Created: {created_count}\n'
                f'Updated: {updated_count}'
            )
        )
    
    def _get_max_attempts_html_template(self):
        """Get HTML template for max attempts notification."""
        return '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
        <h2>🚨 Потрібна ручна перевірка оголошення</h2>
    </div>
    
    <div style="padding: 20px;">
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin-bottom: 20px;">
            <strong>Увага!</strong> Оголошення досягло максимальної кількості спроб автоматичного редагування.
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #dc3545;">
            <h3>Деталі оголошення:</h3>
            <p><strong>ID оголошення:</strong> #{{ ad_id }}</p>
            <p><strong>ID користувача:</strong> {{ user_id }}</p>
            <p><strong>Кількість спроб:</strong> {{ attempts_count }}/3</p>
            {% if reason %}<p><strong>Причина:</strong> {{ reason }}</p>{% endif %}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ admin_url }}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                🔍 Переглянути в адмін-панелі
            </a>
        </div>
    </div>
    
    <div style="border-top: 1px solid #eee; padding: 20px; font-size: 12px; color: #666; text-align: center;">
        <p>{{ site_name }} - Система модерації</p>
    </div>
</div>
        '''.strip()
    
    def _get_max_attempts_text_template(self):
        """Get text template for max attempts notification."""
        return '''
🚨 ПОТРІБНА РУЧНА ПЕРЕВІРКА ОГОЛОШЕННЯ

Оголошення досягло максимальної кількості спроб автоматичного редагування.

ДЕТАЛІ:
- ID оголошення: #{{ ad_id }}
- ID користувача: {{ user_id }}
- Кількість спроб: {{ attempts_count }}/3
{% if reason %}- Причина: {{ reason }}{% endif %}

Переглянути: {{ admin_url }}

{{ site_name }} - Система модерації
        '''.strip()
    
    def _get_flagged_html_template(self):
        """Get HTML template for flagged notification."""
        return '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #ffc107; color: #212529; padding: 20px; text-align: center;">
        <h2>⚠️ Оголошення помічено для перевірки</h2>
    </div>
    
    <div style="padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #ffc107;">
            <h3>Деталі оголошення:</h3>
            <p><strong>ID оголошення:</strong> #{{ ad_id }}</p>
            <p><strong>ID користувача:</strong> {{ user_id }}</p>
            {% if reason %}<p><strong>Причина:</strong> {{ reason }}</p>{% endif %}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ admin_url }}" style="background-color: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                🔍 Переглянути в адмін-панелі
            </a>
        </div>
    </div>
    
    <div style="border-top: 1px solid #eee; padding: 20px; font-size: 12px; color: #666; text-align: center;">
        <p>{{ site_name }} - Система модерації</p>
    </div>
</div>
        '''.strip()
    
    def _get_flagged_text_template(self):
        """Get text template for flagged notification."""
        return '''
⚠️ ОГОЛОШЕННЯ ПОМІЧЕНО ДЛЯ ПЕРЕВІРКИ

ДЕТАЛІ:
- ID оголошення: #{{ ad_id }}
- ID користувача: {{ user_id }}
{% if reason %}- Причина: {{ reason }}{% endif %}

Переглянути: {{ admin_url }}

{{ site_name }} - Система модерації
        '''.strip()
    
    def _get_needs_review_html_template(self):
        """Get HTML template for needs review notification."""
        return '''
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
        <h2>📋 Оголошення потребує перевірки</h2>
    </div>
    
    <div style="padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #17a2b8;">
            <h3>Деталі оголошення:</h3>
            <p><strong>ID оголошення:</strong> #{{ ad_id }}</p>
            <p><strong>ID користувача:</strong> {{ user_id }}</p>
            {% if reason %}<p><strong>Причина:</strong> {{ reason }}</p>{% endif %}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ admin_url }}" style="background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                🔍 Переглянути в адмін-панелі
            </a>
        </div>
    </div>
    
    <div style="border-top: 1px solid #eee; padding: 20px; font-size: 12px; color: #666; text-align: center;">
        <p>{{ site_name }} - Система модерації</p>
    </div>
</div>
        '''.strip()
    
    def _get_needs_review_text_template(self):
        """Get text template for needs review notification."""
        return '''
📋 ОГОЛОШЕННЯ ПОТРЕБУЄ ПЕРЕВІРКИ

ДЕТАЛІ:
- ID оголошення: #{{ ad_id }}
- ID користувача: {{ user_id }}
{% if reason %}- Причина: {{ reason }}{% endif %}

Переглянути: {{ admin_url }}

{{ site_name }} - Система модерації
        '''.strip()
