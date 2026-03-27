import hashlib
import hmac
import logging

from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """Verify Lemon Squeezy webhook signature using HMAC-SHA256.

    Must be called with the RAW request body bytes — parsing JSON first
    alters the byte sequence and breaks the signature check.
    """
    if not settings.lemon_squeezy_webhook_secret:
        logger.warning("webhook secret not configured")
        return False

    expected = hmac.new(
        settings.lemon_squeezy_webhook_secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


def handle_subscription_created(data: dict, db: Session) -> None:
    """Upgrade user to 'pro' when a subscription is created."""
    try:
        attributes = data.get("data", {}).get("attributes", {})
        customer_email = (
            attributes.get("user_email")
            or attributes.get("customer_email")
            or data.get("meta", {}).get("custom_data", {}).get("email")
        )
        subscription_id = str(data.get("data", {}).get("id", ""))

        logger.info(
            "subscription_created | email=%s | id=%s",
            customer_email, subscription_id,
        )

        if not customer_email:
            logger.info("no email found in payload — skipping")
            return

        user = db.query(User).filter(User.email == customer_email).first()
        if not user:
            logger.info("user not found: %s", customer_email)
            return

        user.plan = "pro"
        user.lemon_squeezy_id = subscription_id
        db.commit()
        logger.info("upgraded to pro: %s", customer_email)

    except Exception as e:
        db.rollback()
        logger.error("ERROR in handle_subscription_created: %s", e)


def handle_subscription_cancelled(data: dict, db: Session) -> None:
    """Downgrade user to 'free' when a subscription is cancelled."""
    try:
        subscription_id = str(data.get("data", {}).get("id", ""))
        logger.info("subscription_cancelled | id=%s", subscription_id)

        user = (
            db.query(User).filter(User.lemon_squeezy_id == subscription_id).first()
        )
        if not user:
            logger.info("no user found for lemon_squeezy_id=%s", subscription_id)
            return

        user.plan = "free"
        db.commit()
        logger.info("downgraded to free: %s", user.email)

    except Exception as e:
        db.rollback()
        logger.error("ERROR in handle_subscription_cancelled: %s", e)


def handle_subscription_expired(data: dict, db: Session) -> None:
    """Downgrade user to 'free' when a subscription expires."""
    try:
        subscription_id = str(data.get("data", {}).get("id", ""))
        logger.info("subscription_expired | id=%s", subscription_id)

        user = (
            db.query(User).filter(User.lemon_squeezy_id == subscription_id).first()
        )
        if not user:
            logger.info("no user found for lemon_squeezy_id=%s", subscription_id)
            return

        user.plan = "free"
        db.commit()
        logger.info("downgraded to free: %s", user.email)

    except Exception as e:
        db.rollback()
        logger.error("ERROR in handle_subscription_expired: %s", e)
