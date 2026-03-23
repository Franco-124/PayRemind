from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.services.auth_service import get_current_user
from app.services import client_service

router = APIRouter()


@router.get("/", response_model=list[ClientResponse])
def list_clients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ClientResponse]:
    return client_service.get_clients(current_user.id, db)


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    data: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClientResponse:
    return client_service.create_client(current_user.id, data, db)


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClientResponse:
    return client_service.get_client(client_id, current_user.id, db)


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: str,
    data: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClientResponse:
    return client_service.update_client(client_id, current_user.id, data, db)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    client_service.delete_client(client_id, current_user.id, db)
