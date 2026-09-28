from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.api.deps import CurrentUser, DbSession
from app.models import Tag
from app.schemas.resources import Page, TagCreate, TagRead, TagUpdate
from app.services import tags
from app.services.common import owned, page

router = APIRouter(prefix="/tags", tags=["标签"])


@router.get("", response_model=Page[TagRead])
def list_tags(
    db: DbSession,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    filters = []
    return page(db, Tag, current_user.id, limit, offset, *filters)


@router.post("", response_model=TagRead, status_code=201)
def create_tag(data: TagCreate, db: DbSession, current_user: CurrentUser, response: Response):
    value = tags.create_tag(db, current_user.id, data)
    response.headers["Location"] = f"/api/v1/tags/{value.id}"
    return value


@router.get("/{resource_id}", response_model=TagRead)
def read_tag(resource_id: str, db: DbSession, current_user: CurrentUser):
    return owned(db, Tag, current_user.id, resource_id)


@router.patch("/{resource_id}", response_model=TagRead)
def update_tag(resource_id: str, data: TagUpdate, db: DbSession, current_user: CurrentUser):
    return tags.update_tag(db, current_user.id, resource_id, data)


@router.delete("/{resource_id}", status_code=204)
def delete_tag(resource_id: str, db: DbSession, current_user: CurrentUser):
    tags.delete_tag(db, current_user.id, resource_id)
    return Response(status_code=204)
