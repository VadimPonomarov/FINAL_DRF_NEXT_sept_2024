from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Union
from pydantic import BaseModel, EmailStr, Field, validator


class EmailPriority(int, Enum):
    """Priority levels for email delivery."""
    LOW = 1
    NORMAL = 3
    HIGH = 5
    URGENT = 10


class EmailCategory(str, Enum):
    """Categories for email classification."""
    NOTIFICATION = "notification"
    ALERT = "alert"
    TRANSACTIONAL = "transactional"
    MARKETING = "marketing"
    SECURITY = "security"
    SYSTEM = "system"


class MyTemplateData(BaseModel):
    """Data structure for email template rendering."""
    title: str = Field(..., description="Email subject/title")
    message: str = Field(..., description="Plain text message content")
    logo_url: str = Field("cid:logo", description="URL for the logo image")
    html_content: Optional[str] = Field(
        None,
        description="Pre-rendered HTML content (if not provided, will be generated from template)"
    )
    context: Dict[str, Union[str, int, float, bool, List, Dict]] = Field(
        default_factory=dict,
        description="Additional context variables for template rendering"
    )
    category: EmailCategory = Field(
        EmailCategory.NOTIFICATION,
        description="Email category for classification and filtering"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Welcome to Our Service",
                "message": "Thank you for signing up!",
                "logo_url": "https://example.com/logo.png",
                "category": "notification"
            }
        }


class SendEmailParams(BaseModel):
    """Parameters for sending an email."""
    to_email: EmailStr = Field(..., description="Recipient email address")
    from_email: EmailStr = Field(
        "noreply@example.com",
        description="Sender email address"
    )
    subject: str = Field(
        "",
        description="Email subject line",
        max_length=200
    )
    template_data: MyTemplateData = Field(
        ...,
        description="Template data for email rendering"
    )
    priority: int = Field(
        EmailPriority.NORMAL,
        description="Email priority (1-10, higher is more important)",
        ge=1,
        le=10
    )
    send_at: Optional[datetime] = Field(
        None,
        description="Schedule email for future delivery"
    )
    metadata: Dict[str, str] = Field(
        default_factory=dict,
        description="Additional metadata for tracking and analytics"
    )
    
    @validator('subject')
    def subject_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Subject cannot be empty')
        return v.strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "to_email": "user@example.com",
                "from_email": "noreply@example.com",
                "subject": "Welcome to Our Service",
                "priority": 3,
                "template_data": {
                    "title": "Welcome!",
                    "message": "Thank you for signing up.",
                    "category": "notification"
                },
                "metadata": {
                    "campaign_id": "welcome_2023",
                    "user_id": "12345"
                }
            }
        }
