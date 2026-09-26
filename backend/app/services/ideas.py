from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import IdeaNotFoundError
from app.models.idea import Idea, IdeaStatus
from app.schemas.idea import IdeaCreate, IdeaUpdate


def get_idea(db: Session, owner_id: UUID, idea_id: UUID) -> Idea:
    # 权限检查直接写入查询条件，读取、修改、删除共用这一入口。
    idea = db.scalar(select(Idea).where(Idea.id == idea_id, Idea.owner_id == owner_id))
    if idea is None:
        raise IdeaNotFoundError
    return idea


def list_ideas(
    db: Session, owner_id: UUID, limit: int, offset: int, status: IdeaStatus | None
) -> tuple[list[Idea], int]:
    conditions = [Idea.owner_id == owner_id]
    if status is not None:
        conditions.append(Idea.status == status)
    total = db.scalar(select(func.count()).select_from(Idea).where(*conditions)) or 0
    items = db.scalars(
        select(Idea)
        .where(*conditions)
        .order_by(Idea.created_at.desc(), Idea.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return list(items), total


def create_idea(db: Session, owner_id: UUID, data: IdeaCreate) -> Idea:
    # owner_id 来自已验证的登录身份，绝不接受客户端自己指定归属用户。
    idea = Idea(owner_id=owner_id, **data.model_dump())
    db.add(idea)
    db.commit()
    db.refresh(idea)
    return idea


def update_idea(db: Session, owner_id: UUID, idea_id: UUID, data: IdeaUpdate) -> Idea:
    idea = get_idea(db, owner_id, idea_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(idea, field, value)
    db.commit()
    db.refresh(idea)
    return idea


def delete_idea(db: Session, owner_id: UUID, idea_id: UUID) -> None:
    idea = get_idea(db, owner_id, idea_id)
    db.delete(idea)
    db.commit()
