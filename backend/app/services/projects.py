from fastapi import HTTPException
from sqlalchemy import select

from app.models import Idea, IdeaStatus, Project
from app.services.common import owned, save


def check_link(db, owner_id, idea_id, project_id=None):
    if idea_id is None:
        return None
    idea = owned(db, Idea, owner_id, idea_id, lock=True)
    existing = db.scalar(select(Project).where(Project.linked_idea_id == idea_id))
    if existing and existing.id != project_id:
        raise HTTPException(409, "此想法已有项目")
    return idea


def create_project(db, owner_id, data):
    idea = check_link(db, owner_id, data.linked_idea_id)
    if idea:
        idea.status = IdeaStatus.CONVERTED_TO_PROJECT
    return save(db, Project(owner_id=owner_id, **data.model_dump()))


def update_project(db, owner_id, project_id, data):
    project = owned(db, Project, owner_id, project_id)
    values = data.model_dump(exclude_unset=True)
    if "linked_idea_id" in values:
        idea = check_link(db, owner_id, values["linked_idea_id"], project_id)
        if project.linked_idea_id and project.linked_idea_id != values["linked_idea_id"]:
            previous = owned(db, Idea, owner_id, project.linked_idea_id)
            if previous.status == IdeaStatus.CONVERTED_TO_PROJECT:
                previous.status = IdeaStatus.INBOX
        if idea:
            idea.status = IdeaStatus.CONVERTED_TO_PROJECT
    for key, value in values.items():
        setattr(project, key, value)
    return save(db, project)


def delete_project(db, owner_id, project_id):
    project = owned(db, Project, owner_id, project_id, lock=True)
    if project.linked_idea_id:
        idea = owned(db, Idea, owner_id, project.linked_idea_id)
        if idea.status == IdeaStatus.CONVERTED_TO_PROJECT:
            idea.status = IdeaStatus.INBOX
    db.delete(project)
    db.commit()  # 消息级联删除；记录保留、project_id 由外键置空。
