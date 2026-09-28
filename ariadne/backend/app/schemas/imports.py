from typing import Annotated, Literal

from pydantic import AwareDatetime, Field, StringConstraints

from app.models.project import ProjectStatus
from app.schemas.idea import IdeaCreate
from app.schemas.resources import Input, Name, RecordCreate, Title

LegacyId = Annotated[str, StringConstraints(min_length=1, max_length=200)]


class LegacyIdea(IdeaCreate):
    id: LegacyId
    created_at: AwareDatetime
    updated_at: AwareDatetime


class LegacyTag(Input):
    id: Name
    name: Name
    parent_id: Name | None = None
    type: Literal["system", "custom"]
    created_at: AwareDatetime
    updated_at: AwareDatetime


class LegacyProject(Input):
    id: LegacyId
    title: Title
    description: str = Field(default="", max_length=20000)
    inner_thoughts: str = Field(default="", max_length=20000)
    status: ProjectStatus = ProjectStatus.ACTIVE
    linked_idea_id: LegacyId | None = None
    created_at: AwareDatetime
    updated_at: AwareDatetime


class LegacyRecord(RecordCreate):
    id: LegacyId
    project_id: LegacyId | None = None


class LegacyMessage(Input):
    id: LegacyId
    project_id: LegacyId
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=20000)
    created_at: AwareDatetime


class LegacyImport(Input):
    ideas: list[LegacyIdea] = Field(default_factory=list, max_length=5000)
    tags: list[LegacyTag] = Field(default_factory=list, max_length=5000)
    projects: list[LegacyProject] = Field(default_factory=list, max_length=5000)
    records: list[LegacyRecord] = Field(default_factory=list, max_length=10000)
    messages: list[LegacyMessage] = Field(default_factory=list, max_length=10000)
