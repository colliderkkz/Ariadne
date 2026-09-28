from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import Idea, Record, Tag
from app.schemas.resources import TagCreate, TagUpdate
from app.services.common import owned, save

SYSTEM_TAGS = [
    ("learning", "学习", None),
    ("learning-ai", "AI", "learning"),
    ("learning-programming", "编程", "learning"),
    ("learning-japanese", "日语", "learning"),
    ("learning-reading", "阅读", "learning"),
    ("creation", "创作", None),
    ("creation-web-app", "Web App", "creation"),
    ("creation-writing", "写作", "creation"),
    ("creation-music", "音乐", "creation"),
    ("creation-visual", "视觉", "creation"),
    ("experience", "体验", None),
    ("experience-travel", "旅行", "experience"),
    ("experience-social", "社交", "experience"),
    ("experience-offline", "线下活动", "experience"),
    ("life", "生活", None),
    ("life-fitness", "健身", "life"),
    ("life-organization", "整理", "life"),
    ("life-daily", "日常", "life"),
]


def seed_tags(db: Session, owner_id) -> None:
    for tag_id, name, parent in SYSTEM_TAGS:
        if db.get(Tag, (owner_id, tag_id)) is None:
            db.add(Tag(owner_id=owner_id, id=tag_id, name=name, parent_id=parent, type="system"))
            db.flush()  # 先保存父标签，再保存带外键的子标签。


def validate_tag_ids(db: Session, owner_id, tag_ids: list[str]) -> None:
    if len(set(tag_ids)) != len(tag_ids):
        raise HTTPException(422, "标签不能重复")
    for tag_id in tag_ids:
        owned(db, Tag, owner_id, tag_id)


def validate_parent(db, owner_id, parent_id, tag_id=None):
    if parent_id:
        parent = owned(db, Tag, owner_id, parent_id, lock=True)
        if parent.id == tag_id or parent.parent_id is not None:
            raise HTTPException(422, "标签仅支持两级，不能循环引用")
        if tag_id and db.scalar(
            select(Tag).where(Tag.owner_id == owner_id, Tag.parent_id == tag_id)
        ):
            raise HTTPException(409, "请先移动或删除子标签")


def create_tag(db, owner_id, data: TagCreate):
    validate_parent(db, owner_id, data.parent_id)
    return save(db, Tag(owner_id=owner_id, id=str(uuid4()), type="custom", **data.model_dump()))


def update_tag(db, owner_id, tag_id, data: TagUpdate):
    tag = owned(db, Tag, owner_id, tag_id, lock=True)
    if tag.type == "system":
        raise HTTPException(403, "系统标签不能修改")
    values = data.model_dump(exclude_unset=True)
    if "parent_id" in values:
        validate_parent(db, owner_id, values["parent_id"], tag_id)
    for key, value in values.items():
        setattr(tag, key, value)
    return save(db, tag)


def delete_tag(db, owner_id, tag_id):
    tag = owned(db, Tag, owner_id, tag_id, lock=True)
    if tag.type == "system":
        raise HTTPException(403, "系统标签不能删除")
    if db.scalar(select(Tag).where(Tag.owner_id == owner_id, Tag.parent_id == tag_id)):
        raise HTTPException(409, "请先移动或删除子标签")
    # 删除标签与解除引用在同一个事务里完成，前端不再逐项保存整个数组。
    for idea in db.scalars(select(Idea).where(Idea.owner_id == owner_id).with_for_update()):
        if tag_id in idea.tag_ids:
            idea.tag_ids = [value for value in idea.tag_ids if value != tag_id]
    db.execute(
        update(Record)
        .where(Record.owner_id == owner_id, Record.tag_id == tag_id)
        .values(tag_id=None)
    )
    db.flush()
    db.delete(tag)
    db.commit()
