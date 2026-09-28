from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response

from app.api.deps import CurrentUser, DbSession
from app.models import Project
from app.schemas.resources import Page, ProjectCreate, ProjectRead, ProjectUpdate
from app.services import projects
from app.services.common import owned, page

router = APIRouter(prefix="/projects", tags=["项目"])


@router.get("", response_model=Page[ProjectRead])
def list_projects(
    db: DbSession,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    filters = []
    return page(db, Project, current_user.id, limit, offset, *filters)


@router.post("", response_model=ProjectRead, status_code=201)
def create_project(
    data: ProjectCreate, db: DbSession, current_user: CurrentUser, response: Response
):
    value = projects.create_project(db, current_user.id, data)
    response.headers["Location"] = f"/api/v1/projects/{value.id}"
    return value


@router.get("/{resource_id}", response_model=ProjectRead)
def read_project(resource_id: UUID, db: DbSession, current_user: CurrentUser):
    return owned(db, Project, current_user.id, resource_id)


@router.patch("/{resource_id}", response_model=ProjectRead)
def update_project(
    resource_id: UUID, data: ProjectUpdate, db: DbSession, current_user: CurrentUser
):
    return projects.update_project(db, current_user.id, resource_id, data)


@router.delete("/{resource_id}", status_code=204)
def delete_project(resource_id: UUID, db: DbSession, current_user: CurrentUser):
    projects.delete_project(db, current_user.id, resource_id)
    return Response(status_code=204)
