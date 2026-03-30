import hashlib
import hmac
import json
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

    if not signature:
        logger.warning("no signature provided")
        return False

    try:
        expected = hmac.new(
            key=settings.lemon_squeezy_webhook_secret.encode("utf-8"),
            msg=payload,
            digestmod=hashlib.sha256,
        ).hexdigest()

        result = hmac.compare_digest(expected, signature)

        if not result:
            logger.warning(
                "signature mismatch | expected_prefix=%s | received_prefix=%s",
                expected[:8],
                signature[:8],
            )

        return result

    except Exception as e:
        logger.error("ERROR verifying webhook signature: %s", e)
        return False


def handle_subscription_created(data: dict, db: Session) -> None:
    """Upgrade user to 'pro' when a subscription is created."""
    try:
        logger.info("FULL PAYLOAD subscription_created: %s", json.dumps(data, indent=2))

        attributes = data.get("data", {}).get("attributes", {})
        customer_email = (
            attributes.get("user_email")
            or attributes.get("customer_email")
            or attributes.get("email")
            or data.get("meta", {}).get("custom_data", {}).get("email")
        )
        subscription_id = str(data.get("data", {}).get("id", ""))

        logger.info(
            "subscription_created | email=%s | id=%s | available_keys=%s",
            customer_email,
            subscription_id,
            list(attributes.keys()),
        )

        if not customer_email:
            logger.error(
                "NO EMAIL FOUND in payload. Full attributes: %s", attributes
            )
            return

        user = db.query(User).filter(User.email == customer_email).first()
        if not user:
            logger.error("USER NOT FOUND for email: %s", customer_email)
            return

        user.plan = "pro"
        user.lemon_squeezy_id = subscription_id
        db.commit()
        logger.info("SUCCESS: upgraded to pro: %s", customer_email)

    except Exception as e:
        db.rollback()
        logger.error("ERROR in handle_subscription_created: %s", e, exc_info=True)


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
