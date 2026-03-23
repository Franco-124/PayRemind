import hashlib
import hmac

from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """Verify Lemon Squeezy webhook signature using HMAC-SHA256.

    Must be called with the RAW request body bytes — parsing JSON first
    alters the byte sequence and breaks the signature check.
    """
    if not settings.lemon_squeezy_webhook_secret:
        print("[subscription_service] WARNING: webhook secret not configured")
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

        print(
            f"[subscription_service] subscription_created "
            f"| email={customer_email} | id={subscription_id}"
        )

        if not customer_email:
            print("[subscription_service] no email found in payload — skipping")
            return

        user = db.query(User).filter(User.email == customer_email).first()
        if not user:
            print(f"[subscription_service] user not found: {customer_email}")
            return

        user.plan = "pro"
        user.lemon_squeezy_id = subscription_id
        db.commit()
        print(f"[subscription_service] upgraded to pro: {customer_email}")

    except Exception as e:
        db.rollback()
        print(f"[subscription_service] ERROR in handle_subscription_created: {e}")


def handle_subscription_cancelled(data: dict, db: Session) -> None:
    """Downgrade user to 'free' when a subscription is cancelled."""
    try:
        subscription_id = str(data.get("data", {}).get("id", ""))
        print(
            f"[subscription_service] subscription_cancelled | id={subscription_id}"
        )

        user = (
            db.query(User).filter(User.lemon_squeezy_id == subscription_id).first()
        )
        if not user:
            print(
                f"[subscription_service] no user found for "
                f"lemon_squeezy_id={subscription_id}"
            )
            return

        user.plan = "free"
        db.commit()
        print(f"[subscription_service] downgraded to free: {user.email}")

    except Exception as e:
        db.rollback()
        print(f"[subscription_service] ERROR in handle_subscription_cancelled: {e}")


def handle_subscription_expired(data: dict, db: Session) -> None:
    """Downgrade user to 'free' when a subscription expires."""
    try:
        subscription_id = str(data.get("data", {}).get("id", ""))
        print(
            f"[subscription_service] subscription_expired | id={subscription_id}"
        )

        user = (
            db.query(User).filter(User.lemon_squeezy_id == subscription_id).first()
        )
        if not user:
            print(
                f"[subscription_service] no user found for "
                f"lemon_squeezy_id={subscription_id}"
            )
            return

        user.plan = "free"
        db.commit()
        print(f"[subscription_service] downgraded to free: {user.email}")

    except Exception as e:
        db.rollback()
        print(f"[subscription_service] ERROR in handle_subscription_expired: {e}")
