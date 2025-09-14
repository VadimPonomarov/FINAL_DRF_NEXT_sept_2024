from datetime import datetime, timedelta

from celery import shared_task
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import TokenError, Token

from config.extra_config.logger_config import logger


@shared_task(name="clean_blacklisted_tokens")
def clean_blacklisted_tokens(safety_margin_days=7):
    """
    Celery task to clean expired blacklisted tokens.

    This task removes:
    1. BlacklistedTokens for tokens that are actually expired based on their JWT payload
    2. OutstandingTokens that are expired based on their JWT payload

    Args:
        safety_margin_days (int): Additional days to keep tokens after expiration (default: 7)
                                 This is a safety margin to ensure we don't delete tokens that might
                                 still be needed for some reason.

    Returns:
        dict: Statistics about the cleanup operation
    """
    # Current time minus safety margin
    safety_time = timezone.now() - timedelta(days=safety_margin_days)

    # Count statistics
    total_blacklisted = BlacklistedToken.objects.count()
    total_outstanding = OutstandingToken.objects.count()

    # Lists to store IDs of expired tokens
    expired_outstanding_ids = []
    valid_outstanding_ids = []

    # Step 1: Check each OutstandingToken to determine if it's actually expired
    logger.info("Checking tokens for expiration based on JWT payload...")
    try:
        # Get all outstanding tokens
        outstanding_tokens = OutstandingToken.objects.all()

        for token_record in outstanding_tokens:
            try:
                # Try to parse and validate the token
                token_obj = Token(token_record.token)

                # Check if token is expired based on its payload
                # If token.payload['exp'] is in the past, it's expired
                exp_timestamp = token_obj.payload.get('exp')
                if not exp_timestamp:
                    # If no expiration in payload, consider it expired
                    expired_outstanding_ids.append(token_record.id)
                    continue

                # Convert exp timestamp to datetime
                exp_datetime = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)

                # Check if token is expired (with safety margin)
                if exp_datetime < safety_time:
                    # Token is expired and beyond safety margin
                    expired_outstanding_ids.append(token_record.id)
                else:
                    # Token is still valid
                    valid_outstanding_ids.append(token_record.id)

            except TokenError:
                # If token can't be parsed or is invalid, consider it expired
                expired_outstanding_ids.append(token_record.id)
            except Exception as e:
                logger.warning(f"Error checking token {token_record.id}: {e}")
                # In case of error, be conservative and consider it valid
                valid_outstanding_ids.append(token_record.id)

        logger.info(f"Found {len(expired_outstanding_ids)} expired tokens and {len(valid_outstanding_ids)} valid tokens")
    except Exception as e:
        logger.error(f"Error checking token expiration: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'stage': 'token_validation'
        }

    # Step 2: Delete blacklisted tokens associated with expired outstanding tokens
    deleted_blacklisted = 0
    try:
        # Delete blacklisted tokens associated with expired outstanding tokens
        blacklisted_result = BlacklistedToken.objects.filter(
            token_id__in=expired_outstanding_ids
        ).delete()

        # Get the count of deleted objects
        deleted_blacklisted = blacklisted_result[0] if isinstance(blacklisted_result, tuple) else 0

        logger.info(f"Deleted {deleted_blacklisted} blacklisted tokens for expired tokens")
    except Exception as e:
        logger.error(f"Error deleting blacklisted tokens: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'stage': 'blacklisted_tokens'
        }

    # Step 3: Delete expired outstanding tokens
    deleted_outstanding = 0
    try:
        # Delete expired tokens
        outstanding_result = OutstandingToken.objects.filter(
            id__in=expired_outstanding_ids
        ).delete()

        # Get the count of deleted objects
        deleted_outstanding = outstanding_result[0] if isinstance(outstanding_result, tuple) else 0

        logger.info(f"Deleted {deleted_outstanding} expired outstanding tokens")
    except Exception as e:
        logger.error(f"Error deleting outstanding tokens: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'stage': 'outstanding_tokens'
        }

    # Log summary
    result = {
        'status': 'completed',
        'total_blacklisted_before': total_blacklisted,
        'total_outstanding_before': total_outstanding,
        'deleted_blacklisted': deleted_blacklisted,
        'deleted_outstanding': deleted_outstanding,
        'total_blacklisted_after': BlacklistedToken.objects.count(),
        'total_outstanding_after': OutstandingToken.objects.count(),
        'expired_tokens_count': len(expired_outstanding_ids),
        'valid_tokens_count': len(valid_outstanding_ids),
        'safety_margin_days': safety_margin_days,
        'safety_time': safety_time.strftime('%Y-%m-%d %H:%M:%S')
    }

    logger.info(
        f"Token cleanup: Deleted {deleted_blacklisted} blacklisted tokens and "
        f"{deleted_outstanding} outstanding tokens that were expired based on JWT payload"
    )

    return result
