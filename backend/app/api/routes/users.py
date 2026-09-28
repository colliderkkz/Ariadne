from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["用户"])


@router.get("/me", response_model=UserRead)
def read_me(current_user: CurrentUser) -> User:
    return current_user


@router.patch("/me", response_model=UserRead)
def update_me(data: UserUpdate, current_user: CurrentUser, db: DbSession) -> User:
    for field, value in data.model_dump().items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user
