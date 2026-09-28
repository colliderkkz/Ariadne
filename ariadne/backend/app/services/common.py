from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session


def owned(db: Session, model, owner_id: UUID, resource_id, *, lock=False):
    statement = select(model).where(model.owner_id == owner_id, model.id == resource_id)
    if lock:
        statement = statement.with_for_update()
    value = db.scalar(statement)
    if value is None:
        raise HTTPException(404, "资源不存在")
    return value


def page(db: Session, model, owner_id: UUID, limit: int, offset: int, *filters):
    conditions = (model.owner_id == owner_id, *filters)
    total = db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0
    items = db.scalars(
        select(model)
        .where(*conditions)
        .order_by(model.created_at.desc(), model.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def save(db: Session, value):
    db.add(value)
    db.commit()
    db.refresh(value)
    return value
