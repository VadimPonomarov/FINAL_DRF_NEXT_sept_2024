"""
Schemas for moderation notifications via RabbitMQ.
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ModerationAction(str, Enum):
    """Moderation action types."""
    CREATED = "created"
    AUTO_APPROVED = "auto_approved"
    AUTO_REJECTED = "auto_rejected"
    FLAGGED = "flagged"
    MANUALLY_APPROVED = "manually_approved"
    MANUALLY_REJECTED = "manually_rejected"
    NEEDS_REVIEW = "needs_review"
    MAX_ATTEMPTS_REACHED = "max_attempts_reached"


class ModerationStatus(str, Enum):
    """Moderation status types."""
    PENDING = "pending"
    ACTIVE = "active"
    NEEDS_REVIEW = "needs_review"
    REJECTED = "rejected"
    INACTIVE = "inactive"


class ModerationNotificationData(BaseModel):
    """Data for moderation notification."""
    ad_id: int = Field(..., description="ID объявления")
    action: ModerationAction = Field(..., description="Действие модерации")
    status: ModerationStatus = Field(..., description="Статус объявления")
    user_id: int = Field(..., description="ID пользователя-владельца объявления")
    moderated_by_id: Optional[int] = Field(None, description="ID модератора")
    reason: Optional[str] = Field(None, description="Причина действия")
    attempts_count: Optional[int] = Field(None, description="Количество попыток")
    max_attempts: Optional[int] = Field(3, description="Максимальное количество попыток")
    details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Дополнительные детали")
    timestamp: datetime = Field(default_factory=datetime.now, description="Время события")
    
    class Config:
        use_enum_values = True


class UserModerationNotification(BaseModel):
    """Notification for user about their ad moderation."""
    notification_type: str = Field(default="user_moderation", description="Тип уведомления")
    data: ModerationNotificationData = Field(..., description="Данные модерации")
    
    class Config:
        use_enum_values = True


class ManagerModerationNotification(BaseModel):
    """Notification for managers about ads requiring review."""
    notification_type: str = Field(default="manager_moderation", description="Тип уведомления")
    data: ModerationNotificationData = Field(..., description="Данные модерации")
    priority: int = Field(default=8, description="Приоритет уведомления (1-10)")
    
    class Config:
        use_enum_values = True


class ModerationExchangeConfig:
    """Configuration for moderation exchanges and routing keys."""
    
    # Exchange names
    USER_NOTIFICATIONS_EXCHANGE = "user_notifications"
    MANAGER_NOTIFICATIONS_EXCHANGE = "manager_notifications"
    
    # Routing keys for user notifications
    USER_AD_APPROVED = "user.ad.approved"
    USER_AD_REJECTED = "user.ad.rejected"
    USER_AD_NEEDS_EDIT = "user.ad.needs_edit"
    USER_AD_MAX_ATTEMPTS = "user.ad.max_attempts"
    
    # Routing keys for manager notifications
    MANAGER_AD_REVIEW_REQUIRED = "manager.ad.review_required"
    MANAGER_AD_MAX_ATTEMPTS = "manager.ad.max_attempts"
    MANAGER_AD_FLAGGED = "manager.ad.flagged"
    
    @classmethod
    def get_user_routing_key(cls, action: ModerationAction) -> str:
        """Get routing key for user notifications based on action."""
        routing_map = {
            ModerationAction.AUTO_APPROVED: cls.USER_AD_APPROVED,
            ModerationAction.MANUALLY_APPROVED: cls.USER_AD_APPROVED,
            ModerationAction.AUTO_REJECTED: cls.USER_AD_REJECTED,
            ModerationAction.MANUALLY_REJECTED: cls.USER_AD_REJECTED,
            ModerationAction.FLAGGED: cls.USER_AD_NEEDS_EDIT,
            ModerationAction.NEEDS_REVIEW: cls.USER_AD_NEEDS_EDIT,
            ModerationAction.MAX_ATTEMPTS_REACHED: cls.USER_AD_MAX_ATTEMPTS,
        }
        return routing_map.get(action, "user.ad.unknown")
    
    @classmethod
    def get_manager_routing_key(cls, action: ModerationAction) -> str:
        """Get routing key for manager notifications based on action."""
        routing_map = {
            ModerationAction.MAX_ATTEMPTS_REACHED: cls.MANAGER_AD_MAX_ATTEMPTS,
            ModerationAction.FLAGGED: cls.MANAGER_AD_FLAGGED,
            ModerationAction.NEEDS_REVIEW: cls.MANAGER_AD_REVIEW_REQUIRED,
        }
        return routing_map.get(action, "manager.ad.unknown")
