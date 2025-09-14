"""
Simplified email service with Celery integration.
"""

import logging
import os
import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings
from jinja2 import Environment, FileSystemLoader

# Setup logging
logger = logging.getLogger(__name__)

# Template environment
env = Environment(
    loader=FileSystemLoader(searchpath=settings.templates_path), autoescape=True
)


def send_email_direct(
    from_email: str, to_email: str, subject: str, template_data: dict
) -> str:
    """
    Send HTML email with template rendering.

    Args:
        from_email: Sender's email address
        to_email: Recipient's email address
        subject: Email subject
        template_data: Data for template rendering

    Returns:
        Success or error message
    """
    try:
        # Render template
        template = env.get_template("email_template.html")
        html_content = template.render(template_data)
        logger.info(f"Template rendered for email to {to_email}")

    except Exception as e:
        error_msg = f"Template rendering failed: {e}"
        logger.error(error_msg)
        return error_msg

    # Create email message
    msg = MIMEMultipart("related")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    # Add HTML content
    msg_alternative = MIMEMultipart("alternative")
    msg.attach(msg_alternative)
    msg_alternative.attach(MIMEText(html_content, "html"))

    # Attach logo if exists
    image_path = os.path.join(settings.media_path, "indonesian_halal_logo_2022.jpg")
    if os.path.exists(image_path):
        try:
            with open(image_path, "rb") as logo_file:
                img_data = logo_file.read()
            image_mime = MIMEImage(img_data, _subtype="jpeg")
            image_mime.add_header("Content-ID", "<logo>")
            image_mime.add_header("Content-Disposition", "inline", filename="logo.jpg")
            msg.attach(image_mime)
            logger.debug("Logo attached to email")
        except Exception as e:
            logger.warning(f"Failed to attach logo: {e}")
    else:
        logger.debug(f"Logo not found: {image_path}")

    # Send email via SMTP
    try:
        with smtplib.SMTP(
            settings.gmail_host, settings.gmail_port, timeout=10
        ) as server:
            server.ehlo()
            if settings.gmail_use_tls:
                server.starttls()
                server.ehlo()

            server.login(settings.gmail_user, settings.gmail_password)
            server.sendmail(from_email, [to_email], msg.as_string())

        logger.info(f"Email sent successfully to {to_email}")
        return "Email sent successfully."

    except Exception as e:
        error_message = f"SMTP error: {str(e)}"
        logger.error(error_message)
        return error_message
