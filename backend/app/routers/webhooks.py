import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import subscription_service

router = APIRouter()

_HANDLERS = {
    "subscription_created": subscription_service.handle_subscription_created,
    "subscription_cancelled": subscription_service.handle_subscription_cancelled,
    "subscription_expired": subscription_service.handle_subscription_expired,
}


@router.post("/lemon-squeezy", status_code=status.HTTP_200_OK)
async def lemon_squeezy_webhook(
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Receive and process Lemon Squeezy webhook events.

    Reads body as raw bytes to preserve the exact byte sequence
    required for HMAC-SHA256 signature verification.
    Always returns 200 for valid signatures so LS does not retry.
    """
    payload = await request.body()
    signature = request.headers.get("X-Signature", "")

    if not subscription_service.verify_webhook_signature(payload, signature):
        print("[webhooks] invalid signature — rejected")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        print("[webhooks] invalid JSON payload")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )

    event_name = data.get("meta", {}).get("event_name", "unknown")
    print(f"[webhooks] received event: {event_name}")

    handler = _HANDLERS.get(event_name)
    if handler:
        handler(data, db)
    else:
        print(f"[webhooks] unhandled event: {event_name} — ignoring")

    return {"received": True}
