from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbSession
from app.models.idea import Idea, IdeaStatus
from app.schemas.idea import IdeaCreate, IdeaPage, IdeaRead, IdeaUpdate
from app.services import ideas

router = APIRouter(prefix="/ideas", tags=["想法"])


@router.post("", response_model=IdeaRead, status_code=status.HTTP_201_CREATED)
def create_idea(
    data: IdeaCreate, response: Response, db: DbSession, current_user: CurrentUser
) -> Idea:
    idea = ideas.create_idea(db, current_user.id, data)
    response.headers["Location"] = f"/api/v1/ideas/{idea.id}"
    return idea


@router.get("", response_model=IdeaPage)
def list_ideas(
    db: DbSession,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    status: IdeaStatus | None = None,
) -> IdeaPage:
    items, total = ideas.list_ideas(db, current_user.id, limit, offset, status)
    return IdeaPage(
        items=[IdeaRead.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{idea_id}", response_model=IdeaRead)
def read_idea(idea_id: UUID, db: DbSession, current_user: CurrentUser) -> Idea:
    return ideas.get_idea(db, current_user.id, idea_id)


@router.patch("/{idea_id}", response_model=IdeaRead)
def update_idea(idea_id: UUID, data: IdeaUpdate, db: DbSession, current_user: CurrentUser) -> Idea:
    return ideas.update_idea(db, current_user.id, idea_id, data)


@router.delete("/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_idea(idea_id: UUID, db: DbSession, current_user: CurrentUser) -> Response:
    ideas.delete_idea(db, current_user.id, idea_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
