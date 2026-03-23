from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate


def get_clients(user_id: str, db: Session) -> list[Client]:
    """Return all clients belonging to user_id."""
    return db.query(Client).filter(Client.user_id == user_id).all()


def get_client(client_id: str, user_id: str, db: Session) -> Client:
    """Return a single client, enforcing ownership."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    if client.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this client",
        )
    return client


def create_client(user_id: str, data: ClientCreate, db: Session) -> Client:
    """Create and persist a new client for user_id."""
    client = Client(
        user_id=user_id,
        name=data.name,
        email=data.email,
        company=data.company,
        notes=data.notes,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def update_client(
    client_id: str, user_id: str, data: ClientUpdate, db: Session
) -> Client:
    """Update only the provided fields of a client."""
    client = get_client(client_id, user_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return client


def delete_client(client_id: str, user_id: str, db: Session) -> None:
    """Delete a client after verifying ownership."""
    client = get_client(client_id, user_id, db)
    db.delete(client)
    db.commit()
