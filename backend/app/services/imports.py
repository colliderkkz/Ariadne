from uuid import uuid5

from fastapi import HTTPException

from app.models import Idea, Project, ProjectMessage, Record, Tag, User
from app.services.common import owned
from app.services.tags import validate_parent, validate_tag_ids


def import_legacy(db, owner_id, data):
    # 同一账号串行导入；确定性 ID 使“响应丢失后重试”不会创建重复数据。
    from sqlalchemy import select

    db.scalar(select(User).where(User.id == owner_id).with_for_update())
    counts = {key: 0 for key in ("tags", "ideas", "projects", "records", "messages")}
    for key in counts:
        ids = [item.id for item in getattr(data, key)]
        if len(set(ids)) != len(ids):
            raise HTTPException(422, f"{key} 包含重复 ID，导入已取消")

    def mapped(kind, value):
        return uuid5(owner_id, f"legacy-{kind}:{value}") if value else None

    for tag in sorted(data.tags, key=lambda item: item.parent_id is not None):
        if db.get(Tag, (owner_id, tag.id)) is not None:
            continue
        validate_parent(db, owner_id, tag.parent_id)
        # 只有后端种子可以定义系统标签，导入的其它标签一律是用户自定义标签。
        values = tag.model_dump()
        values["type"] = "custom"
        db.add(Tag(owner_id=owner_id, **values))
        db.flush()
        counts["tags"] += 1

    for idea in data.ideas:
        target_id = mapped("idea", idea.id)
        if db.get(Idea, target_id):
            continue
        validate_tag_ids(db, owner_id, idea.tag_ids)
        db.add(Idea(owner_id=owner_id, **{**idea.model_dump(), "id": target_id}))
        counts["ideas"] += 1
    db.flush()

    for project in data.projects:
        target_id = mapped("project", project.id)
        if db.get(Project, target_id):
            continue
        linked = mapped("idea", project.linked_idea_id)
        if linked:
            owned(db, Idea, owner_id, linked)
            if db.scalar(select(Project).where(Project.linked_idea_id == linked)):
                raise HTTPException(409, "多个旧项目关联了同一想法，请先整理旧数据")
        db.add(
            Project(
                owner_id=owner_id,
                **{**project.model_dump(), "id": target_id, "linked_idea_id": linked},
            )
        )
        db.flush()
        counts["projects"] += 1

    for record in data.records:
        target_id = mapped("record", record.id)
        if db.get(Record, target_id):
            continue
        project_id = mapped("project", record.project_id)
        if project_id:
            owned(db, Project, owner_id, project_id)
        if record.tag_id:
            owned(db, Tag, owner_id, record.tag_id)
        db.add(
            Record(
                owner_id=owner_id,
                **{**record.model_dump(), "id": target_id, "project_id": project_id},
            )
        )
        counts["records"] += 1
    for message in data.messages:
        target_id = mapped("message", message.id)
        if db.get(ProjectMessage, target_id):
            continue
        project_id = mapped("project", message.project_id)
        owned(db, Project, owner_id, project_id)
        db.add(
            ProjectMessage(
                owner_id=owner_id,
                **{**message.model_dump(), "id": target_id, "project_id": project_id},
            )
        )
        counts["messages"] += 1
    db.commit()
    return {"imported": counts}
