from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response

from app.api.deps import CurrentUser, DbSession
from app.models import Record
from app.schemas.resources import Page, RecordCreate, RecordRead, RecordUpdate
from app.services import records
from app.services.common import owned, page

router = APIRouter(prefix="/records", tags=["记录"])


@router.get("", response_model=Page[RecordRead])
def list_records(
    db: DbSession,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    filters = []
    return page(db, Record, current_user.id, limit, offset, *filters)


@router.post("", response_model=RecordRead, status_code=201)
def create_record(data: RecordCreate, db: DbSession, current_user: CurrentUser, response: Response):
    value = records.create_record(db, current_user.id, data)
    response.headers["Location"] = f"/api/v1/records/{value.id}"
    return value


@router.get("/{resource_id}", response_model=RecordRead)
def read_record(resource_id: UUID, db: DbSession, current_user: CurrentUser):
    return owned(db, Record, current_user.id, resource_id)


@router.patch("/{resource_id}", response_model=RecordRead)
def update_record(resource_id: UUID, data: RecordUpdate, db: DbSession, current_user: CurrentUser):
    return records.update_record(db, current_user.id, resource_id, data)


@router.delete("/{resource_id}", status_code=204)
def delete_record(resource_id: UUID, db: DbSession, current_user: CurrentUser):
    db.delete(owned(db, Record, current_user.id, resource_id))
    db.commit()
    return Response(status_code=204)
