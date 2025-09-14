"""
Admin configuration for moderation system.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import (
    ManagerNotificationSettings,
    ModerationNotification,
    NotificationTemplate,
    NotificationLog
)


@admin.register(ManagerNotificationSettings)
class ManagerNotificationSettingsAdmin(admin.ModelAdmin):
    """Admin for manager notification settings."""
    
    list_display = [
        'manager', 'manager_email', 'email_enabled', 'info_table_enabled',
        'is_active', 'created_at'
    ]
    list_filter = ['email_enabled', 'info_table_enabled', 'is_active', 'created_at']
    search_fields = ['manager__email', 'manager__first_name', 'manager__last_name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Manager', {
            'fields': ('manager',)
        }),
        ('Notification Methods', {
            'fields': ('email_enabled', 'info_table_enabled', 'email_address')
        }),
        ('Filtering', {
            'fields': ('notify_for_actions',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def manager_email(self, obj):
        """Display manager email."""
        return obj.manager.email
    manager_email.short_description = 'Manager Email'


@admin.register(ModerationNotification)
class ModerationNotificationAdmin(admin.ModelAdmin):
    """Admin for moderation notifications."""
    
    list_display = [
        'id', 'manager', 'action', 'title', 'ad_link', 'status',
        'priority', 'created_at', 'read_at'
    ]
    list_filter = ['action', 'status', 'priority', 'created_at']
    search_fields = ['title', 'message', 'manager__email']
    readonly_fields = ['created_at', 'read_at', 'admin_url_link']
    
    fieldsets = (
        ('Notification', {
            'fields': ('manager', 'action', 'title', 'message')
        }),
        ('Related Objects', {
            'fields': ('ad_id', 'user_id', 'admin_url_link')
        }),
        ('Data', {
            'fields': ('data',),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('status', 'priority')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'read_at')
        })
    )
    
    def ad_link(self, obj):
        """Display link to ad."""
        if obj.ad_id:
            return format_html(
                '<a href="/admin/ads/caradmodel/{}/change/" target="_blank">Ad #{}</a>',
                obj.ad_id, obj.ad_id
            )
        return '-'
    ad_link.short_description = 'Ad'
    
    def admin_url_link(self, obj):
        """Display admin URL as clickable link."""
        url = obj.get_admin_url()
        if url:
            return format_html('<a href="{}" target="_blank">{}</a>', url, url)
        return '-'
    admin_url_link.short_description = 'Admin URL'
    
    actions = ['mark_as_read', 'mark_as_pending']
    
    def mark_as_read(self, request, queryset):
        """Mark selected notifications as read."""
        count = 0
        for notification in queryset:
            if notification.status == 'pending':
                notification.mark_as_read()
                count += 1
        
        self.message_user(request, f'Marked {count} notifications as read.')
    mark_as_read.short_description = 'Mark selected notifications as read'
    
    def mark_as_pending(self, request, queryset):
        """Mark selected notifications as pending."""
        count = queryset.filter(status='read').update(
            status='pending',
            read_at=None
        )
        self.message_user(request, f'Marked {count} notifications as pending.')
    mark_as_pending.short_description = 'Mark selected notifications as pending'


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    """Admin for notification templates."""
    
    list_display = ['action', 'subject_template', 'is_active', 'updated_at']
    list_filter = ['action', 'is_active', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Template', {
            'fields': ('action', 'is_active')
        }),
        ('Email Content', {
            'fields': ('subject_template', 'html_template', 'text_template')
        }),
        ('Variables', {
            'fields': ('available_variables',),
            'description': 'Available template variables (for reference)'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_form(self, request, obj=None, **kwargs):
        """Customize form."""
        form = super().get_form(request, obj, **kwargs)
        
        # Add help text for templates
        if 'html_template' in form.base_fields:
            form.base_fields['html_template'].help_text = (
                'HTML email template. Available variables: '
                '{{ ad_id }}, {{ user_id }}, {{ reason }}, {{ attempts_count }}, '
                '{{ site_name }}, {{ site_url }}, {{ admin_url }}, {{ timestamp }}'
            )
        
        return form


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    """Admin for notification logs."""
    
    list_display = [
        'id', 'notification', 'method', 'recipient', 'status',
        'sent_at', 'delivered_at'
    ]
    list_filter = ['method', 'status', 'sent_at']
    search_fields = ['recipient', 'notification__title']
    readonly_fields = ['sent_at', 'delivered_at']
    
    fieldsets = (
        ('Log Entry', {
            'fields': ('notification', 'method', 'recipient')
        }),
        ('Status', {
            'fields': ('status', 'error_message')
        }),
        ('Tracking', {
            'fields': ('external_id',)
        }),
        ('Timestamps', {
            'fields': ('sent_at', 'delivered_at')
        })
    )
    
    def has_add_permission(self, request):
        """Disable adding logs manually."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Disable editing logs."""
        return False
