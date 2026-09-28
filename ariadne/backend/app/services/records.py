from fastapi import HTTPException

from app.models import Project, Record, Tag
from app.services.common import owned, save


def check_links(db, owner_id, values):
    if values.get("project_id"):
        owned(db, Project, owner_id, values["project_id"])
    if values.get("tag_id"):
        owned(db, Tag, owner_id, values["tag_id"])


def create_record(db, owner_id, data):
    values = data.model_dump()
    check_links(db, owner_id, values)
    return save(db, Record(owner_id=owner_id, **values))


def update_record(db, owner_id, record_id, data):
    record = owned(db, Record, owner_id, record_id)
    values = data.model_dump(exclude_unset=True)
    check_links(db, owner_id, values)
    started = values.get("started_at", record.started_at)
    completed = values.get("completed_at", record.completed_at)
    if started and started > completed:
        raise HTTPException(422, "开始时间不能晚于完成时间")
    for key, value in values.items():
        setattr(record, key, value)
    return save(db, record)
