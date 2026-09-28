from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response

from app.api.deps import CurrentUser, DbSession
from app.models import Project, ProjectMessage
from app.schemas.resources import MessageCreate, MessageRead, MessageUpdate, Page
from app.services import messages
from app.services.common import owned, page

router = APIRouter(prefix="/messages", tags=["项目消息"])


@router.get("", response_model=Page[MessageRead])
def list_messages(
    db: DbSession,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    project_id: UUID | None = None,
):
    filters = []
    if project_id is not None:
        owned(db, Project, current_user.id, project_id)
        filters.append(ProjectMessage.project_id == project_id)
    return page(db, ProjectMessage, current_user.id, limit, offset, *filters)


@router.post("", response_model=MessageRead, status_code=201)
def create_message(
    data: MessageCreate, db: DbSession, current_user: CurrentUser, response: Response
):
    value = messages.create_message(db, current_user.id, data)
    response.headers["Location"] = f"/api/v1/messages/{value.id}"
    return value


@router.get("/{resource_id}", response_model=MessageRead)
def read_message(resource_id: UUID, db: DbSession, current_user: CurrentUser):
    return owned(db, ProjectMessage, current_user.id, resource_id)


@router.patch("/{resource_id}", response_model=MessageRead)
def update_message(
    resource_id: UUID, data: MessageUpdate, db: DbSession, current_user: CurrentUser
):
    return messages.update_message(db, current_user.id, resource_id, data)


@router.delete("/{resource_id}", status_code=204)
def delete_message(resource_id: UUID, db: DbSession, current_user: CurrentUser):
    db.delete(owned(db, ProjectMessage, current_user.id, resource_id))
    db.commit()
    return Response(status_code=204)
